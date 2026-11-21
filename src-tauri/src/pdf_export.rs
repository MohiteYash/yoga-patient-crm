use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};
use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PdfKind {
    Intake,
    Report,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfOutputDirectory {
    path: PathBuf,
    is_default: bool,
}

fn export_folder(root: &Path, kind: PdfKind) -> PathBuf {
    let folder = match kind {
        PdfKind::Intake => "Patient Intake",
        PdfKind::Report => "Patient Reports",
    };
    root.join(folder)
}

fn preference_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join("pdf-output-directory"))
        .map_err(|error| error.to_string())
}

fn default_directory(app: &AppHandle) -> Result<PdfOutputDirectory, String> {
    app.path()
        .document_dir()
        .map(|path| PdfOutputDirectory {
            path: path.join("YogaCare CRM"),
            is_default: true,
        })
        .map_err(|error| error.to_string())
}

fn read_preference(preference: &Path) -> io::Result<Option<PathBuf>> {
    match fs::read_to_string(preference) {
        Ok(path) if Path::new(&path).is_absolute() => Ok(Some(PathBuf::from(path))),
        Ok(_) => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "The saved PDF folder path is invalid",
        )),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn temporary_path(path: &Path) -> PathBuf {
    static NEXT_WRITE: AtomicU64 = AtomicU64::new(0);
    let sequence = NEXT_WRITE.fetch_add(1, Ordering::Relaxed);
    path.with_extension(format!("{}.{}.tmp", std::process::id(), sequence))
}

fn verify_writable(directory: &Path) -> io::Result<()> {
    let probe = temporary_path(&directory.join(".yogacare-folder-check"));
    let file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe)?;
    drop(file);
    fs::remove_file(probe)
}

fn save_preference(preference: &Path, directory: &str) -> io::Result<()> {
    let temporary = temporary_path(preference);
    fs::create_dir_all(
        preference
            .parent()
            .expect("preference has a parent directory"),
    )?;
    if let Err(error) =
        fs::write(&temporary, directory).and_then(|()| fs::rename(&temporary, preference))
    {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    Ok(())
}

fn reset_preference(preference: &Path) -> io::Result<()> {
    match fs::remove_file(preference) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        result => result,
    }
}

#[tauri::command]
pub fn get_pdf_output_directory(app: AppHandle) -> Result<PdfOutputDirectory, String> {
    match read_preference(&preference_path(&app)?).map_err(|error| error.to_string())? {
        Some(path) => Ok(PdfOutputDirectory {
            path,
            is_default: false,
        }),
        None => default_directory(&app),
    }
}

#[tauri::command]
pub async fn choose_pdf_output_directory(
    app: AppHandle,
    window: WebviewWindow,
) -> Result<Option<PdfOutputDirectory>, String> {
    let mut dialog = app
        .dialog()
        .file()
        .set_parent(&window)
        .set_title("Choose PDF output folder");
    if let Ok(current) = get_pdf_output_directory(app.clone()) {
        if let Some(start) = current.path.ancestors().find(|path| path.is_dir()) {
            dialog = dialog.set_directory(start.to_path_buf());
        }
    }
    let Some(selection) = dialog.blocking_pick_folder() else {
        return Ok(None);
    };
    let path = selection.into_path().map_err(|error| error.to_string())?;
    if !path.is_absolute() || !path.is_dir() {
        return Err("Choose a folder that is available on this computer.".into());
    }
    let directory = path.to_str().ok_or("The folder path could not be read.")?;
    verify_writable(&path)
        .map_err(|error| format!("The selected folder is not writable. {error}"))?;
    save_preference(&preference_path(&app)?, directory).map_err(|error| error.to_string())?;
    Ok(Some(PdfOutputDirectory {
        path,
        is_default: false,
    }))
}

#[tauri::command]
pub fn reset_pdf_output_directory(app: AppHandle) -> Result<PdfOutputDirectory, String> {
    let default = default_directory(&app)?;
    reset_preference(&preference_path(&app)?).map_err(|error| error.to_string())?;
    Ok(default)
}

#[tauri::command]
pub async fn save_patient_pdf(
    app: AppHandle,
    kind: PdfKind,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let output = get_pdf_output_directory(app)?;
    if output.is_default {
        fs::create_dir_all(&output.path).map_err(|error| error.to_string())?;
    } else if !output.path.is_dir() {
        return Err("The selected PDF output folder is unavailable.".into());
    }
    let directory = export_folder(&output.path, kind);
    write_pdf(&directory, &filename, &bytes)
        .map(|path| path.to_string_lossy().into_owned())
        .map_err(|error| error.to_string())
}

fn write_pdf(directory: &Path, filename: &str, bytes: &[u8]) -> io::Result<PathBuf> {
    let stem = filename.strip_suffix(".pdf").filter(|stem| {
        !stem.is_empty()
            && stem.len() <= 220
            && !stem
                .chars()
                .any(|ch| ch.is_control() || "<>:\"/\\|?*.".contains(ch))
    });
    let Some(stem) = stem else {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Invalid PDF file name",
        ));
    };
    if !bytes.starts_with(b"%PDF-") {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Invalid PDF data",
        ));
    }

    if let Err(error) = fs::create_dir(directory) {
        if error.kind() != io::ErrorKind::AlreadyExists || !directory.is_dir() {
            return Err(error);
        }
    }
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    for copy in 1_u32..=u32::MAX {
        let path = if copy == 1 {
            directory.join(filename)
        } else {
            directory.join(format!("{stem} ({copy}).pdf"))
        };
        let mut file = match options.open(&path) {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        };
        let result = file.write_all(bytes).and_then(|()| file.sync_all());
        drop(file);
        if let Err(error) = result {
            let _ = fs::remove_file(&path);
            return Err(error);
        }
        return Ok(path);
    }
    Err(io::Error::new(
        io::ErrorKind::AlreadyExists,
        "No unused PDF file name",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn saves_each_pdf_kind_under_the_same_parent_without_overwriting() -> io::Result<()> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let documents = std::env::temp_dir().join(format!(
            "yogacare-pdf-test-{}-{timestamp}",
            std::process::id()
        ));
        let root = documents.join("YogaCare CRM");
        fs::create_dir_all(&root)?;
        let intake = export_folder(&root, PdfKind::Intake);
        let reports = export_folder(&root, PdfKind::Report);
        assert_eq!(intake.parent(), reports.parent());
        assert!(intake.ends_with("Patient Intake"));
        assert!(reports.ends_with("Patient Reports"));

        let original = write_pdf(&intake, "YC-1234-Test-intake.pdf", b"%PDF-original")?;
        let copy = write_pdf(&intake, "YC-1234-Test-intake.pdf", b"%PDF-copy")?;
        let report = write_pdf(&reports, "YC-1234-Test-report.pdf", b"%PDF-report")?;
        assert_eq!(original.parent(), Some(intake.as_path()));
        assert_eq!(report.parent(), Some(reports.as_path()));
        assert!(copy.ends_with("YC-1234-Test-intake (2).pdf"));
        assert_eq!(fs::read(&original)?, b"%PDF-original");
        assert_eq!(fs::read(&copy)?, b"%PDF-copy");
        assert_eq!(fs::read(&report)?, b"%PDF-report");

        for path in [original, copy, report] {
            fs::remove_file(path)?;
        }
        for path in [intake, reports, root, documents] {
            fs::remove_dir(path)?;
        }
        Ok(())
    }

    #[test]
    fn rejects_invalid_names_and_non_pdf_data() {
        for filename in [
            "../patient.pdf",
            "C:\\patient.pdf",
            "../report.txt",
            "sample/record.pdf",
        ] {
            let error = write_pdf(Path::new("unused"), filename, b"%PDF-test").unwrap_err();
            assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
        }
        let error = write_pdf(Path::new("unused"), "patient.pdf", b"not a PDF").unwrap_err();
        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    }

    #[test]
    fn remembers_custom_folders_and_returns_to_default_after_reset() -> io::Result<()> {
        let directory = temporary_path(&std::env::temp_dir().join("yogacare-pdf-preference-test"));
        let preference = directory.join("pdf-output-directory");
        let selected = directory.join("Clinic PDFs Málaga");
        fs::create_dir_all(&selected)?;
        assert_eq!(read_preference(&preference)?, None);

        verify_writable(&selected)?;
        assert_eq!(fs::read_dir(&selected)?.count(), 0);
        save_preference(&preference, selected.to_str().unwrap())?;
        let output = read_preference(&preference)?.unwrap();
        let intake = export_folder(&output, PdfKind::Intake);
        let report = export_folder(&output, PdfKind::Report);
        assert_eq!(intake.parent(), Some(selected.as_path()));
        assert_eq!(report.parent(), Some(selected.as_path()));

        save_preference(&preference, directory.to_str().unwrap())?;
        assert_eq!(read_preference(&preference)?, Some(directory.clone()));
        reset_preference(&preference)?;
        assert_eq!(read_preference(&preference)?, None);
        reset_preference(&preference)?;
        fs::remove_dir(selected)?;
        fs::remove_dir(directory)
    }
}

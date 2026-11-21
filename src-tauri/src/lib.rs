mod pdf_export;

use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

fn backup_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("backups"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_backup_folder(app: AppHandle) -> Result<String, String> {
    Ok(backup_directory(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
async fn open_backup_folder(app: AppHandle) -> Result<(), String> {
    let directory = backup_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    app.opener()
        .open_path(directory.to_string_lossy(), None::<&str>)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn save_clinic_backup(app: AppHandle, contents: String) -> Result<String, String> {
    static NEXT_BACKUP: AtomicU64 = AtomicU64::new(0);

    let directory = backup_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let sequence = NEXT_BACKUP.fetch_add(1, Ordering::Relaxed);
    let name = format!(
        "yogacare-backup-{timestamp}-{}-{sequence}",
        std::process::id()
    );
    let temporary = directory.join(format!(".{name}.tmp"));
    let destination = directory.join(format!("{name}.json"));

    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(&temporary)
        .map_err(|error| error.to_string())?;
    let result = file
        .write_all(contents.as_bytes())
        .and_then(|()| file.sync_all());
    drop(file);
    if let Err(error) = result.and_then(|()| fs::rename(&temporary, &destination)) {
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }

    Ok(destination.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_backup_folder,
            open_backup_folder,
            save_clinic_backup,
            pdf_export::save_patient_pdf,
            pdf_export::get_pdf_output_directory,
            pdf_export::choose_pdf_output_directory,
            pdf_export::reset_pdf_output_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running YogaCare");
}

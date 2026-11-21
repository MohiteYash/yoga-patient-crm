import {useEffect, useState} from 'react';
import {invoke, isTauri} from '@tauri-apps/api/core';
import {FolderOpen} from 'lucide-react';

type OutputDirectory = {path: string; isDefault: boolean};

export function PdfOutputSettings() {
  const desktop = isTauri();
  const [directory, setDirectory] = useState<OutputDirectory>();
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!desktop) return;
    let mounted = true;
    invoke<OutputDirectory>('get_pdf_output_directory').then(result => {
      if (mounted) setDirectory(result);
    }).catch(() => {
      if (mounted) setError('Could not read the current PDF folder. Choose a folder or restore the default.');
    }).finally(() => {
      if (mounted) setBusy(false);
    });
    return () => {mounted = false};
  }, [desktop]);

  async function updateFolder(action: 'choose' | 'reset') {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await invoke<OutputDirectory | null>(`${action}_pdf_output_directory`);
      if (result) {
        setDirectory(result);
        setMessage(action === 'choose' ? 'PDF output folder saved.' : 'Default PDF folder restored.');
      }
    } catch (reason) {
      const detail = typeof reason === 'string' ? reason : 'Check the folder permissions and try again.';
      setError(`Could not update the PDF output folder. ${detail}`);
    } finally {
      setBusy(false);
    }
  }

  return <div className="card">
    <div className="cardHead">
      <div><h3>PDF output folder</h3><p>Intake PDFs and reports are saved in separate subfolders here.</p></div>
    </div>
    {desktop ? <>
      {directory && <p className="settingsHint backupPath">
        {directory.isDefault ? 'Default folder' : 'Selected folder'}<br/><code>{directory.path}</code>
      </p>}
      <div className="settingsActions">
        <button className="primary" disabled={busy} onClick={() => void updateFolder('choose')}><FolderOpen size={16}/> Choose folder</button>
        <button className="secondary" disabled={busy || directory?.isDefault === true} onClick={() => void updateFolder('reset')}>Restore default</button>
      </div>
      {message && <p className="settingsMessage" role="status">{message}</p>}
      {error && <p className="validationMessage" role="alert">{error}</p>}
    </> : <p className="settingsHint">Open the desktop app to choose a PDF output folder.</p>}
  </div>;
}

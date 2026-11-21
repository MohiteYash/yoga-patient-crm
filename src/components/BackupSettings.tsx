import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {invoke, isTauri} from '@tauri-apps/api/core';
import {Download, FolderOpen} from 'lucide-react';
import {ClinicBackup, parseBackup, restoreBackup, saveBackup} from '../lib/backup';
import {Confirm, useEscape} from './ui';

export function BackupSettings({records, onRestore}: {records: Required<ClinicBackup>; onRestore: (backup: ClinicBackup, keys: string[]) => void}) {
  const desktop = isTauri();
  const [folder, setFolder] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ClinicBackup | null>(null);
  const latestRecords = useRef<Required<ClinicBackup> | null>(records);
  useEscape(() => setPending(null));

  useLayoutEffect(() => {
    latestRecords.current = records;
    return () => {latestRecords.current = null};
  }, [records]);

  useEffect(() => {
    if (!desktop) return;
    let mounted = true;
    invoke<string>('get_backup_folder').then(path => {
      if (mounted) setFolder(path);
    }).catch(() => {
      if (mounted) setMessage('The backup folder could not be located.');
    });
    return () => {mounted = false};
  }, [desktop]);

  async function createBackup() {
    setBusy(true);
    setMessage('');
    try {
      const path = await saveBackup(records);
      setMessage(path ? `Backup saved to ${path}` : 'Backup download started.');
    } catch {
      setMessage('The backup could not be saved. Check the backup folder and available disk space, then try again.');
    } finally {
      setBusy(false);
    }
  }

  async function selectBackup(file: File) {
    setBusy(true);
    setMessage('');
    try {
      setPending(parseBackup(await file.text()));
    } catch {
      setMessage('This file is not a valid YogaCare backup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmRestore(backup: ClinicBackup) {
    setPending(null);
    setBusy(true);
    try {
      await saveBackup(records);
    } catch {
      setMessage('Restore stopped because a backup of the current records could not be saved.');
      setBusy(false);
      return;
    }
    try {
      const current = latestRecords.current;
      if (!current) return;
      if (current.patients !== records.patients || current.appointments !== records.appointments || current.expenses !== records.expenses) {
        setMessage('Records changed while the backup was saving. Select the restore file again to continue.');
        return;
      }
      onRestore(backup, restoreBackup(backup));
      setMessage(`Restored ${backup.patients.length} patient records. A backup of the previous records was ${desktop ? 'saved' : 'downloaded'} first.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be restored.');
    } finally {
      setBusy(false);
    }
  }

  const replacement = pending && [
    `${pending.patients.length} patient records`,
    pending.appointments && `${pending.appointments.length} appointments`,
    pending.expenses && `${pending.expenses.length} expenses`,
  ].filter(Boolean).join(', ');

  return <div className="card backupCard">
    <div className="cardHead">
      <div><h3>Patient data and backups</h3><p>Back up patient records, X-rays, visits, payments, appointments and expenses.</p></div>
      <Download size={19}/>
    </div>
    <p className="settingsHint">Live records are stored on this device in YogaCare’s local app storage, under the user account running the app.</p>
    {folder && <p className="settingsHint backupPath">Backup folder<br/><code>{folder}</code></p>}
    <div className="settingsActions">
      <button className="primary" disabled={busy} onClick={createBackup}><Download size={16}/> {desktop ? 'Create backup' : 'Download backup'}</button>
      {desktop && <button className="secondary" disabled={busy} onClick={() => {
        invoke('open_backup_folder').catch(() => setMessage('The backup folder could not be opened.'));
      }}><FolderOpen size={16}/> Open backup folder</button>}
      <label className="secondary restoreButton">
        Restore backup
        <input type="file" accept="application/json,.json" disabled={busy} onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void selectBackup(file);
        }}/>
      </label>
    </div>
    {message && <p className="settingsMessage backupPath" role="status">{message}</p>}
    <p className="settingsHint">Backup files contain patient data in plain text. Keep copies in a secure location outside this computer.</p>
    {pending && <Confirm title="Replace records from this backup?" message={`This will replace your current records with ${replacement}. A backup of the current records is created first.`}
      confirmLabel="Restore" onCancel={() => setPending(null)} onRun={() => void confirmRestore(pending)}/>}
  </div>;
}

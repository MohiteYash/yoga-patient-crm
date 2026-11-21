import {invoke, isTauri} from '@tauri-apps/api/core';
import {Appointment, Expense, Patient} from '../types';
import {safePatient} from './fields';
import {download} from './format';
import {K} from './storage';

export type ClinicBackup = {patients: Patient[]; appointments?: Appointment[]; expenses?: Expense[]};

function readRecords<T>(value: unknown, read: (record: unknown) => T | null): T[] {
  if (!Array.isArray(value)) throw new Error('Expected a list of records.');
  const ids = new Set<string>();
  return value.map(record => {
    if (typeof record?.id !== 'string' || !record.id || ids.has(record.id)) throw new Error('Invalid record ID.');
    const parsed = read(record);
    if (!parsed) throw new Error('Invalid record.');
    ids.add(record.id);
    return parsed;
  });
}

export function parseBackup(contents: string): ClinicBackup {
  const data: unknown = JSON.parse(contents);
  if (Array.isArray(data)) return {patients: readRecords(data, safePatient)};
  if (!data || typeof data !== 'object' || !('patients' in data)) throw new Error('Missing patient records.');
  const patients = readRecords(data.patients, safePatient);
  const appointments = 'appointments' in data ? readRecords(data.appointments, record => {
    const entry = record as Appointment;
    return typeof entry.patientId === 'string' && typeof entry.date === 'string' && typeof entry.status === 'string' ? entry : null;
  }) : undefined;
  const expenses = 'expenses' in data ? readRecords(data.expenses, record => {
    const entry = record as Expense;
    return typeof entry.date === 'string' && typeof entry.description === 'string' && Number.isFinite(entry.amount) ? entry : null;
  }) : undefined;
  return {patients, appointments, expenses};
}

export async function saveBackup(records: Required<ClinicBackup>) {
  const exportedAt = new Date().toISOString();
  const contents = JSON.stringify({exportedAt, ...records}, null, 2);
  if (isTauri()) return invoke<string>('save_clinic_backup', {contents});
  download(`yogacare-backup-${exportedAt.replace(/[:.]/g, '-')}.json`, contents);
  return null;
}

export function restoreBackup(records: ClinicBackup, storage: Storage = localStorage): string[] {
  const entries: [string, unknown[]][] = [[K.patients, records.patients]];
  if (records.appointments) entries.push([K.appointments, records.appointments]);
  if (records.expenses) entries.push([K.expenses, records.expenses]);
  const changes = entries.map(([key, value]) => ({key, previous: storage.getItem(key), next: JSON.stringify(value)}));
  // Free room before growing another list, and retain the exact values for rollback.
  changes.sort((a, b) => (a.next.length - (a.previous?.length ?? 0)) - (b.next.length - (b.previous?.length ?? 0)));
  let applied = 0;
  try {
    for (const change of changes) {
      storage.setItem(change.key, change.next);
      applied++;
    }
  } catch {
    const written = changes.slice(0, applied);
    try {
      written.forEach(change => storage.removeItem(change.key));
      written.forEach(change => {
        if (change.previous !== null) storage.setItem(change.key, change.previous);
      });
    } catch {
      throw new Error('Local storage could not be rolled back. Keep the backup saved before this restore.');
    }
    throw new Error('The backup could not be restored to local storage. Your previous records were kept.');
  }
  return changes.map(change => change.key);
}

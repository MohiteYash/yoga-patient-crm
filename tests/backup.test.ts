import {describe, expect, it} from 'vitest';
import {parseBackup, restoreBackup} from '../src/lib/backup';
import {K} from '../src/lib/storage';
import {patient} from './helpers';

function makeStorage(initial: Record<string, string>, failKey?: string) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {values.delete(key)},
    setItem: (key: string, value: string) => {
      if (key === failKey) throw new Error('Storage quota exceeded');
      values.set(key, value);
    },
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {return values.size},
  };
}

describe('clinic backup and restore', () => {
  it('accepts an empty clinic backup and clears its supplied collections', () => {
    const backup = parseBackup('{"patients":[],"appointments":[],"expenses":[]}');
    const storage = makeStorage({[K.patients]: JSON.stringify([patient()]), [K.appointments]: '[{}]', [K.expenses]: '[{}]'});
    expect(restoreBackup(backup, storage)).toHaveLength(3);
    for (const key of [K.patients, K.appointments, K.expenses]) expect(storage.getItem(key)).toBe('[]');
  });

  it('restores a legacy patient-only backup without replacing other data', () => {
    const record = patient({history: {symptoms: 'Pain after sitting'}, xray: {before: 'data:image/png;base64,example'}});
    const storage = makeStorage({[K.appointments]: 'existing appointments', [K.expenses]: 'existing expenses'});
    const backup = parseBackup(JSON.stringify([record]));
    expect(restoreBackup(backup, storage)).toEqual([K.patients]);
    expect(JSON.parse(storage.getItem(K.patients)!)).toEqual([record]);
    expect(storage.getItem(K.appointments)).toBe('existing appointments');
    expect(storage.getItem(K.expenses)).toBe('existing expenses');
  });

  it('rejects duplicate or malformed records before anything is restored', () => {
    expect(() => parseBackup(JSON.stringify([patient(), patient()]))).toThrow();
    expect(() => parseBackup('{"patients":[],"appointments":[{"id":"a"}]}')).toThrow();
    expect(() => parseBackup('{"patients":[],"expenses":null}')).toThrow();
  });

  it('rolls back earlier writes if a later collection fails to save', () => {
    const previous = JSON.stringify([patient()]);
    const storage = makeStorage({[K.patients]: previous, [K.appointments]: '[]'}, K.appointments);
    expect(() => restoreBackup({patients: [], appointments: []}, storage)).toThrow('Your previous records were kept');
    expect(storage.getItem(K.patients)).toBe(previous);
    expect(storage.getItem(K.appointments)).toBe('[]');
  });
});

import {expect, it} from 'vitest';
import {buildReport} from '../src/lib/pdf';
import {patient} from './helpers';

it('generates a report with embedded fonts for payment totals and entries', () => {
  const report = buildReport(patient({
    fee: 1250.5,
    paid: 500,
    payments: [{id: 'PAY-1', patientId: 'TEST-1', amount: 500, date: '2026-01-01', paymentMethod: 'Cash', createdAt: '2026-01-01T00:00:00Z'}],
  }));
  const data = Buffer.from(report.output('arraybuffer'));
  expect(data.subarray(0, 5).toString()).toBe('%PDF-');
  const content = data.toString('latin1');
  expect(content.match(/\/FontFile2 \d+ 0 R/g)).toHaveLength(2);
});

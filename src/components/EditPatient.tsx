import {useState} from 'react';
import {CheckCircle2, X} from 'lucide-react';
import {GENDERS, PATIENT_STATUSES} from '../lib/fields';
import {today, uid} from '../lib/format';
import {INTAKE_SECTIONS, IntakeQuestion} from '../lib/intake';
import {Patient} from '../types';
import {Field, useEscape} from './ui';

export function IntakeAnswer({question, value, onChange}: {question: IntakeQuestion; value: string; onChange: (value: string) => void}) {
  if (question.kind === 'multi') {
    const selected = value.split(' | ').filter(Boolean);
    return <div className="field fullField" role="group" aria-label={question.label}>
      <span>{question.label}</span>
      <div className="intakeChecks">
        {Array.from(new Set([...(question.options ?? []), ...selected])).map(option => <label key={option}>
          <input type="checkbox" checked={selected.includes(option)} onChange={event => {
            const next = event.target.checked ? [...selected, option] : selected.filter(item => item !== option);
            onChange(next.join(' | '));
          }}/>
          <span>{option}</span>
        </label>)}
      </div>
    </div>;
  }
  if (question.options) return <Field label={question.label}>
    <select value={value} onChange={event => onChange(event.target.value)}>
      <option value="">Select / not answered</option>
      {value && !question.options.includes(value) && <option>{value}</option>}
      {question.options.map(option => <option key={option}>{option}</option>)}
    </select>
  </Field>;
  return <Field label={question.label} full={question.kind === 'long'}>
    {question.kind === 'long'
      ? <textarea value={value} onChange={event => onChange(event.target.value)}/>
      : <input type={question.kind === 'date' ? 'date' : 'text'} value={value} onChange={event => onChange(event.target.value)}/>}
  </Field>;
}

export function EditPatient({patient, onSave, onClose}: {patient: Patient; onSave: (patient: Patient) => void; onClose: () => void}) {
  const [draft, setDraft] = useState(patient);
  const set = <K extends keyof Patient>(key: K, value: Patient[K]) => setDraft(previous => ({...previous, [key]: value}));
  useEscape(onClose);

  return <div className="modalWrap">
    <form className="modal intakeModal patientEditor" role="dialog" aria-modal="true" aria-labelledby="edit-patient-title" onSubmit={event => {
      event.preventDefault();
      if (!draft.name.trim()) return;
      const planLog = draft.planMonths === patient.planMonths
        ? patient.planLog
        : [{id: uid(), date: today(), months: draft.planMonths}, ...(patient.planLog ?? [])];
      onSave({...draft, name: draft.name.trim(), phone: draft.phone.trim(), planLog});
    }}>
      <div className="modalHead">
        <div><h3 id="edit-patient-title">Edit patient</h3><p>{patient.name} · {patient.id}</p></div>
        <button type="button" className="close" aria-label="Close" onClick={onClose}><X/></button>
      </div>
      <div className="intakeBody patientEditorBody">
        <section className="editSection">
          <h4>Patient details</h4>
          <div className="formGrid">
            <Field label="Patient name"><input autoFocus required value={draft.name} onChange={e => set('name', e.target.value)}/></Field>
            <Field label="Phone"><input type="tel" value={draft.phone} onChange={e => set('phone', e.target.value)}/></Field>
            <Field label="Age"><input type="number" min="0" max="120" required value={Number.isFinite(draft.age) ? draft.age : ''} onChange={e => set('age', e.target.valueAsNumber)}/></Field>
            <Field label="Gender"><select value={draft.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select</option>
              {draft.gender && !GENDERS.includes(draft.gender) && <option>{draft.gender}</option>}
              {GENDERS.map(gender => <option key={gender}>{gender}</option>)}
            </select></Field>
            <Field label="Date of joining"><input type="date" value={draft.visitDate} onChange={e => set('visitDate', e.target.value)}/></Field>
            <Field label="Treating doctor"><input value={draft.doctor} onChange={e => set('doctor', e.target.value)}/></Field>
          </div>
        </section>
        <section className="editSection">
          <h4>Clinical assessment</h4>
          <div className="formGrid">
            <Field label="Main concern"><input value={draft.condition} onChange={e => set('condition', e.target.value)}/></Field>
            <Field label="Diagnosis"><input value={draft.diagnosis} onChange={e => set('diagnosis', e.target.value)}/></Field>
            <Field label="Initial pain (0–10)"><input type="number" min="0" max="10" required value={Number.isFinite(draft.painBefore) ? draft.painBefore : ''} onChange={e => set('painBefore', e.target.valueAsNumber)}/></Field>
            <Field label="Follow-up pain (0–10)"><input type="number" min="0" max="10" value={draft.painAfter ?? ''} onChange={e => set('painAfter', e.target.value === '' ? undefined : e.target.valueAsNumber)}/></Field>
            <Field label="Initial mobility"><input value={draft.mobilityBefore} onChange={e => set('mobilityBefore', e.target.value)}/></Field>
            <Field label="Follow-up mobility"><input value={draft.mobilityAfter ?? ''} onChange={e => set('mobilityAfter', e.target.value || undefined)}/></Field>
            <Field label="Clinical notes" full><textarea value={draft.notes} onChange={e => set('notes', e.target.value)}/></Field>
          </div>
        </section>
        <section className="editSection">
          <h4>Treatment plan</h4>
          <div className="formGrid">
            <Field label="Treatment duration (months)"><input type="number" min="1" max="36" required value={Number.isFinite(draft.planMonths) ? draft.planMonths : ''} onChange={e => set('planMonths', e.target.valueAsNumber)}/></Field>
            <Field label="Follow-up date"><input type="date" value={draft.followUpDate} onChange={e => set('followUpDate', e.target.value)}/></Field>
            <Field label="Patient status"><select value={draft.status} onChange={e => set('status', e.target.value as Patient['status'])}>
              {PATIENT_STATUSES.map(status => <option key={status}>{status}</option>)}
            </select></Field>
          </div>
        </section>
        <section className="editSection">
          <h4>Intake questionnaire</h4>
          {INTAKE_SECTIONS.map(section => <details className="intakeGroup" key={section.title}>
            <summary><span><b>{section.title}</b><small>{section.hint}</small></span></summary>
            <div className="formGrid">
              {section.questions.map(question => <IntakeAnswer key={question.key} question={question} value={draft.history?.[question.key] ?? ''}
                onChange={value => setDraft(previous => ({...previous, history: {...previous.history, [question.key]: value}}))}/>)}
            </div>
          </details>)}
        </section>
      </div>
      <div className="intakeFooter">
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="primary" disabled={!draft.name.trim()}><CheckCircle2 size={17}/> Save changes</button>
      </div>
    </form>
  </div>;
}

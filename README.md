# YogaCare CRM — Tauri + React desktop app

A local-first desktop CRM for yoga/rehabilitation clinics. It tracks patients from first visit through a configurable treatment plan and follow-up, including pain scores, mobility, exercises, before/after X-rays and PDF outcome reports.

## Included
- Dashboard with total patients, active plans, follow-up queue, pain outcomes, today's schedule, outstanding fees, collected today and month-to-date expenses
- Patient CRM with search and a command palette shortcut (<kbd>Cmd/Ctrl</kbd> + <kbd>K</kbd>)
- Patient profile and clinical snapshot
- Appointment scheduling with status tracking, rescheduling and a today/upcoming view
- Visit history with pain and mobility scores, treatment and prescribed exercises
- Patient timeline merging registration, visits, appointments, payments, X-rays and plan changes
- Progress tracking charts for recorded pain and mobility scores over time
- 3-month exercise plan with prescribed exercises
- Before/after X-ray upload and side-by-side comparison, plus dated X-ray records with an in-app viewer
- Payment history ledger per patient with fee, paid, outstanding and reconciliation
- Clinic expense tracking separate from patient payments
- Outcome report preview
- One-click PDF export as a paginated A4 clinical report covering patient details, clinical overview, key metrics, visit history, progress charts, exercise plan, before/after X-rays, every dated X-ray record, payment summary and notes. Table headers repeat on continued pages and long rows are moved whole to the next page rather than cut in half
- Exported reports are named `<patient-id>-<patient-name>-outcome-report.pdf` so each file is matched to the record it came from
- Report amounts are printed with the `₹` symbol. `₹` is absent from the WinAnsi encoding used by the built-in PDF fonts, so a small DM Sans subset containing only that glyph (plus digits and separators) is embedded in the report; amounts stay selectable and searchable
- Reports are compressed and X-ray images are embedded aspect-ratio-preserved at a bounded print size so layout stays consistent regardless of file size; the stored originals are never resized, re-compressed or altered
- Backup and restore covering patients, appointments and expenses, with an explicit confirmation and an automatic backup of current records before any restore
- Fictional demo data is opt-in from Settings and can be removed again; a real install starts empty and never shows sample patients
- Visible error handling so corrupted or unsavable local data is never silently overwritten
- Local persistence using browser storage inside the desktop WebView
- Light and dark themes with blue/green/red status colors
- DM Sans typography with a centralized, tokenized type scale (no network font request)
- Keyboard and screen-reader support: every modal is a named dialog closable with <kbd>Esc</kbd>, the current page and open tab are announced, and X-ray upload and thumbnails are reachable by keyboard

## Windows setup
1. Install Node.js LTS.
2. Install Rust using rustup: https://rustup.rs/
3. Install Microsoft C++ Build Tools with the Desktop development with C++ workload.
4. Open PowerShell in this folder.
5. Run:
   ```powershell
   npm install
   npm run tauri:dev
   ```
6. To create the Windows installer / executable:
   ```powershell
   npm run tauri:build
   ```
   The generated installer/executable will be under `src-tauri/target/release/bundle/`.

## Data model / production next step
This MVP is local-first. For a production clinic deployment, replace localStorage with encrypted SQLite through a Tauri Rust command/plugin and add role-based access, audit logging, backups, consent tracking, and encryption/key management.

## Clinical safety
The application is a record-management and comparison tool. It does not perform or claim automated radiological diagnosis. Clinical interpretation should remain with the qualified clinician.

# YogaCare CRM — Tauri + React desktop app

A local-first desktop CRM for yoga/rehabilitation clinics. It tracks patients from first visit through a configurable treatment plan and follow-up, including pain scores, mobility, exercises, before/after X-rays and PDF outcome reports.

## Included
- Dashboard with total patients, active plans, follow-up queue and pain outcomes
- Patient CRM with search
- Patient profile and clinical snapshot
- 3-month exercise plan with prescribed exercises
- Before/after X-ray upload and side-by-side comparison
- Outcome report preview
- One-click PDF export with patient details, exercise plan and X-ray images
- Local persistence using browser storage inside the desktop WebView
- White minimal UI with blue/green/red status colors

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

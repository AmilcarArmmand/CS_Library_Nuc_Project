# CS Library

Computer Science Department library system for Southern Connecticut State University.

This repo currently contains:

- a web app for students and admins
- a Raspberry Pi kiosk app
- PostgreSQL schema and migration scripts
- Open Library import and enrichment tools
- deployment scripts for the school server and Pi kiosk setup

## Stack

- Node.js + TypeScript
- Express + EJS
- PostgreSQL + Drizzle ORM
- Passport auth
- Google OAuth
- Microsoft / Outlook OAuth scaffolding
- Postfix / `sendmail` email delivery

## Apps

### Web app

- student login, registration, password reset
- student catalog browsing and holds
- suggestion submission
- student loan history and extension requests
- admin dashboard, books, loans, users, reports, donations, suggestions

Default local URL:

```bash
http://localhost:8080
```

### Kiosk app

- student ID sign-in
- browse, checkout, return, my books, donate, search
- idle timeout with forced sign-out
- scanner-friendly input handling
- Raspberry Pi kiosk-mode helper scripts

Default local URL:

```bash
http://localhost:3000
```

## Current live server

Current development deployment on the school server:

- Web: http://prd-csclib01.scsu.southernct.edu:8080/auth/login
- Admin: http://prd-csclib01.scsu.southernct.edu:8080/admin/login
- Kiosk: http://prd-csclib01.scsu.southernct.edu:8081/

These are temporary dev URLs. Nginx + TLS still need to be put in front of the apps for the final public deployment.

## Implemented features

- web header/footer and mobile navigation
- proper home page with newly added books
- password reset flow
- email plumbing for reset, checkout, due reminders, overdue notices, hold-ready notices, suggestion updates, donation updates, and extension decisions
- richer book metadata fields
- interactive web book detail modal
- admin mobile shell
- admin donation review flow
- admin suggestion review flow
- admin extension-request review flow
- borrowing limits
- hold-ready promotion on return
- kiosk idle timeout
- kiosk scanner-friendly input handling
- Open Library lookup, catalog enrichment, and bulk import tools

## Remaining major project items

- final Microsoft / Outlook OAuth registration and live verification
- Raspberry Pi hardware testing with the real scanner
- Nginx + TLS final setup on the school server
- final inbox verification for all email flows
- import of the full real library inventory

## Prerequisites

- Node.js 20+ with `npm`
- PostgreSQL
- local or server-side `sendmail` / Postfix for email delivery

## Local setup

### 1. Install dependencies

```bash
npm install
cd kiosk && npm install
cd ..
```

### 2. Create env files

```bash
cp .env.example .env
cp kiosk/.env.example kiosk/.env
```

### 3. Configure the web app env

Important values in `.env.example`:

- `PORT=8080`
- `APP_BASE_URL=http://localhost:8080`
- `SESSION_SECRET=...`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_SENDMAIL_PATH`
- `KIOSK_API_KEY`

Important auth values:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_CALLBACK_URL`
- `MICROSOFT_TENANT_ID`

### 4. Configure the kiosk env

Important values in `kiosk/.env.example`:

- `KIOSK_PORT=3000`
- `CLOUD_HOST`
- `CLOUD_PORT`
- `CLOUD_PROTOCOL`
- `CLOUD_API_KEY`
- `KIOSK_SESSION_SECRET`

For local development, point the kiosk at the local web app:

```bash
CLOUD_HOST=localhost
CLOUD_PORT=8080
CLOUD_PROTOCOL=http
```

## Database setup

Run the main migrations:

```bash
npm run db:migrate:library
npm run db:migrate:microsoft-auth
npm run db:migrate:details
```

Seed baseline data:

```bash
npm run db:seed
```

## Development

### Web app

```bash
npm run dev
```

### Kiosk app

```bash
cd kiosk
npm run dev
```

### Production-style local builds

```bash
npm run build
cd kiosk && npm run build
```

## Common scripts

### Web app

```bash
npm run clean
npm run build
npm start
npm run db:generate
npm run db:migrate
npm run db:migrate:library
npm run db:migrate:microsoft-auth
npm run db:migrate:details
npm run db:seed
npm run books:import -- ./docs/book-import-template.csv --dry-run
npm run books:enrich -- --dry-run
npm run email:reminders
```

### Kiosk app

```bash
cd kiosk
npm run clean
npm run build
npm start
```

## Bulk catalog tools

Import books from CSV/TSV:

```bash
npm run books:import -- ./docs/book-import-template.csv --dry-run
```

Enrich existing books from Open Library:

```bash
npm run books:enrich -- --dry-run
```

## Raspberry Pi kiosk setup

Pi helper files live in `kiosk/pi`:

- `launch-chromium-kiosk.sh`
- `install-kiosk-services.sh`
- `cs-library-kiosk-app.service.template`
- `cs-library-kiosk-browser.service.template`

These scripts are meant to:

- start the kiosk Node app on boot
- launch Chromium in kiosk mode
- relaunch the browser if it exits

## Server deployment notes

Current server deploy path:

```bash
/opt/app
```

Typical server workflow:

```bash
npm install
npm run db:migrate:library
npm run db:migrate:microsoft-auth
npm run db:migrate:details
npm run build
cd kiosk && npm install && npm run build
```

The web app currently runs on `8080` and the kiosk on `8081`.

Nginx/TLS is still the final handoff step for ITS.

## Demo accounts

These may vary depending on the local database state, but the common demo accounts used during development are:

- Student web login: `molinak4@southernct.edu` / `changeme123`
- Admin login: `james@southernct.edu` / `changeme123`
- Kiosk student ID: `12345`

## Notes

- Password reset and email notifications depend on working mail delivery through Postfix / `sendmail`.
- Microsoft / Outlook login will not appear until the Microsoft env vars are configured.
- The kiosk app depends on the web app’s `/api/kiosk` endpoints and shared `KIOSK_API_KEY`.

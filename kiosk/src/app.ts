// kiosk/src/app.ts
// Lightweight Express app that runs locally on the Raspberry Pi.
// It serves the kiosk UI (login + dashboard) and proxies all data
// requests to the cloud server's REST API.
//
// The Pi never connects to PostgreSQL directly — all data flows
// through the cloud server's /api/kiosk/* endpoints, authenticated
// with the shared KIOSK_API_KEY.
//
// Run:  npm run dev    (development)
//       npm start      (production, after npm run build)

import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

import kioskRouter from './routes/kiosk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = Number(process.env['KIOSK_PORT'] ?? 8080);

// ── Validate required env vars ─────────────────────────────────────────────────
const CLOUD_API_URL = process.env['CLOUD_API_URL'];
const CLOUD_API_KEY = process.env['CLOUD_API_KEY'];

if (!CLOUD_API_URL || !CLOUD_API_KEY) {
  console.error('\n❌  Missing required environment variables:');
  if (!CLOUD_API_URL) console.error('   CLOUD_API_URL — e.g. https://your-server.com/api/kiosk');
  if (!CLOUD_API_KEY) console.error('   CLOUD_API_KEY — must match KIOSK_API_KEY on the server');
  console.error('\n   Copy kiosk/.env.example to kiosk/.env and fill in the values.\n');
  process.exit(1);
}

// ── View engine ────────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
// Views live in kiosk/views/ (not compiled — EJS is read at runtime)
app.set('views', path.join(process.cwd(), 'views'));

// ── Static assets ──────────────────────────────────────────────────────────────
// Serves /assets/* from the shared assets/ folder in the repo root.
// Adjust the path if your repo structure differs.
app.use('/assets', express.static(path.join(process.cwd(), '..', 'assets')));
app.use('/images', express.static(path.join(process.cwd(), '..', 'assets')));
app.use('/favicon1.ico', express.static(path.join(process.cwd(), '..', 'favicon1.ico')));

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret:            process.env['KIOSK_SESSION_SECRET'] ?? 'kiosk-change-me',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,   // Pi runs HTTP on the local network — fine for localhost
    httpOnly: true,
    maxAge:   30 * 60 * 1000,  // 30-minute idle timeout
  },
}));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/', kioskRouter);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).send('<h2>404 — Page not found</h2>');
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ CS Library Kiosk running on http://localhost:${PORT}`);
  console.log(`   Cloud API : ${CLOUD_API_URL}`);
  console.log(`   Login     : http://localhost:${PORT}/\n`);
});

export default app;
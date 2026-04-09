# CS Library Project Full-Stack Website

## Installation and Environment Setup

SSH into VM:

```bash
sudo apt update
sudo apt install -y git build-essential curl nginx
```

Install Node.js (LTS) via nvm
```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install --lts
node -v && npm -v && git --version
```

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh


```


```bash
npm init -y
npm install passport passport-google-oauth20 express-session
npx tsc --init


```

- Copy `.env.example` to create `.env` file to store credentials/secrets


- Install dependencies: `npm install`
- Script to clean dist/ `npm run clean`
- Script to build `npm run build`
- Script to run development mode with nodemon `npm run dev`
- Script to generate schema `npm run db:generate`
- Script to migrate generated Drizzle files `npm run db:migrate`
- Script to apply the password-reset/email/library schema additions directly `npm run db:migrate:library`
- Script to seed baseline data `npm run db:seed`
- Script to import a CSV/TSV inventory file `npm run books:import -- ./docs/book-import-template.csv --dry-run`
- Script to enrich existing catalog entries from Open Library `npm run books:enrich -- --dry-run`
- Script to send due-soon and overdue reminder emails `npm run email:reminders`
- Start the server in production mode: `npm start`
- Open your browser to http://localhost:8080

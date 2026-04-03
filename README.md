# CS Library Project Overhaul

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
# First time startup

npm init -y
npm install passport passport-google-oauth20 express-session
npx tsc --init

# Then...

npm run build && npm start
# or
npm run dev

```

- Copy `.env.example` to create `.env` file to store credentials/secrets


- Install dependencies: `npm install`
- Script to clean dist/ `npm run clean`
- Script to build `npm run build`
- Script to run development mode with nodemon `npm run dev`
- Script to generate schema `npm run db:generate`
- Script to migrate schema `npm run db:generate`
- Script to push schema `npm run db:generate`
- Start the server in production mode: `npm start`
- Open your browser to http://localhost:3000

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

- Install dependencies: `npm install`
- Start the server: `npm start`
- Open your browser to http://localhost:3000

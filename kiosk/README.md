# CS Library Kiosk — Kiosk Setup Guide

## Requirements

- Raspberry Pi running Raspberry Pi OS
- Node.js (installed via nvm — see Step 4)
- An `admin` account with sudo privileges
- A `kiosk` account with no sudo privileges, configured to auto-login on boot

---

## 1. Create the kiosk user

If you haven't done so already, create the kiosk account and configure it to auto-login:

```bash
sudo useradd -m -s /bin/bash kiosk
sudo passwd -d kiosk
```

Then set auto-login via `raspi-config`:

```
System Options → Boot / Auto Login → Desktop Autologin
```

Select the `kiosk` user when prompted.

You may also manually change this with the command:

```bash
sudo nano /etc/lightdm/lightdm.conf
```

In `lightdm.conf`:

```ini
[Seat:*]
autologin-user=kiosk
autologin-user-timeout=0
``

---

## 2. Clone the repository

As the `admin` account, clone the repository to your desired location. We recommend `/opt/` for system-wide deployment:

```bash
# Change when we have a separete repo for the kiosk
sudo git clone -b reconstruction https://github.com/AmilcarArmmand/CS_Library_Nuc_Project.git /opt/CS_Library_Nuc_Project

```

Then give the admin account ownership of the directory:

```bash
sudo chown -R admin:admin /opt/CS_Library_Nuc_Project
```

---

## 3. Configure the environment

Navigate to the kiosk directory:

```bash
cd /opt/CS_Library_Nuc_Project/kiosk
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
nano .env
```

Make the start script executable:

```bash
chmod +x start.sh
```

---

## 4. Install Node.js via nvm

The app requires Node.js. If it isn't installed yet, run:

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
```

---

## 5. Test the app (optional)

Before installing as a kiosk service, you can run the app manually to verify everything works:

```bash
./start.sh
```

If it starts and serves on `http://localhost:3000`, you're good to proceed.

---

## 6. Install the kiosk services

Run the installation script:

```bash
npm run install-kiosk
```

You will be prompted to choose whether to install for the `kiosk` user or the current user. Choose `kiosk` for production.

The system will automatically reboot when installation is complete. After rebooting, Chromium should launch automatically and display the kiosk app.

---

## Uninstalling

To uninstall the kiosk services and revert all changes, run as `admin`:

```bash
npm run uninstall-kiosk
```

The system will reboot automatically after uninstallation.

---

## Tips & Notes

- **Keyboard shortcuts** — Most shortcuts (terminal, app menu, etc.) are disabled in the kiosk session for security. Ctrl+Alt+F2 through F6 will drop to a TTY login prompt where an admin can log in and perform maintenance without needing SSH.
- **SSH access** — The installation and uninstallation scripts can be run over SSH, which is the recommended approach to avoid session interruptions.
- **Permissions** — If the app fails to start with a permissions error, run `sudo chown -R kiosk:kiosk /opt/CS_Library_Nuc_Project` to restore correct ownership.
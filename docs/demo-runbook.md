# CS Library Demo Runbook

Use this for the touchscreen demo tomorrow and the larger in-person presentation next week.

## Goal

Show a stable, believable product:

1. The web app works
2. The kiosk works
3. Admin tools work
4. The server deployment is real
5. The project solves a real library workflow

## Live URLs

- Web login: `https://csclibrary.scsu.southernct.edu/auth/login`
- Web dashboard: `https://csclibrary.scsu.southernct.edu/web-dashboard`
- Admin login: `https://csclibrary.scsu.southernct.edu/admin/login`
- Kiosk: `https://csclibrary.scsu.southernct.edu/kiosk`

If HTTPS acts up during testing, use the raw ports while on VPN:

- Web: `http://prd-csclib01.scsu.southernct.edu:8080/auth/login`
- Admin: `http://prd-csclib01.scsu.southernct.edu:8080/admin/login`
- Kiosk: `http://prd-csclib01.scsu.southernct.edu:8081/`

## Tonight's Stabilization Checklist

### Server

- Confirm web login loads
- Confirm admin login loads
- Confirm kiosk loads
- Confirm PM2 is running both services
- Confirm Outlook login still appears if that is part of the demo

### Web user flow

- Log in with a normal user
- Open the catalog
- Search for an item
- Open one item detail modal
- View current loans
- Log out

### Admin flow

- Log in as admin
- Open book management
- Edit one existing item safely
- Verify loans page loads
- Verify users page loads
- Do not perform risky destructive actions right before demo

### Kiosk flow

- Student ID login works
- Touchscreen scrolling works
- Barcode scanner works for checkout
- Return flow works
- Renew flow works if you plan to show it
- Manual fallback login works if scanner fails

### Touchscreen hardware

- Portrait orientation looks acceptable
- No accidental text selection during scrolling
- Buttons are large enough to tap
- Search is usable
- On-screen keyboard fallback plan is known

## Recommended Demo Flow for Tomorrow

Keep it short and controlled.

1. Start with the problem
   - The CS library needs a way to manage inventory and let students check items out easily.

2. Show the web portal
   - Student logs in
   - Browses the catalog
   - Sees their checked-out items

3. Show the kiosk
   - Student signs in with ID scanner
   - Scans an item
   - Checks out through the touchscreen interface

4. Show the admin side
   - Admin manages catalog entries
   - Admin monitors loans and users

5. Close with deployment
   - Hosted on the SCSU server
   - Web and kiosk apps are running live
   - PM2 keeps the services managed on the server

## Fallback Plan

If something goes wrong, do not freeze. Pivot immediately.

### If scanner fails

- Use manual ID entry
- Type or paste the barcode if needed

### If touchscreen is awkward

- Use a mouse for the demo
- Explain the touchscreen is still being tuned for the final in-person presentation

### If Outlook login fails

- Use local login
- Explain Microsoft SSO was integrated and tested, but local login remains the reliable fallback for demo use

### If the kiosk path fails

- Use the raw kiosk port on VPN
- If needed, demonstrate the same backend flow from the web app

## What Not To Change Before Tomorrow

- Do not do a full equipment architecture refactor tonight
- Do not rename core tables or routes
- Do not change checkout logic unless there is a confirmed bug
- Do not make cosmetic changes that risk breaking layout

## Best Use of Remaining Time

1. Run the full demo once without talking
2. Run it a second time while talking through it
3. Write down every awkward pause or fragile step
4. Remove unnecessary clicks
5. Prepare one fallback login and one fallback kiosk plan

## Talking Points

- This system has three sides: web, kiosk, and admin
- Students can browse and manage loans online
- The kiosk gives the library a self-service checkout flow
- Admins can manage catalog records and monitor usage
- The project is deployed on SCSU infrastructure

## For Next Week's In-Person Presentation

After tomorrow, the next major feature focus should be:

1. Expand catalog support beyond books into equipment
2. Reflect that item model in the kiosk UI
3. Finish remaining polish such as About page and login rate limiting

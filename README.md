# Daylist — simple task manager

A **100% static** task manager for **GitHub + Vercel**. No API, database, account, server, paid services, npm, or environment variables.

## Features

- Create, edit, complete, reopen, and delete tasks.
- Start date, due date, priority, description, and 0–100% progress.
- Dashboard for total, in-progress, completed, and overdue tasks.
- Upcoming deadlines, in-app warnings, search, filtering, and sorting.
- Browser notifications for overdue tasks and tasks due today/tomorrow **while the site is open**, if you grant permission.
- Automatic local storage in your browser.
- Export and import JSON backups to move tasks to another device or preserve data.
- Responsive desktop/mobile layout.

## Files

- `index.html` — app page
- `styles.css` — app design
- `app.js` — all task management logic
- `README.md` — this guide

## Test it locally

Open `index.html` in your browser. You can also run a simple static server (optional) with `python -m http.server 8000` and visit `http://localhost:8000`.

## Deploy on GitHub + Vercel

1. Create a new GitHub repository.
2. Upload **index.html**, **styles.css**, and **app.js** to the **root** of the repository. (You can include README.md too.)
3. In Vercel, click **Add New → Project** and import your GitHub repository.
4. Set the Framework Preset to **Other**. Leave the Build Command empty, and use `.` (the project root) as the Output Directory if Vercel asks for one.
5. Click **Deploy**. Vercel gives you a public HTTPS URL. No secrets or environment variables are needed.

## Important limitations

**Tasks live in your browser's `localStorage`, not on GitHub or Vercel.** This is how the app works without a database or API. Tasks persist across refreshes on the same browser/device, but do not sync between browsers/devices. Clearing site data, using private browsing, or changing devices can remove access to tasks. Use **Export tasks as backup** regularly; **Import a backup** restores them.

**Browser notifications only work when the app is open** (or running in an active browser tab), the browser allows notifications, and permission has been granted. In-app warnings work whenever you open the page. Notifications when the app is fully closed, email alerts, and cross-device sync would require additional services.

**Privacy:** No task data is transmitted to a server by this app. The GitHub repository holds code only, not your task data.

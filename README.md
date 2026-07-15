# Moon & Star Portfolio

A full-stack personal portfolio with an owner-only admin panel. Add, edit, and
delete projects from a web UI — no code changes, no redeploy.

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module — a single file, zero native dependencies, zero setup
- **Frontend:** plain HTML/CSS/JS served statically by Express (no build step, no framework)
- **Uploads:** `multer`, saved to `public/uploads/`
- **Auth:** session-based login for a single admin user; password hashed with `bcryptjs`, session secret and credentials come from `.env`

## Folder structure

```
.
├── server/
│   ├── index.js            # app entry point, middleware, routing
│   ├── db.js                # SQLite connection + schema
│   ├── middleware/
│   │   ├── auth.js          # requireAuth guard
│   │   └── upload.js        # multer config (image validation, 5MB limit)
│   └── routes/
│       ├── auth.js          # /api/admin/login, /logout, /me
│       └── projects.js      # public + admin project CRUD
├── public/
│   ├── index.html, work.html, websites.html, about.html, contact.html
│   ├── admin/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   └── project-form.html   # add + edit (same page, ?id=... for edit)
│   ├── css/ (style.css, admin.css)
│   ├── js/ (page scripts + admin/ scripts)
│   └── uploads/              # uploaded screenshots (gitignored)
├── data/                     # portfolio.db lives here (gitignored)
├── scripts/hash-password.js  # optional bcrypt sanity-check helper
├── .env.example
└── package.json
```

## Running locally

1. **Install dependencies**

   ```bash
   npm install
   ```

   Requires **Node.js 22.5+** (uses the built-in `node:sqlite` module — no
   Visual Studio / build tools needed, unlike most SQLite packages).

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `ADMIN_USERNAME` — your admin login username
   - `ADMIN_PASSWORD` — your admin login password (kept only in `.env`, never in code; hashed with bcrypt in memory at login time)
   - `SESSION_SECRET` — a long random string. Generate one with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

3. **Start the server**

   ```bash
   npm start
   ```

   Visit `http://localhost:3000` for the public site and
   `http://localhost:3000/admin` for the admin panel.

   For auto-restart on file changes during development:

   ```bash
   npm run dev
   ```

The SQLite database file is created automatically at `data/portfolio.db` on
first run — no migrations, no setup.

## Using the admin panel

1. Go to `/admin`, log in with the credentials from `.env`.
2. **Dashboard** lists every project with Edit / Delete.
3. **Add new project** — fill in title, descriptions, category
   (project/website), comma-separated tech tags, live URL, GitHub URL,
   upload a screenshot (jpg/png/webp/gif/svg, max 5MB), and optionally check
   "featured on homepage."
4. Saving writes straight to the SQLite database — the public Home, Work,
   and Websites pages fetch from the database on every page load, so the new
   project appears immediately.
5. **Logout** clears the session. Sessions also expire automatically after
   30 minutes of inactivity (sliding expiration).

## Security notes

- The admin password lives only in `.env` (gitignored) and is never
  hard-coded; login compares it via `bcryptjs.compare`, not plain string
  equality.
- Login is rate-limited (10 attempts / 15 minutes per IP) and returns a
  generic "Incorrect username or password" message either way, so it never
  reveals whether the username or password was wrong.
- All `/admin/*` pages and `/api/admin/*` endpoints check
  `req.session.isAdmin` server-side and redirect/401 if not authenticated —
  the client-side admin UI is not the security boundary.
- Uploads are restricted to image MIME types + extensions, capped at 5MB,
  and renamed on disk (no user-controlled filenames/paths).
- Session cookies are `httpOnly`, `sameSite: strict`, and `secure` in
  production (HTTPS only).
- `helmet` sets baseline security headers with a locked-down CSP.
- All form input is validated and length-limited server-side (this is the
  real boundary — client-side checks are just for UX).
- Visitor accounts (`users` table) are completely separate from admin
  access. The unified login box checks the submitted identifier against
  `ADMIN_USERNAME` first — only a match there, verified against the real
  `ADMIN_PASSWORD` hash, grants `req.session.isAdmin`. Nothing in the
  visitor signup/login path can ever set that flag, so a compromised or
  malicious visitor account can't escalate to admin.

## Visitor accounts & analytics

- Visitors can sign up / log in (email + password) from the login button
  on any page. This only ever creates a normal account in the `users`
  table — see the security note above for why it can't grant admin access.
- Every page load is logged (path, timestamp, an anonymous visitor cookie,
  and the logged-in user id if any) to `page_views`, viewable as simple
  stats in `/admin/dashboard.html`. No third-party analytics, nothing
  shared externally.
- Google/Facebook login buttons exist in the UI but stay hidden until you
  set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` or
  `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET` env vars — those require
  creating OAuth apps in Google Cloud Console / Meta for Developers
  first, which isn't done yet.
- There's no "forgot password" flow for visitor accounts (that needs an
  email-sending service, not currently wired up).

## Deploying (Render or Railway)

Both platforms work the same way for this app: build command `npm install`,
start command `npm start`.

### Render

1. Push this repo to GitHub.
2. New **Web Service** → connect the repo.
3. Build command: `npm install`; Start command: `npm start`.
4. Add environment variables (from `.env.example`): `ADMIN_USERNAME`,
   `ADMIN_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`.
5. Add a **Persistent Disk** (e.g. 1GB) mounted at `/opt/render/project/src/data`
   so `portfolio.db` and uploaded images survive restarts/redeploys — without
   a persistent disk, SQLite data and uploads are wiped on every deploy.
   Mount a disk at the `public/uploads` path too (or symlink it under the
   same disk) so uploaded screenshots persist as well.

### Railway

1. Push this repo to GitHub.
2. New Project → Deploy from repo.
3. Railway auto-detects Node; it will run `npm install` and `npm start`.
4. Add the same environment variables in the Railway dashboard.
5. Add a **Volume** mounted at `/app/data` (for the database) and another at
   `/app/public/uploads` (for images) so both persist across deploys.

> SQLite is a single file on disk — it works great for a personal portfolio,
> but the file (and uploaded images) must live on persistent storage on
> whichever platform you deploy to, or they'll reset on every redeploy.

## Notes

- Update the placeholder content in `public/contact.html`, `public/about.html`,
  and `public/index.html` (name, email, social links, bio, timeline) with
  your own details.
- Add projects for both the **Work** page (category = `project`) and the
  **Websites** page (category = `website`) — the Websites page only shows
  entries with a live URL and a "Visit site" button.

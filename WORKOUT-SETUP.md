# Workout tracker — one-time setup on Render

The tracker at `/workout` has its own accounts (separate from your admin
login and from the rest of the site). Two settings make it work in
production. Do these once in the Render dashboard for your existing service.

## 1. Set the invite code (required)

Friends can only sign up if they enter this code, so strangers can't create
accounts on your public site.

- Render → your service → **Environment** → **Add Environment Variable**
- Key: `WORKOUT_INVITE_CODE`
- Value: anything you like, e.g. `MOONSTAR-FIT` (share this with friends)

## 2. Add a persistent disk so data is never lost (strongly recommended)

By default the database is written to the server's temporary disk, which
**resets every time the app redeploys** — that would wipe everyone's accounts,
plans and progress. A persistent disk keeps it forever.

- Render → your service → **Disks** → **Add Disk**
  - Name: `data`
  - Mount path: `/var/data`
  - Size: 1 GB is plenty
- Then add an environment variable so the app uses it:
  - Key: `DATA_DIR`
  - Value: `/var/data`
- **Save** → Render redeploys.

> Note: the first time `DATA_DIR` points at the new disk, the database starts
> fresh on that disk. If you had admin projects/settings you want to keep,
> re-check them in the admin panel after this change (they re-seed to defaults
> on a brand-new database).

That's it. Visit `/workout`, sign up with your invite code, answer the
questionnaire, and your plan is generated. Each friend does the same with the
same code and gets their own separate plan and progress.

---

*(Optional) `render.yaml` in this repo documents the same disk + env for
reference if you ever recreate the service from a Blueprint.)*

# Training Plan

A personal training PWA built for a long-term training plan.

## What is included

- **Today**
  - Daily Group Workout check-in
  - Run, spin bike, strength, flexibility, swim/dryland, skill and recovery sessions
  - Expandable instructions for every workout
  - Mark complete, skip, edit, move or delete a workout
  - Log actual results separately from the planned workout
  - Daily energy, soreness, sleep, RPE and notes

- **Week**
  - Seven-day plan view
  - Planned run, bike, strength and flexibility totals
  - Open any day directly
  - Reset a week from the weekly template
  - Edit the recurring weekly template

- **Progress**
  - 30-day completion percentage
  - Seven-day running, cycling, strength and flexibility totals
  - Weight and waist history
  - Pull-up, 3-mile and front-split-gap measurements
  - Eight-week run/bike volume visualization

- **Goals & phases**
  - IRONMAN 70.3 Maine 2027 as the primary goal
  - Body composition, strength, running, flexibility, handstand and L-sit goals
  - Full Ironman long-term goal
  - Current and future training phases

- **Data**
  - IndexedDB local storage
  - JSON full backup and restore
  - CSV workout export
  - No account, API or cloud dependency
  - Ready for cloud synchronization later without changing the basic workout data model

## Local storage design

The app stores data in IndexedDB under `hart-training-db`.

Key record types:

- `days`: planned sessions plus separate `actual` results and completion state
- `checkins`: energy, soreness, sleep, overall RPE and notes by date
- `measurements`: body/performance measurements
- `goals`: editable goals
- `phases`: training phases
- `settings`: preferences and the recurring weekly template

A workout keeps **planned** and **actual** data separate. Editing or logging a workout does not overwrite what was originally prescribed.

## Run locally

Because the app uses ES modules, IndexedDB and a service worker, run it through a local web server rather than opening `index.html` directly.

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new repository for this app. Keep it separate from `Name-Workout`.
2. Upload all files in this folder to the repository root.
3. In GitHub, open **Settings > Pages**.
4. Publish from the default branch and repository root.
5. Open the GitHub Pages URL on the phone.
6. Add it to the Home Screen for the standalone PWA experience.

No build process is required.

## Main files

- `index.html` — app shell, pages and dialogs
- `styles.css` — mobile-first dark/gold interface
- `app.js` — application UI and interactions
- `db.js` — IndexedDB schema, seed plan, backup/restore and data helpers
- `sw.js` — offline cache service worker
- `manifest.webmanifest` — installable PWA metadata
- `icon.svg`, `icon-192.png`, `icon-512.png` — app icons

## Starter weekly plan

The first-run plan is intentionally editable. It currently balances:

- 3 strength-focused sessions plus core/posture work
- 3 primary run sessions plus a longer aerobic session
- 2 spin-bike sessions
- 1 swim/dryland swim session
- daily or near-daily flexibility
- handstand/L-sit skill work
- recovery work
- the daily Group Workout as a light warm-up/accountability item

Use **Week > Edit weekly template** to change the recurring structure. Use **Edit plan** on an individual workout for one-day exceptions.

## Backup note

Browser storage can be cleared by the user, browser, device reset or privacy settings. Until cloud sync is added, periodically use **Data > Export JSON backup**.

## Changing the plan start date

Open **Data → App settings → Plan start date**. The starter build is set to **August 26, 2026**. Dates before the selected start date are shown as **Pre-plan** and do not count as missed workouts. If you later move the start date, workouts that already contain completed or logged results are preserved.

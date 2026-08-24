# Training Plan

A personal training PWA built for a long-term training plan.

## What is included

- **Today**
  - Daily Group Workout check-in
  - Run, spin bike, strength, flexibility, swim/dryland, skill and recovery sessions
  - Expandable instructions with purpose, warm-up, main set, cooldown and completion guidance where appropriate
  - Mark complete, skip, edit, move or delete a workout
  - Log actual results separately from the planned workout
  - Filter the day by **All**, **IRONMAN**, or **Other goals**
  - Daily energy, soreness, sleep, RPE and notes

- **Week**
  - Seven-day phase-aware plan
  - Planned and actual run, bike, swim, strength and flexibility totals
  - Strength totals are derived from the exercise prescriptions, including working sets and countable rep ranges
  - Separate planned and actual time for **IRONMAN training** and **Other goals**
  - Filter the weekly calendar by training track
  - Edit the weekly template for the selected training phase
  - Progression and recovery-week scaling are applied by the plan engine

- **Progress**
  - 30-day completion percentage
  - Seven-day running and cycling totals
  - Seven-day IRONMAN versus Other-goal training time
  - Strength and flexibility completion
  - Weight and waist history
  - Pull-up, 3-mile and front-split-gap measurements
  - Eight-week run/bike volume visualization

- **Goals & phases**
  - Editable Primary, Immediate and Standard goals
  - IRONMAN 70.3 Maine 2027 as the current primary goal
  - Body composition, pull-up, 3-mile run, flexibility, handstand and L-sit goals
  - Full Ironman as the longer-term endurance goal
  - Phase timeline that distinguishes formal IRONMAN training from other training

- **Data**
  - IndexedDB local storage
  - JSON full backup and restore
  - CSV workout export with phase, plan week and training track
  - No account, API or cloud dependency
  - Ready for cloud synchronization later without changing the basic workout data model

## Coaching-plan structure

The plan is designed as a long-term system rather than one static weekly schedule.

### 2026: definition and general base

Formal IRONMAN training does not begin in 2026. The August through December blocks are classified as **Other goals** and focus on:

- strength and visible muscle definition
- gradual body-composition improvement
- general running and cycling aerobic base
- flexibility and front-split progression
- handstand and L-sit practice
- enough swim/dryland work to maintain familiarity without making triathlon the main focus

The final definition block reduces fatigue before the December milestone, followed by a transition/recovery period.

### January 2027: formal triathlon training begins

Formal **IRONMAN training** starts January 4, 2027 with a Triathlon Foundation phase. The initial emphasis is repeatability rather than peak race volume:

- swim technique and aerobic swimming
- bike consistency and cadence
- run durability
- short run-off-the-bike work
- strength maintenance
- a real weekly recovery day

The structure is informed by the user's previous coached triathlon plan: easy aerobic work first, then progressively adding technique, tempo, hills, threshold work, bricks, longer endurance sessions, mobility and deliberate recovery.

### Race-specific 70.3 block

When an exact date is entered on the Primary 70.3 goal, the app automatically works backward to create:

1. **70.3 Base**: 8 weeks
2. **70.3 Build**: 7 weeks
3. **70.3 Peak**: 3 weeks
4. **70.3 Taper**: 2 weeks
5. **Race Day**
6. **Post-Race Recovery**

Before that 20-week race-specific block, the app remains in Triathlon Base Development.

Most longer phases use three progressive weeks followed by a reduced-load recovery week. Race build and taper use their own phase-specific load pattern.

## Weekly totals and progression

Weekly totals are calculated from the workouts actually prescribed for that week, not static labels.

Examples:

- Changing a run from 3.0 to 3.5 miles changes the planned weekly run total by 0.5 mile.
- Increasing a bike from 45 to 60 minutes adds 15 minutes to the weekly bike total.
- Changing pull-ups from `3 x 6` to `3 x 8` changes the countable planned pull-up volume from 18 to 24 reps.
- Definition build weeks also progress countable strength reps, while recovery weeks reduce applicable volume. Both changes are reflected in the weekly totals.

Timed holds are counted as working sets but are not mislabeled as repetitions.

## Local storage design

The app stores data in IndexedDB under `hart-training-db`.

Key record types:

- `days`: planned sessions plus separate actual results and completion state
- `checkins`: energy, soreness, sleep, overall RPE and notes by date
- `measurements`: body and performance measurements
- `goals`: editable goals
- `phases`: fixed editable phases
- `settings`: preferences and phase-specific weekly templates

A workout keeps **planned** and **actual** data separate. Editing or logging a workout does not overwrite what was originally prescribed.

When the coaching-plan version changes, recorded workouts are preserved while unrecorded future days can be regenerated from the current plan engine.

## Editing the plan

There are two useful levels of editing:

- **One-day change**: edit a workout from Today or Week and keep the change only on that date.
- **Phase template change**: open **Week > Edit weekly template**. This edits the recurring week for that training phase. The plan engine still applies progression and recovery-week scaling to future unrecorded weeks.

Every workout also has a **Training track** field:

- `IRONMAN training`
- `Other goals`

This can be changed manually when a session serves a different purpose than the default plan.

## Changing the plan start date

Open **Data > App settings > Plan start date**. The starter build is set to **August 26, 2026**. Dates before the selected start date are shown as **Pre-plan** and do not count as missed workouts. If the start date is moved later, workouts that already contain completed or logged results are preserved.

## Rebuilding the future plan

Open **Data > Coaching plan > Rebuild future plan** after making a major goal, race-date or template change.

Completed, skipped or logged workouts are preserved. Only unrecorded plan days are regenerated.

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

1. Upload or copy all files in this folder to the repository root, overwriting the previous app files.
2. Commit and push the changes.
3. GitHub Pages will serve the updated files from the configured branch.
4. On iPhone, open the GitHub Pages URL in Safari once after deployment so the service worker can update.

No build process is required.

## Main files

- `index.html`: app shell, pages and dialogs
- `styles.css`: mobile-first dark green/blue/orange interface
- `app.js`: application UI and interactions
- `db.js`: IndexedDB storage, migration, goals, plan generation and backup/restore helpers
- `plan.js`: coaching phases, workout library, progression, recovery logic and training-track rules
- `sw.js`: offline cache and update-aware service worker
- `manifest.webmanifest`: installable PWA metadata
- `icon.svg`, `icon-192.png`, `icon-512.png`: app icons

## Backup note

Browser storage can be cleared by the user, browser, device reset or privacy settings. Until cloud sync is added, periodically use **Data > Export JSON backup**.

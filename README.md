# freshers-pick

> A real-time, fair-rotation classroom Q&A student picker built with React, TypeScript, and Supabase.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Application Structure](#application-structure)
3. [Database Schema](#database-schema)
4. [The Picker Algorithm](#the-picker-algorithm)
5. [Cycle & Queue State Machine](#cycle--queue-state-machine)
6. [Scenarios & Edge Cases](#scenarios--edge-cases)
7. [Gender Filter Logic](#gender-filter-logic)
8. [Games Feature](#games-feature)
9. [Students Page](#students-page)
10. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + Vanilla CSS |
| Animations | Framer Motion |
| Backend / Database | Supabase (PostgreSQL + Auth) |
| Routing | React Router v6 |
| Icons | Lucide React |

---

## Application Structure

The app has five pages, all protected behind Supabase email/password auth:

| Route | Page | Purpose |
|---|---|---|
| `/` | **Dashboard** | Main student picker — reveal, confirm, mark absent |
| `/students` | **Students** | View roster, toggle individual presence, bulk sync attendance, add students |
| `/history` | **History** | Per-cycle pick history log |
| `/games` | **Games** | Create and manage pre-picked game cohorts |
| `/settings` | **Settings** | Reset cycle, clear history, upload/replace CSV roster |

---

## Database Schema

### `students`
```sql
id         uuid PRIMARY KEY DEFAULT uuid_generate_v4()
course     text NOT NULL          -- e.g. "BCA", "MCA"
name       text NOT NULL
gender     text                   -- 'male' | 'female' | NULL
email      text
image_file text                   -- storage URL/path to profile photo
present    boolean DEFAULT true   -- attendance toggle for the current session
created_at timestamptz
```

### `app_state` *(singleton — always exactly one row)*
```sql
id            uuid PRIMARY KEY
current_cycle integer DEFAULT 0   -- 0 = fresh/unstarted; 1+ = active cycle number
queue         jsonb   DEFAULT '[]' -- ordered array of student UUIDs remaining to be picked
updated_at    timestamptz
```

> **Important:** `app_state` must always have exactly one row. The schema auto-inserts one on first run. `saveAppState` uses the cached row ID (not a wildcard filter) to guarantee safe single-row updates.

### `history`
```sql
id           uuid PRIMARY KEY
student_id   uuid REFERENCES students(id) ON DELETE CASCADE
cycle_number integer NOT NULL    -- which cycle this pick belongs to
student_name text NOT NULL       -- denormalised — preserved if student is later deleted
course       text NOT NULL
selected_at  timestamptz
```

### `games`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
description text
created_at  timestamptz
```

### `game_students` *(join table)*
```sql
id         uuid PRIMARY KEY
game_id    uuid REFERENCES games(id)    ON DELETE CASCADE
student_id uuid REFERENCES students(id) ON DELETE CASCADE
role       text DEFAULT 'primary'       -- 'primary' | 'substitute'
position   integer DEFAULT 0           -- display/reveal order
created_at timestamptz
UNIQUE(game_id, student_id)
```

All five tables use Row Level Security (RLS) with a single policy per table:
> **Authenticated users have full read/write access.**

---

## The Picker Algorithm

Core logic lives in [`src/services/pickerService.ts`](src/services/pickerService.ts).

### How the queue works

The algorithm maintains a **shuffled queue** (`app_state.queue`) of student UUIDs. Every reveal pulls students from this queue in order. When the queue empties, either a new shuffled queue is built automatically (auto-cycle enabled) or the system stops and reports exhaustion (auto-cycle disabled).

---

### `checkWillCycle(gender)`

Called before every reveal when auto-cycle is **enabled**. Returns `true` if the next reveal would trigger a new cycle (so the UI can show a warning).

```
current_cycle === 0  →  false  (fresh start, not a rollover)
queue is empty       →  true
queue has no gender-matching students left  →  true
otherwise            →  false
```

---

### `revealNextBatch(criteria, subCount)`

**Inputs:**

| Param | Type | Meaning |
|---|---|---|
| `criteria.count` | `number` | How many primary students to pick |
| `criteria.gender` | `'male' \| 'female' \| 'mixed'` | Gender filter |
| `subCount` | `number` | How many substitute/reserve students to pick |

**Returns:**

```ts
{
  primaries:      Student[],   // the main picks
  substitutes:    Student[],   // reserve picks (used if a primary is absent)
  queueExhausted: boolean,     // true = stopped early because auto-cycle is off
  finalQueue:     string[]     // the queue after picks are removed (used by confirmSelection)
}
```
Returns `null` if there are zero present students.

**Step-by-step:**

1. **Load state** — Fetch `app_state` (queue + cycle) and all present students.
2. **Compute `totalNeeded`** — `Math.min(count + subCount, genderMatchingStudents.length)`.  
   Capped against the **gender-filtered** count, not total students.
3. **Outer while loop** — Runs until `picked.length >= totalNeeded`:
   - **Queue empty?**
     - `cycle === 0`: Always build the first queue (Fisher-Yates shuffle of all student IDs), set `cycle = 1`. The auto-cycle flag does NOT block this — first-run must always work.
     - `cycle > 0` AND `VITE_DISABLE_AUTO_CYCLE_INCREMENT=1`: Set `queueExhausted = true`, break.
     - `cycle > 0` AND auto-cycle enabled: Shuffle all student IDs into a new queue, increment cycle by 1.
   - **Inner while loop** — Walk queue left to right:
     - Student matches gender filter AND not already in `picked[]` → add to `picked`, remove from queue.
     - Otherwise → skip (advance index, do not remove).
   - **No-progress guard**: If a full inner pass picked nothing and the queue length didn't change:
     - `picked.length >= genderMatchingStudents.length` → impossible to fulfil, break.
     - Otherwise → force `queue = []` to trigger a rebuild on next outer iteration.
4. **Persist queue** — Save the now-shorter queue to `app_state`.
5. **Split result** — `primaries = picked[0..count-1]`, `substitutes = picked[count..totalNeeded-1]`.

---

### `confirmSelection(selectedStudents, unusedSubstitutes, snapshotQueue?)`

Called after the teacher clicks **Confirm** on the Dashboard.

1. **Write history** — Insert one `history` row per confirmed primary student, tagged with `current_cycle`.
2. **Return unused substitutes to queue** — If substitutes were on standby but nobody was absent, their IDs are prepended to the **front** of the queue (priority next pick).  
   Uses `snapshotQueue` (the post-reveal queue state returned by `revealNextBatch`) to avoid stale reads — deduplication prevents double-entries if the queue was concurrently modified.

---

## Cycle & Queue State Machine

```mermaid
stateDiagram-v2
    [*] --> Fresh : App start / Cycle reset

    state Fresh {
        note right of Fresh
            current_cycle = 0
            queue = []
        end note
    }

    Fresh --> Cycle1 : First reveal\n→ queue built, cycle set to 1

    state Cycle1 {
        note right of Cycle1
            current_cycle = 1
            queue = [shuffled IDs]
        end note
    }

    Cycle1 --> Cycle1 : Each pick (queue shrinks)
    Cycle1 --> QueueEmpty : All students picked

    state QueueEmpty {
        note right of QueueEmpty
            current_cycle = 1
            queue = []
        end note
    }

    QueueEmpty --> Cycle2 : Next reveal\n(auto-cycle ON)\n→ queue rebuilt, cycle → 2
    QueueEmpty --> Stopped : Next reveal\n(auto-cycle OFF)\n→ queueExhausted = true\ncycle stays at 1

    Cycle2 --> Cycle2 : Each pick
    Cycle2 --> QueueEmpty2 : All students picked again

    Stopped --> Fresh : Teacher resets cycle manually

    Fresh --> [*]
    Cycle1 --> Fresh : Manual reset (cycle → 0, queue → [])
    Cycle2 --> Fresh : Manual reset
```

### State reference table

| State | `current_cycle` | `queue` | Meaning |
|---|---|---|---|
| **Fresh / Reset** | `0` | `[]` | No cycle started. First reveal will build queue and set cycle to 1. Dashboard shows **"Starting..."** |
| **Active** | `≥ 1` | `[...ids]` | Picks are being drawn. Dashboard shows **"Cycle N"** |
| **Exhausted, auto ON** | `N` | `[]` | Queue ran out. Next reveal auto-builds new queue and increments cycle. |
| **Exhausted, auto OFF** | `N` | `[]` | Queue ran out. Next reveal returns `queueExhausted: true`. Cycle does NOT increment. Teacher must reset manually. |

---

## Scenarios & Edge Cases

### Scenario 1 — First pick ever (fresh state)

1. `current_cycle = 0`, `queue = []`.
2. Teacher sets count, optional gender filter, optional substitute count, clicks **Reveal**.
3. `revealNextBatch` detects `cycle === 0` → Fisher-Yates shuffles all present student IDs into a new queue → sets `current_cycle = 1`.
4. Students are pulled from the new queue. Dashboard header changes from **"Starting..."** to **"Cycle 1"**.
5. Teacher reviews, optionally marks someone absent, clicks **Confirm** → history is written.

---

### Scenario 2 — Queue runs out, auto-cycle ON (default)

1. Last students in the queue are picked. `queue = []`, `current_cycle = 1`.
2. Teacher clicks **Reveal** again.
3. `checkWillCycle()` returns `true` → Dashboard shows a **Cycle Warning Modal**:  
   *"Starting Cycle 2 — everyone has been picked once. Continue?"*
4. Teacher clicks **Start Cycle 2** → `doReveal()` runs.
5. New shuffled queue is built, `current_cycle = 2`. Picks proceed normally.

---

### Scenario 3 — Queue runs out, auto-cycle OFF (`VITE_DISABLE_AUTO_CYCLE_INCREMENT=1`)

1. Last students in the queue are picked. `queue = []`, `current_cycle = 1`.
2. Teacher requests 5 more students. Only 3 were left before exhaustion.
3. `checkWillCycle()` is **skipped** (no warning modal — no rollover will happen).
4. `revealNextBatch` sees `queue = []` and `cycle > 0` with the flag set → `queueExhausted = true`, returns the 3 students that were picked.
5. Dashboard shows toast: *"Only 3 students left in queue (requested 5) — queue exhausted."*
6. `current_cycle` stays at `1`. The cycle does **not** increment.
7. Teacher must go to **Settings → Reset Cycle** to start fresh (sets `cycle = 0, queue = []`).

---

### Scenario 4 — Student marked absent mid-selection (Dashboard)

1. Teacher reveals 3 primaries + 1 substitute.
2. Student A (primary) is absent. Teacher clicks the **X / Mark Absent** button.
3. Atomically:
   - Student A's `present` is set to `false` in Supabase.
   - Student A's ID is **prepended to the front of the queue** — they will be prioritised when they return.
   - The first substitute is promoted into Student A's primary slot.
   - Substitute list shrinks by 1.
   - Toast: *"Student A marked absent — Student B substituted in."*
4. Teacher clicks **Confirm** → Student B (now primary) goes to history. No history entry for Student A.

---

### Scenario 5 — Student marked absent, no substitutes available

1. Teacher reveals 2 primaries, subCount = 0.
2. Student A (primary) is absent. Teacher clicks **Mark Absent**.
3. Student A is marked absent and returned to the front of the queue.
4. Toast: *"Student A marked absent. No more substitutes."*
5. The final selection has 1 fewer student. Teacher confirms with 1 primary.

---

### Scenario 6 — Requesting more students than are present

- 30 students enrolled, 8 are present today.
- Teacher requests 10 primaries.
- `totalNeeded = min(10, 8) = 8`. All 8 present students are picked.
- Toast: *"Only 8 present students available (requested 10)."*

---

### Scenario 7 — Unused substitutes returned to queue

1. Teacher reveals 3 primaries + 2 substitutes (Sub1, Sub2). Nobody is absent.
2. Teacher clicks **Confirm**.
3. `confirmSelection` prepends `[Sub1.id, Sub2.id]` to the front of the queue.
4. On the next reveal, Sub1 and Sub2 are picked first — compensating for their standby time.

---

### Scenario 8 — Cycle reset

1. Teacher goes to **Settings → Reset Cycle**.
2. `resetStateAndCycle()` writes `{ current_cycle: 0, queue: [] }` to `app_state`.
3. Dashboard header shows **"Starting..."** again.
4. Next reveal rebuilds queue from scratch.
5. **History is preserved** — past pick records are not affected.
6. `VITE_DISABLE_CYCLE_UPDATE=1` disables this button globally.

---

### Scenario 9 — CSV roster upload (replaces all students)

1. Teacher goes to **Settings → Upload Roster** (disabled if `VITE_DISABLE_CSV_UPLOAD=1`).
2. CSV must have columns: `course`, `name`. Optional: `image-file`.
3. All existing students are **deleted** (cascades to `history` and `game_students`).
4. New students are inserted, all `present = true`.
5. `resetStateAndCycle()` is called automatically.
6. **Warning:** All existing games lose their student assignments due to the cascade delete.

---

## Gender Filter Logic

The picker supports three gender modes: `mixed` (default), `male`, `female`.

### Queue traversal with gender filter

- Only students matching the filter are picked from the queue.
- Non-matching students are **skipped but remain in the queue** — their relative position is preserved for future mixed picks.
- `totalNeeded` is capped against the gender-filtered student count, not total present students. If only 5 females are present and you request 10 females, `totalNeeded = 5`.

### What happens when the gender filter exhausts its matching students

If a full queue traversal picks nothing because all gender-matching students have already been picked:
- The queue is forcibly cleared to trigger a rebuild on the next outer loop iteration.
- If `VITE_DISABLE_AUTO_CYCLE_INCREMENT=1`: `queueExhausted = true` is returned instead of rebuilding.

### `checkWillCycle` and gender

`checkWillCycle(gender)` checks whether the current queue has **any** remaining students matching the requested gender. If a teacher picks females exclusively, the warning can trigger even if the queue still has many male students remaining — because those won't be picked.

---

## Games Feature

Games are pre-picked cohorts assigned to group activities. They draw from the same central queue as the Dashboard but are tracked separately.

### Creating a game

1. Teacher clicks **New Game** → sets: name, description, primary count, substitute count, gender filter.
2. `createGame()` creates the game record. Then `revealNextBatch()` picks students.
3. Picked students are saved to `game_students` as `primary` or `substitute`.
4. Those students are **removed from the main `app_state` queue** — they cannot be picked twice in the same cycle across Dashboard and Games.
5. If the queue is exhausted mid-pick, a toast warns the teacher and the game is created with fewer students than requested. If `revealNextBatch` returns null (zero present students), the game record is deleted immediately (no orphans).

> **Note:** Game picks do **not** write to `history`. Only Dashboard confirms write history.

### Playing a game (PlayModal)

1. `fetchGameStudents` loads only `present = true` students from `game_students` — absent students are filtered out via an `!inner` join.
2. A shuffle animation plays (Fisher-Yates on names), then students are revealed one-by-one.
3. During reveal, marking a student absent:
   - Sets `present = false` in Supabase.
   - Promotes the first substitute into the primary slot (immutably — creates a new object).
   - Updates `game_students` in Supabase via `saveStudentsToGame`.
   - The animation does **not restart** — a `phaseRef` guards the `useEffect` dependency.
4. The `primariesCountRef` tracks the live primary count inside the reveal interval, preventing a stale closure from stopping the animation at the wrong index.

### Game vs. Dashboard comparison

| | Dashboard | Games |
|---|---|---|
| Draws from central queue? | ✅ | ✅ |
| Writes to `history`? | ✅ (on Confirm) | ❌ |
| Filters absent students? | ✅ (fetchActiveStudents) | ✅ (inner join filter on play) |
| Mark absent mid-session? | ✅ | ✅ |
| Returns absent student to queue? | ✅ (prepend to queue) | ❌ (game-local only) |

---

## Students Page

The `/students` page manages the roster and daily attendance.

### Per-student toggle

Click the **Present / Absent** badge next to a student to toggle their attendance. The UI updates optimistically immediately; if the Supabase write fails, it re-syncs from the database.

### Bulk sync attendance (`syncAttendance`)

The **Sync Attendance** button applies a smart bulk toggle:

| Current state | Action |
|---|---|
| All present | Set all **absent** |
| All absent | Set all **present** |
| Majority present (or exact tie) | Set all **present** |
| Majority absent | Set all **absent** |

A single bulk `UPDATE` is sent to Supabase — no per-row round trips.

### Adding a single student

Click **Add Student** → enter name and course. The new student is inserted with `present = true` and appears in the sorted roster. This does **not** reset the cycle — the student is not in the current queue until the next cycle reset.

---

## Environment Variables

Create a `.env` file at the project root. All variables are prefixed with `VITE_`.

### Required

| Variable | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public API key | `eyJhbGciOi...` |

> If either is missing, the app **throws on startup** with a clear error rather than failing silently at runtime.

### Feature Flags *(all optional, default = feature enabled)*

| Variable | Set to | Effect |
|---|---|---|
| `VITE_DISABLE_AUTO_CYCLE_INCREMENT` | `'1'` | Stops the picker at the queue boundary. Does **not** auto-build a new cycle when queue empties. Returns `queueExhausted: true`. Dashboard shows a toast warning instead of cycling. The first-run queue (cycle 0 → 1) is **always** allowed regardless of this flag. |
| `VITE_DISABLE_CYCLE_UPDATE` | `'1'` | Greys out and disables the **Reset Cycle** button in Settings. |
| `VITE_DISABLE_CSV_UPLOAD` | `'1'` | Greys out and disables the CSV upload field in Settings. |
| `VITE_DISABLE_RESET_HISTORY` | `'1'` | Greys out and disables the **Clear History** button in Settings. |

> **Convention:** All flags are checked with `=== '1'`. A missing variable, empty string, or any value other than `'1'` means the feature is **on** (not disabled). This is consistent across every flag in the codebase.

### Example `.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Uncomment to restrict features (useful for shared/classroom deployments):
# VITE_DISABLE_AUTO_CYCLE_INCREMENT=1
# VITE_DISABLE_CYCLE_UPDATE=1
# VITE_DISABLE_CSV_UPLOAD=1
# VITE_DISABLE_RESET_HISTORY=1
```

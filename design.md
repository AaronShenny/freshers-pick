# picker — Design System

A minimal, dark-first design system built for clarity and focus. Inspired by calm, typographic interfaces.

---

## Philosophy

> **Less chrome. More content.**

The UI should disappear. The teacher should only notice the student's name, not the interface. Every element earns its place.

- **Dark by default** — not a theme, it's the base
- **Typography-led** — hierarchy through type, not color
- **Breathing room** — generous whitespace, no cramming
- **Alive without noise** — subtle motion, no glowing gradients

---

## Color

All colors are raw hex values. No opacity tricks for primary surfaces — layers are defined by distinct stops.

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#0d0d0d` | App background |
| `bg-panel` | `#111111` | Cards, panels |
| `bg-hover` | `#141414` | Row hover, subtle lift |
| `bg-raised` | `#1a1a1a` | Inputs, code blocks |
| `border` | `#1e1e1e` | Panel borders |
| `border-subtle` | `#161616` | Row dividers |
| `text-primary` | `#f5f5f5` | Main text, names |
| `text-secondary` | `#888888` | Labels, metadata |
| `text-muted` | `#555555` | Timestamps, roll numbers |
| `text-dim` | `#444444` | Section headers, eyebrows |
| `text-ghost` | `#333333` | Placeholder, empty state |
| `accent-white` | `#ffffff` | Primary button fill |
| `accent-green` | `#4ade80` | Present badge text |
| `accent-red` | `#f87171` | Absent badge text, danger |

---

## Typography

Two fonts. One job each.

### DM Serif Display — Display / Headings
Used for page titles and the student reveal. Gives the app personality and a sense of occasion.

```
font-family: 'DM Serif Display', serif;
```

| Usage | Size | Weight |
|---|---|---|
| Student reveal name | `4rem` (64px) | Regular (400) |
| Page title | `1.875rem` (30px) | Regular (400) |

### Inter — UI / Body
Used for everything else. Clean, neutral, legible at small sizes.

```
font-family: 'Inter', sans-serif;
```

| Usage | Size | Weight |
|---|---|---|
| Body / table rows | `0.875rem` (14px) | Medium (500) |
| Labels, badges | `0.75rem` (12px) | Medium (500) |
| Eyebrows / metadata | `0.75rem` (12px) | Medium (500), tracked wide |
| Monospace (roll no) | `0.75rem` (12px) | font-mono |

**Eyebrow pattern** — Used above every page title:
```
text-[#444] text-xs uppercase tracking-widest font-medium
```
Example: `CYCLE 3` above "Who's next?"

---

## Spacing

Based on an **8px grid**. Panels use 16px borders. Content uses 20px horizontal padding.

| Token | Value | Usage |
|---|---|---|
| `p-5` / `px-5` | 20px | Panel internal padding |
| `py-3.5` | 14px | Table row height |
| `gap-8` | 32px | Section gaps |
| `gap-4` | 16px | Intra-section gaps |
| `gap-3` | 12px | Tight component gaps |

---

## Components

### Panel
The primary container. Used for all cards and data surfaces.

```css
background: #111111;
border: 1px solid #1e1e1e;
border-radius: 16px;
```

Hover variant adds:
```css
transition: border-color 0.2s, background 0.2s;
:hover { border-color: #2e2e2e; background: #161616; }
```

### Primary Button
White fill, black text. Used for the main action (Reveal Student).

```css
background: #ffffff;
color: #000000;
border-radius: 12px;
padding: 14px 0;
font-weight: 600;
font-size: 14px;
transition: background 0.2s;
:hover { background: #e8e8e8; }
:active { transform: scale(0.99); }
```

### Secondary / Ghost Button
Used for non-destructive secondary actions (Reset Cycle).

```css
background: #1a1a1a;
border: 1px solid #222;
color: #888;
border-radius: 8px;
:hover { color: #fff; border-color: #333; background: #222; }
```

### Danger Button
Used for destructive actions (Clear History).

```css
background: rgba(239, 68, 68, 0.08);
border: 1px solid rgba(239, 68, 68, 0.15);
color: #f87171;
:hover { background: rgba(239, 68, 68, 0.12); }
```

### Nav Link (Sidebar)
```
Inactive: text-[#666], hover → text-[#eee] + bg-[#161616]
Active:   bg-white, text-black
```

### Status Badge (Present / Absent)

```css
/* Present */
background: rgba(74, 222, 128, 0.08);
color: #4ade80;
border: 1px solid rgba(74, 222, 128, 0.2);

/* Absent */
background: rgba(239, 68, 68, 0.08);
color: #f87171;
border: 1px solid rgba(239, 68, 68, 0.15);

border-radius: 9999px;
padding: 2px 12px;
font-size: 12px;
font-weight: 500;
```

### Text Input

```css
background: #111111;
border: 1px solid #1e1e1e;
border-radius: 12px;
padding: 12px 16px;
color: #f5f5f5;
font-size: 14px;
:focus { border-color: #444; background: #141414; }
::placeholder { color: #333; }
```

---

## Layout

### App Shell
```
sidebar (w-56) | main content (flex-1)
```

- Sidebar: `border-r border-[#1a1a1a]`, `py-8 px-4`
- Main: `max-w-4xl mx-auto py-10 px-8`

### Dashboard Grid
```
[  Reveal Card  (3/5)  ] [  Recent Picks  (2/5)  ]
```

---

## Motion

Minimal. Purposeful. Never decorative.

| Event | Animation |
|---|---|
| Page load | `fadeUp` — `opacity 0→1`, `y 12→0`, 400ms ease |
| Student reveal | Spring — `stiffness: 300, damping: 30` |
| Spinner (selecting) | `FlickerSpinner` — custom SVG dot pattern |
| Idle state | `dotPulse` — 3 dots, 1.5s staggered loop |
| Row hover | `background` transition, 150ms |
| Button press | `scale(0.99)`, 100ms |

**No glows. No blurs. No floating elements.**

---

## Loader — FlickerSpinner

A custom SVG animation used as the loading state for the reveal. Uses CSS keyframes that simulate a flickering binary dot pattern. Colors:

```
--on:  #F5F5F5  (lit dot)
--off: #404040  (dim dot)
--dur: 1.950s
```

Used in two sizes:
- `size={36}` — page loading
- `size={48}` — during reveal suspense

---

## Iconography

**Lucide React** — `strokeWidth={1.8}` for inactive, `strokeWidth={2.5}` for active nav.

Icons used:
- `LayoutDashboard` — Pick page
- `Users` — Students
- `History` — History
- `Settings` — Settings
- `LogOut` — Logout
- `Upload` — CSV upload
- `RefreshCcw` — Reset cycle
- `Trash2` — Clear history

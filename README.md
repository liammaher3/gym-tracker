# Teretana

A mobile-first workout tracker for logging lifts, reviewing past sessions, and charting strength progress over time. Built with React, TypeScript, and Supabase, and installable to your phone's home screen as a PWA.

## Features

- **Workout logging** — start a session, pick exercises from a searchable library (filterable by muscle group), and log sets with weight and reps. Add your own custom exercises when the library doesn't have one.
- **Workout timer** — tracks the duration of each session.
- **Rest timer** — a countdown between sets that shows what's up next and remembers your last rest length.
- **History** — browse past workouts, view their details, rename them, edit or delete sets and exercises, or delete whole workouts. History stays reachable mid-workout without losing your active session.
- **Progress** — per-exercise charts of your top set over time, with current, best, and total change, grouped by muscle group and searchable.
- **Home stats** — workouts this week, days since your last session, and average session length.
- **Light and dark themes** — follows your device's appearance setting automatically.
- **Accounts** — email and password sign-in via Supabase Auth, so your data syncs across devices.

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) for auth and the Postgres database
- [Lucide](https://lucide.dev) icons

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/liammaher3/gym-tracker.git
   cd gym-tracker
   npm install
   ```

2. Create a `.env.local` file in the project root with your Supabase project's URL and anon key (found under **Project Settings → API**):

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Only ever use the **anon** key here, never the `service_role` key. Anything prefixed with `VITE_` is bundled into the client.

3. Create the database tables (see [Database](#database) below).

4. Start the dev server:

   ```bash
   npm run dev
   ```

### Scripts

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start the Vite dev server              |
| `npm run build`   | Type-check and build for production    |
| `npm run preview` | Preview the production build locally   |
| `npm run lint`    | Run ESLint                             |

## Database

The app expects these tables in Supabase:

| Table              | Columns                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `workouts`         | `id`, `user_id`, `name`, `notes`, `duration_seconds`, `created_at`         |
| `exercises`        | `id`, `workout_id`, `name`, `library_id`, `created_at`                     |
| `sets`             | `id`, `exercise_id`, `set_number`, `reps`, `weight`, `created_at`          |
| `exercise_library` | `id`, `name`, `equipment`, `primary_muscles`, `user_id`                    |

Rows in `exercise_library` with a null `user_id` are shared built-in exercises. Rows with a `user_id` are that user's custom exercises.

**Enable Row Level Security on every table.** The anon key is public, so RLS policies are what keep each user's data private. Users should only be able to read and write their own `workouts` (and the `exercises` and `sets` under them), and should be able to read shared library exercises plus their own custom ones.

## Project structure

```
src/
├── App.tsx               # Auth gate, tab routing, home stats
├── components/           # Tabs, logger, timers, charts, pickers
│   └── ui/               # Shared icons and decorative elements
├── lib/
│   ├── supabaseClient.ts # Supabase client setup
│   └── muscleGroups.ts   # Muscle-group filters and categorization
├── theme/useTheme.ts     # Syncs light/dark theme with the OS
└── types.ts              # Shared data types
```

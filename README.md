# SPMKita 📐

**"Duolingo for SPM"** — Gamified, AI-powered SPM preparation for Malaysian students.

## Tech Stack
- Next.js 15 + TypeScript
- Supabase (local development)
- Tailwind CSS v4
- PWA-ready (mobile-first)

---

## Prerequisites

1. **Node.js 18+** — [nodejs.org](https://nodejs.org)
2. **Docker Desktop** — Must be running (for Supabase local)
3. **Supabase CLI** — Install with:
   ```bash
   npm install -g supabase
   ```

---

## Setup Instructions

### Step 1: Clone and Install

```bash
cd spmkita
npm install
```

### Step 2: Start Docker Desktop

Make sure Docker Desktop is running. You should see the Docker icon in your taskbar.

### Step 3: Start Supabase Local

```bash
npx supabase start
```

This will pull Docker images (first time takes a few minutes) and start:
- **API**: http://localhost:54321
- **Studio**: http://localhost:54323 (database admin UI)
- **Inbucket**: http://localhost:54324 (email testing)
- **Database**: localhost:54322

After starting, it will display your keys. Copy them!

### Step 4: Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with the values from `supabase start`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-step-3>
```

### Step 5: Apply Database Migration

```bash
npx supabase db reset
```

This runs the migration in `supabase/migrations/` and seeds data from `supabase/seed/seed.sql`.

### Step 6: Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## Testing Login (Local Dev)

Since we're using Supabase local, email login works via **Inbucket** (fake email server):

1. Go to http://localhost:3000/login
2. Enter any email (e.g. `student@test.com`)
3. Click "Hantar Magic Link"
4. Open **Inbucket** at http://localhost:54324
5. Find the email, click the magic link
6. You'll be redirected to onboarding!

---

## Project Structure

```
spmkita/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated pages (with bottom nav)
│   │   │   ├── dashboard/      # Main hub
│   │   │   ├── challenge/      # Daily challenge quiz
│   │   │   ├── practice/       # Topic-based practice
│   │   │   ├── leaderboard/    # Rankings
│   │   │   └── profile/        # Student profile
│   │   ├── callback/           # Auth callback
│   │   ├── login/              # Login page
│   │   ├── onboarding/         # Onboarding wizard
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css         # Theme & colors
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   └── server.ts       # Server Supabase client
│   │   ├── constants.ts        # Malaysian states, XP rules, etc.
│   │   └── language-context.tsx # BM/EN toggle
│   └── types/
│       └── database.ts         # TypeScript types for Supabase
├── supabase/
│   ├── config.toml             # Supabase local config
│   ├── migrations/
│   │   └── 20250220000001_initial_schema.sql
│   └── seed/
│       └── seed.sql            # Subjects, topics, questions, achievements
└── public/
    └── manifest.json           # PWA manifest
```

---

## Database Overview

| Table | Purpose |
|-------|---------|
| `profiles` | Student info, XP, streaks |
| `subjects` | Mathematics, Add Maths, etc. |
| `topics` | Chapters per subject per form |
| `questions` | Bilingual MCQ questions |
| `daily_challenges` | Daily 5-question challenges |
| `practice_sessions` | Topic practice sessions |
| `question_attempts` | Individual answer tracking |
| `diagnostic_results` | Readiness score results |
| `achievements` | Achievement definitions |
| `student_achievements` | Earned achievements |
| `xp_transactions` | XP earning log |
| `student_subjects` | Subject enrollments |

**Key Functions:**
- `generate_daily_challenge()` — Creates/retrieves today's challenge
- `update_streak()` — Updates streak count with bonuses
- `add_xp()` — Logs XP transaction and updates total

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint

# Database
npx supabase start       # Start local Supabase
npx supabase stop        # Stop local Supabase
npx supabase db reset    # Reset DB + apply migrations + seed
npx supabase status      # Check running services

# Studio (Database Admin)
# Open http://localhost:54323 in browser

# Inbucket (Email Testing)
# Open http://localhost:54324 in browser
```

---

## Seed Data Included

- **1 active subject**: Mathematics (Form 1-5)
- **51 topics**: All KSSM Mathematics chapters
- **10 sample questions**: Form 1 (Rational Numbers, Algebra, Linear Equations)
- **15 achievements**: Streaks, milestones, mastery badges
- **9 subject placeholders**: For future expansion

---

## Next Steps

1. Add more questions (target: 200+ for MVP)
2. Practice session quiz flow (`/practice/[topicId]`)
3. Diagnostic quiz engine
4. AI Tutor integration (Claude API)
5. More subjects (Add Maths, Science, Sejarah)

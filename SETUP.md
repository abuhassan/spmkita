# SPMKita — Setup Guide

## Quick Start (5 minutes)

### 1. Extract the project
```bash
tar xzf spmkita-sprint1.tar.gz
cd spmkita
npm install
```

### 2. Create Supabase Project (Free Tier)
1. Go to https://supabase.com → **New Project**
2. Name: `spmkita`
3. Database password: (save this!)
4. Region: **Southeast Asia (Singapore)**
5. Wait ~2 minutes for provisioning

### 3. Get Your Keys
1. Supabase Dashboard → **Settings** → **API**
2. Copy **Project URL** (e.g. `https://abcdef.supabase.co`)
3. Copy **anon public** key

### 4. Configure Environment
Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run Database Migration
1. Supabase Dashboard → **SQL Editor** → New Query
2. Copy/paste contents of `supabase/migrations/20250220000001_initial_schema.sql`
3. Click **Run**

### 6. Seed Sample Data
1. SQL Editor → New Query
2. Copy/paste contents of `supabase/seed/seed.sql`
3. Click **Run**

### 7. Enable Auth (Email Magic Link)
1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** should be enabled by default (magic link)
3. For Google login (optional, can do later):
   - Go to Google Cloud Console → Create OAuth credentials
   - Add to Supabase → Authentication → Providers → Google

### 8. Start Development
```bash
npm run dev
```
Open http://localhost:3000

---

## What's Included (Sprint 1)

### Pages
- `/` — Landing page (marketing)
- `/login` — Auth (Google + Email magic link)
- `/onboarding` — 3-step wizard (profile → subjects → ready)
- `/dashboard` — Main hub with stats, streak, daily challenge
- `/challenge` — Placeholder (Sprint 3)
- `/practice` — Placeholder (Sprint 4)
- `/leaderboard` — Placeholder (Sprint 4)
- `/profile` — Placeholder (Sprint 4)
- `/settings` — Logout

### Database (12 tables)
- profiles, subjects, topics, questions
- student_subjects, daily_challenges, practice_sessions
- question_attempts, diagnostic_results
- achievements, student_achievements, xp_transactions

### Seed Data
- 9 subjects (only Math active for MVP)
- 55 Math topics (Form 1-5, full KSSM syllabus)
- 15 sample questions (Form 1 — Chapters 1, 5, 6)
- 15 achievements

### Features
- Supabase Auth with middleware protection
- Auto profile creation on signup (trigger)
- Streak tracking (database function)
- XP system (database function)
- Leaderboard function (school/state/national)
- Row Level Security on all tables
- Bilingual support (BM/EN)
- Mobile-first responsive design
- Bottom navigation bar

---

## Next Sprints
- **Sprint 2**: Complete onboarding with diagnostic quiz
- **Sprint 3**: Daily Challenge engine (question flow, timer, scoring)
- **Sprint 4**: Practice mode, Leaderboard, Profile/Achievements
- **Sprint 5**: Content (200+ questions), PWA, polish

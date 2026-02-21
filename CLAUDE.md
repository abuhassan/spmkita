# SPMKita — Claude Code Project Guide

## What is this?
SPMKita is a gamified, AI-powered SPM (Sijil Pelajaran Malaysia) preparation platform targeting 2M+ Malaysian secondary school students (Form 1-5). Think "Duolingo for SPM". Built by Abu.

## Tech Stack
- **Framework**: Next.js 15 (App Router, src/ directory)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-based — uses `@import "tailwindcss"` in globals.css, NO tailwind.config.ts)
- **Database**: Supabase (cloud, free tier, Singapore region)
- **Auth**: Supabase Auth (Google OAuth + Email magic link)
- **Packages**: @supabase/supabase-js v2.97, @supabase/ssr v0.6.1
- **Deployment**: Vercel (later)

## Critical: Tailwind v4
This project uses Tailwind v4 which is CSS-based. There is NO tailwind.config.ts file.
- `src/app/globals.css` must start with `@import "tailwindcss";`
- Do NOT use `@tailwind base/components/utilities` directives
- Do NOT create tailwind.config.ts

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (public)
│   ├── globals.css             # Tailwind v4 + custom styles
│   ├── login/page.tsx          # Auth page (Google + magic link)
│   ├── auth/callback/route.ts  # OAuth callback handler
│   ├── onboarding/page.tsx     # 3-step wizard (profile → subjects → ready)
│   └── (protected)/            # Auth-required routes
│       ├── layout.tsx          # Bottom navigation bar
│       ├── dashboard/page.tsx  # Main hub (stats, streak, daily challenge)
│       ├── challenge/page.tsx  # Daily challenge (5 questions)
│       ├── practice/page.tsx   # Topic-based practice
│       ├── leaderboard/page.tsx
│       ├── profile/page.tsx
│       └── settings/page.tsx   # Logout
├── lib/
│   ├── supabase-client.ts      # Browser Supabase client
│   ├── supabase-server.ts      # Server Supabase client
│   ├── supabase-middleware.ts   # Middleware auth helper
│   └── constants.ts            # XP values, streak rules, encouragements
├── types/
│   └── database.ts             # TypeScript types for all tables
└── middleware.ts                # Route protection
```

## Database (Supabase — already set up with data)
12 tables with RLS policies enabled:

**Reference tables** (public read):
- `subjects` — 9 subjects (only MATH active for MVP)
- `topics` — 55 Math topics across Form 1-5 (KSSM syllabus)
- `questions` — 15 sample MCQ questions (Form 1, bilingual BM/EN)
- `achievements` — 15 achievement definitions

**User tables** (own data only via RLS):
- `profiles` — extends auth.users with form_level, school, state, xp, streak
- `student_subjects` — enrolled subjects
- `daily_challenges` — daily 5-question challenges
- `practice_sessions` — topic practice sessions
- `question_attempts` — every answer recorded
- `diagnostic_results` — readiness scores
- `student_achievements` — earned achievements
- `xp_transactions` — XP history

**Database functions**:
- `handle_new_user()` — trigger: auto-creates profile on signup
- `update_streak(p_student_id)` — manages daily streak logic
- `add_xp(p_student_id, p_amount, p_source)` — adds XP and records transaction
- `get_leaderboard(p_scope, p_state, p_school, p_limit)` — ranked leaderboard

## Auth Flow
1. User visits `/login`
2. Signs in via Google OAuth or Email magic link
3. Supabase trigger auto-creates profile in `profiles` table
4. Auth callback at `/auth/callback` checks `onboarding_completed`
5. If not completed → redirect to `/onboarding`
6. If completed → redirect to `/dashboard`
7. Middleware protects all routes except `/`, `/login`, `/auth/*`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Design System
- **Primary**: Purple (#7C3AED)
- **Success/Correct**: Green (#10B981)
- **XP/Gold**: Amber (#FBBF24)
- **Error/Wrong**: Red (#EF4444)
- **Background**: White (#FFFFFF)
- **Text**: Dark (#1E1B4B)
- **Mobile-first**: max-w-md centered, bottom navigation bar
- **Personality**: Encouraging, Malaysian slang OK ("Mantap!", "Gempak!", "Power la!")
- **Bilingual**: All content in BM and EN, toggle via preferred_language

## Gamification Rules
| Action | XP |
|---|---|
| Daily challenge complete | +50 |
| Daily perfect (5/5) | +100 bonus |
| Practice correct (easy) | +10 |
| Practice correct (hard) | +20 |
| 7-day streak | +200 |
| 30-day streak | +1000 |
| Achievement unlock | varies |

Streak rules: Complete 1 daily challenge to maintain. Resets at midnight MYT (UTC+8).

## Current Status
- ✅ Landing page (bright white + purple theme)
- ✅ Database schema + seed data deployed to Supabase
- ❌ Login page broken (webpack error with @supabase/ssr)
- ❌ Auth flow not tested
- ❌ Onboarding wizard not tested
- ❌ Dashboard not tested
- ❌ Challenge engine not built (placeholder)
- ❌ Practice page not built (placeholder)
- ❌ Leaderboard not built (placeholder)
- ❌ Profile page not built (placeholder)

## Immediate Priority
1. Fix Supabase client setup — resolve @supabase/ssr compatibility with Next.js 15
2. Get login → auth callback → onboarding → dashboard flow working
3. Build Daily Challenge engine (Sprint 3)

## Malaysian Context
- SPM = Malaysian national exam taken in Form 5
- Students prepare from Form 1 (age 13) to Form 5 (age 17)
- BM = Bahasa Melayu (national language)
- KSSM = current national curriculum
- Malaysian states used for leaderboard segmentation
- WhatsApp is primary messaging platform

# SPMKita — Claude Code Project Guide

## What is this?
SPMKita is a gamified, AI-powered SPM preparation platform that replaces traditional tuition for Malaysian secondary school students (Form 1-5). Think "Duolingo meets tuition" — structured weekly lessons, practice, quizzes, plus a parent portal. Built by Abu.

## Tech Stack
- **Framework**: Next.js 15 (App Router, src/ directory)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-based — uses @import "tailwindcss" in globals.css, NO tailwind.config.ts)
- **Database**: Supabase (cloud, free tier, Singapore region)
- **Auth**: Supabase Auth (Google OAuth + Email magic link)
- **Packages**: @supabase/supabase-js v2.97, @supabase/ssr v0.6.1
- **Deployment**: Vercel at https://spmkita.vercel.app

## Critical: Tailwind v4
This project uses Tailwind v4 which is CSS-based. There is NO tailwind.config.ts file.
- globals.css must start with @import "tailwindcss";
- Do NOT use @tailwind base/components/utilities directives
- Do NOT create tailwind.config.ts

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (public)
│   ├── globals.css             # Tailwind v4 + custom styles
│   ├── login/page.tsx          # Auth page
│   ├── auth/callback/route.ts  # OAuth callback handler
│   ├── onboarding/page.tsx     # 3-step wizard
│   └── (protected)/            # Auth-required routes
│       ├── layout.tsx          # Bottom navigation bar
│       ├── dashboard/page.tsx  # Main hub
│       ├── challenge/page.tsx  # Daily challenge (DONE)
│       ├── practice/page.tsx   # Topic practice (DONE)
│       ├── learn/page.tsx      # Learning path (NEW)
│       ├── learn/[topicId]/page.tsx         # Topic lessons
│       ├── learn/[topicId]/lesson/[id]/page.tsx  # Lesson viewer
│       ├── learn/[topicId]/quiz/page.tsx    # Weekly quiz
│       ├── leaderboard/page.tsx (DONE)
│       ├── profile/page.tsx     (DONE)
│       └── settings/page.tsx
├── lib/
│   ├── supabase-client.ts
│   ├── supabase-server.ts
│   └── constants.ts
├── types/
│   └── database.ts
└── middleware.ts
```

## Database Tables

### Existing (Sprint 1-5)
- subjects, topics, questions, achievements, profiles
- student_subjects, daily_challenges, practice_sessions
- question_attempts, diagnostic_results, student_achievements, xp_transactions

### NEW Phase A Tables (already migrated)
- lessons — structured lesson content with JSON content blocks
- lesson_progress — student completion tracking per lesson
- weekly_quizzes — end-of-topic quizzes
- quiz_attempts — quiz results
- study_time_log — daily study time
- parent_profiles, parent_children, weekly_reports, learning_goals

### Lesson Content Block Types (JSON array in content_en/content_bm)
- objective: {type, text}
- concept: {type, title, text}
- formula: {type, formula, note}
- worked_example: {type, question, steps[]}
- quick_check: {type, question, options[], correct (index), explanation}
- summary: {type, points[]}
- practice_intro: {type, text}
- quiz_intro: {type, text}

## Current Phase: Phase A — Learning Path

### Build these pages:

1. /learn — Weekly learning schedule by topic, filter by Form, show progress
2. /learn/[topicId] — Topic detail with sequential lessons list
3. /learn/[topicId]/lesson/[id] — Lesson viewer rendering content blocks step by step
4. /learn/[topicId]/quiz — Weekly topic quiz
5. Update bottom nav: replace Practice with 📖 Belajar -> /learn
6. Update dashboard: add "Continue Learning" card

### Content Block Styling
- objective: bg-purple-50 border-purple-200, 🎯 icon
- concept: bg-white shadow-sm, bold title, preserve newlines
- formula: bg-amber-50 border-amber-300, 📐 icon, large mono text
- worked_example: white card, blue question box, numbered steps
- quick_check: interactive MCQ, green/red feedback, must answer to proceed
- summary: bg-purple-50 border-purple-200, 📝 icon, bullet points

### XP Awards
- Complete lesson: +30 XP
- Complete all topic lessons: +50 bonus
- Pass weekly quiz: +50 XP
- Perfect quiz (100%): +100 bonus

### Seeded Data Available
Form 1 Math lessons exist for:
- Chapter 1 (Rational Numbers): 5 lessons
- Chapter 5 (Algebraic Expressions): 5 lessons
- Chapter 6 (Linear Equations): 5 lessons

## Design System
- Primary: Purple #7C3AED
- Success: Green #10B981
- XP/Gold: Amber #FBBF24
- Error: Red #EF4444
- Background: White
- Mobile-first, max-w-md centered, bottom nav bar
- Bilingual: read preferred_language from profile (bm/en)
- Encouragement: "Mantap! 💪", "Betul! 🎯", "Gempak! 🔥"

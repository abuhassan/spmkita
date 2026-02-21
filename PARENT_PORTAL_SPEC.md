# SPMKita Parent Portal — Build Spec

## Overview
Parents can sign up, link to their children via invite code, and monitor learning activity. This is the key sales differentiator vs traditional tuition.

## Database Tables (ALREADY EXIST from migration_phase_a.sql)
- `parent_profiles` — parent accounts (user_id, phone, notification_preferences)
- `parent_children` — parent-child links (parent_id, child_id, invite_code, status: pending/active/revoked)
- `weekly_reports` — auto-generated reports (student_id, report_data jsonb)
- `learning_goals` — parent-set goals (student_id, goal_type, target_value, current_value)
- `study_time_log` — daily study minutes per student
- `profiles` table already has `invite_code` column (auto-generated via trigger)

## What to Build

### 1. Onboarding Update — Role Selection
File: `src/app/(protected)/onboarding/page.tsx`
- Add Step 0 BEFORE current steps: "I am a..." → Student / Parent
- If Student: continue existing onboarding flow (name, school, form, subject)
- If Parent: skip to parent onboarding (name, phone, enter child's invite code)
- Store role in profiles table (add `role` column if needed, default 'student')

### 2. Parent Onboarding Flow
After selecting "Parent" role:
- Step 1: Display name, phone number
- Step 2: Enter child's invite code (shown on child's Profile page)
- Step 3: Confirmation — show child's name + school
- Create parent_profiles record + parent_children link (status: 'active')

### 3. Student Profile — Show Invite Code
File: `src/app/(protected)/profile/page.tsx`
- Add section: "Kod Jemputan Ibu Bapa" / "Parent Invite Code"
- Show the invite_code from profiles table (auto-generated)
- Add copy button and share via WhatsApp button
- Text: "Share this code with your parents so they can track your progress"

### 4. Parent Dashboard (NEW)
File: `src/app/(protected)/parent/page.tsx`
- This replaces the normal dashboard when user role = 'parent'
- OR: redirect parents to /parent after login

#### Layout:
```
┌──────────────────────────────┐
│ 👨‍👩‍👧 Parent Dashboard          │
│ [Child1 ▼] selector          │
├──────────────────────────────┤
│ Quick Stats (3 cards)        │
│ 🔥 Streak  ⭐ XP  📖 Lessons │
├──────────────────────────────┤
│ 📅 This Week's Activity      │
│ M T W T F S S                │
│ ✅ ✅ ❌ ✅ ❌ ❌ ❌            │
├──────────────────────────────┤
│ 📊 Topic Performance         │
│ Ch1 ████████░░ 80%           │
│ Ch2 ██████░░░░ 60%           │
│ Ch5 ████░░░░░░ 40%           │
├──────────────────────────────┤
│ ⚠️ Alerts                    │
│ "No activity for 2 days"     │
│ "Low score in Ch5 (40%)"     │
├──────────────────────────────┤
│ 🎯 Learning Goals             │
│ Weekly sessions: 3/5         │
│ Average score: 72%/80%       │
└──────────────────────────────┘
```

#### Data Sources:
- **Streak & XP**: from `profiles` table (current_streak, xp_total)
- **Lessons completed**: count from `lesson_progress` where status='completed'
- **Weekly activity**: from `study_time_log` (last 7 days) or `lesson_progress` timestamps
- **Topic performance**: from `lesson_progress` + `quiz_attempts` grouped by topic
- **Alerts**: calculate from activity data (no activity > 2 days, scores < 50%)

### 5. Parent Navigation
When user role = 'parent', show different bottom nav:
```
🏠 Home (parent dashboard)
📊 Reports (weekly summaries)  
🎯 Goals (set/track goals)
👤 Profile
```

### 6. Add Child Flow
File: `src/app/(protected)/parent/add-child/page.tsx`
- Input: invite code
- Validate code exists in profiles table
- Create parent_children record
- Show confirmation with child's name

## Routing Logic
In protected layout or middleware:
- Check `profiles.role`
- If 'parent': show parent nav, redirect /dashboard to /parent
- If 'student': show student nav (current behavior)

## Migration Needed
```sql
-- Add role column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'student' CHECK (role IN ('student', 'parent'));
```

## Styling
- Same purple theme (#6C5CE7)
- Cards: white, rounded-2xl, shadow-sm
- Parent dashboard uses softer colors (less gamified, more informational)
- Activity calendar: green circles for active days, gray for inactive
- Topic bars: gradient purple fill on gray background
- Alerts: amber/orange for warnings, red for urgent

## Bilingual
All text must support BM/EN using the existing language toggle pattern:
```typescript
{lang === 'en' ? 'English text' : 'BM text'}
```

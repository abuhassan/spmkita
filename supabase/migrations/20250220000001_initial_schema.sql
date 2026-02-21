-- ============================================
-- SPMKita Database Schema
-- ============================================

create extension if not exists "uuid-ossp";

-- SUBJECTS
create table public.subjects (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name_en text not null,
  name_bm text not null,
  icon text default '📚',
  form_levels smallint[] not null default '{1,2,3,4,5}',
  is_active boolean default false,
  display_order smallint default 0,
  created_at timestamptz default now()
);

-- TOPICS
create table public.topics (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid references public.subjects(id) on delete cascade not null,
  form_level smallint not null check (form_level between 1 and 5),
  chapter_number smallint not null,
  name_en text not null,
  name_bm text not null,
  description_en text,
  description_bm text,
  display_order smallint default 0,
  created_at timestamptz default now()
);

create index idx_topics_subject on public.topics(subject_id);
create index idx_topics_form on public.topics(form_level);

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  avatar_url text,
  form_level smallint check (form_level between 1 and 5),
  school_name text,
  state text,
  preferred_language text default 'bm' check (preferred_language in ('bm', 'en')),
  xp_total integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date date,
  onboarding_completed boolean default false,
  premium boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STUDENT SUBJECTS
create table public.student_subjects (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  enrolled_at timestamptz default now(),
  unique(student_id, subject_id)
);

create index idx_student_subjects_student on public.student_subjects(student_id);

-- QUESTIONS
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid references public.topics(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  form_level smallint not null check (form_level between 1 and 5),
  difficulty smallint default 1 check (difficulty between 1 and 3),
  question_type text default 'mcq' check (question_type in ('mcq', 'structured', 'fill_blank')),
  question_text_en text not null,
  question_text_bm text not null,
  question_image_url text,
  options_en jsonb,
  options_bm jsonb,
  correct_answer text not null,
  explanation_en text,
  explanation_bm text,
  marks smallint default 1,
  spm_year smallint,
  spm_paper text check (spm_paper in ('paper1', 'paper2')),
  tags text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_questions_topic on public.questions(topic_id);
create index idx_questions_subject on public.questions(subject_id);
create index idx_questions_form on public.questions(form_level);
create index idx_questions_difficulty on public.questions(difficulty);

-- DAILY CHALLENGES
create table public.daily_challenges (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  challenge_date date not null default current_date,
  questions uuid[] not null,
  answers jsonb default '{}',
  score smallint default 0,
  xp_earned integer default 0,
  completed_at timestamptz,
  time_taken_seconds integer,
  created_at timestamptz default now(),
  unique(student_id, subject_id, challenge_date)
);

create index idx_daily_challenges_student on public.daily_challenges(student_id);
create index idx_daily_challenges_date on public.daily_challenges(challenge_date);

-- PRACTICE SESSIONS
create table public.practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  total_questions smallint default 0,
  correct_answers smallint default 0,
  xp_earned integer default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_practice_sessions_student on public.practice_sessions(student_id);

-- QUESTION ATTEMPTS
create table public.question_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  session_type text not null check (session_type in ('daily', 'practice', 'diagnostic')),
  session_id uuid,
  answer_given text,
  is_correct boolean default false,
  time_seconds smallint,
  attempted_at timestamptz default now()
);

create index idx_question_attempts_student on public.question_attempts(student_id);
create index idx_question_attempts_question on public.question_attempts(question_id);

-- DIAGNOSTIC RESULTS
create table public.diagnostic_results (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  readiness_score smallint default 0 check (readiness_score between 0 and 100),
  topic_scores jsonb default '{}',
  weak_topics uuid[] default '{}',
  strong_topics uuid[] default '{}',
  taken_at timestamptz default now()
);

create index idx_diagnostic_student on public.diagnostic_results(student_id);

-- ACHIEVEMENTS
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name_en text not null,
  name_bm text not null,
  description_en text,
  description_bm text,
  icon text default '🏆',
  xp_reward integer default 0,
  criteria jsonb not null,
  created_at timestamptz default now()
);

-- STUDENT ACHIEVEMENTS
create table public.student_achievements (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique(student_id, achievement_id)
);

create index idx_student_achievements_student on public.student_achievements(student_id);

-- XP TRANSACTIONS
create table public.xp_transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  source text not null check (source in ('daily', 'practice', 'achievement', 'streak_bonus', 'diagnostic')),
  reference_id uuid,
  created_at timestamptz default now()
);

create index idx_xp_transactions_student on public.xp_transactions(student_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update streak
create or replace function public.update_streak(p_student_id uuid)
returns void as $$
declare
  v_last_active date;
  v_today date := current_date;
  v_current_streak integer;
  v_longest_streak integer;
begin
  select last_active_date, current_streak, longest_streak
  into v_last_active, v_current_streak, v_longest_streak
  from public.profiles where id = p_student_id;

  if v_last_active = v_today then return;
  elsif v_last_active = v_today - interval '1 day' then
    v_current_streak := v_current_streak + 1;
  else
    v_current_streak := 1;
  end if;

  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;

  update public.profiles set
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_active_date = v_today,
    updated_at = now()
  where id = p_student_id;
end;
$$ language plpgsql security definer;

-- Add XP
create or replace function public.add_xp(
  p_student_id uuid, p_amount integer, p_source text, p_reference_id uuid default null
) returns integer as $$
declare v_new_total integer;
begin
  insert into public.xp_transactions (student_id, amount, source, reference_id)
  values (p_student_id, p_amount, p_source, p_reference_id);

  update public.profiles set xp_total = xp_total + p_amount, updated_at = now()
  where id = p_student_id returning xp_total into v_new_total;

  return v_new_total;
end;
$$ language plpgsql security definer;

-- Leaderboard
create or replace function public.get_leaderboard(
  p_scope text default 'national', p_state text default null,
  p_school text default null, p_limit integer default 20
) returns table (
  rank bigint, student_id uuid, display_name text, avatar_url text,
  school_name text, state text, xp_total integer, current_streak integer
) as $$
begin
  return query
  select row_number() over (order by p.xp_total desc),
    p.id, p.display_name, p.avatar_url, p.school_name, p.state, p.xp_total, p.current_streak
  from public.profiles p
  where p.display_name is not null
    and (p_scope != 'state' or p.state = p_state)
    and (p_scope != 'school' or p.school_name = p_school)
  order by p.xp_total desc limit p_limit;
end;
$$ language plpgsql security definer;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.student_subjects enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.diagnostic_results enable row level security;
alter table public.student_achievements enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.achievements enable row level security;

-- Public read for reference tables
create policy "Anyone can read subjects" on public.subjects for select using (true);
create policy "Anyone can read topics" on public.topics for select using (true);
create policy "Anyone can read questions" on public.questions for select using (true);
create policy "Anyone can read achievements" on public.achievements for select using (true);

-- Profiles
create policy "Anyone can read profiles" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Student data: own only
create policy "Users manage own subjects" on public.student_subjects for all using (auth.uid() = student_id);
create policy "Users manage own challenges" on public.daily_challenges for all using (auth.uid() = student_id);
create policy "Users manage own practice" on public.practice_sessions for all using (auth.uid() = student_id);
create policy "Users manage own attempts" on public.question_attempts for all using (auth.uid() = student_id);
create policy "Users manage own diagnostics" on public.diagnostic_results for all using (auth.uid() = student_id);
create policy "Users manage own achievements" on public.student_achievements for all using (auth.uid() = student_id);
create policy "Users read own xp" on public.xp_transactions for all using (auth.uid() = student_id);

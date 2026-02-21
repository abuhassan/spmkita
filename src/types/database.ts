export interface Profile {
  id: string
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  form_level: number | null
  school_name: string | null
  state: string | null
  preferred_language: 'bm' | 'en'
  xp_total: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  onboarding_completed: boolean
  premium: boolean
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  code: string
  name_en: string
  name_bm: string
  icon: string
  form_levels: number[]
  is_active: boolean
  display_order: number
}

export interface Topic {
  id: string
  subject_id: string
  form_level: number
  chapter_number: number
  name_en: string
  name_bm: string
  description_en: string | null
  description_bm: string | null
  display_order: number
}

export interface Question {
  id: string
  topic_id: string
  subject_id: string
  form_level: number
  difficulty: 1 | 2 | 3
  question_type: 'mcq' | 'structured' | 'fill_blank'
  question_text_en: string
  question_text_bm: string
  question_image_url: string | null
  options_en: QuestionOption[] | null
  options_bm: QuestionOption[] | null
  correct_answer: string
  explanation_en: string | null
  explanation_bm: string | null
  marks: number
  spm_year: number | null
  spm_paper: 'paper1' | 'paper2' | null
  tags: string[]
}

export interface QuestionOption {
  key: string
  text: string
}

export interface DailyChallenge {
  id: string
  student_id: string
  subject_id: string
  challenge_date: string
  questions: string[]
  answers: Record<string, { answer: string; correct: boolean; time_seconds: number }>
  score: number
  xp_earned: number
  completed_at: string | null
  time_taken_seconds: number | null
}

export interface Achievement {
  id: string
  code: string
  name_en: string
  name_bm: string
  description_en: string | null
  description_bm: string | null
  icon: string
  xp_reward: number
  criteria: { type: string; value: number }
}

export interface LeaderboardEntry {
  rank: number
  student_id: string
  display_name: string
  avatar_url: string | null
  school_name: string | null
  state: string | null
  xp_total: number
  current_streak: number
}

// ─── Phase A: Learning Path ──────────────────────────────────────────────────

export interface Lesson {
  id: string
  topic_id: string
  lesson_number: number
  title_en: string
  title_bm: string
  content_en: ContentBlock[]
  content_bm: ContentBlock[]
  duration_minutes: number
  is_active: boolean
  created_at: string
}

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
  time_spent_seconds: number | null
}

export type ContentBlock =
  | { type: 'objective'; text: string }
  | { type: 'concept'; title: string; text: string }
  | { type: 'formula'; formula: string; note?: string }
  | { type: 'worked_example'; question: string; steps: string[] }
  | { type: 'quick_check'; question: string; options: string[]; correct: number; explanation: string }
  | { type: 'summary'; points: string[] }
  | { type: 'practice_intro'; text: string }
  | { type: 'quiz_intro'; text: string }

// Malaysian states
export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Putrajaya',
  'Wilayah Persekutuan Labuan'
] as const

export type MalaysianState = typeof MALAYSIAN_STATES[number]

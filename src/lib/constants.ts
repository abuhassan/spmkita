// XP rewards
export const XP = {
  DAILY_COMPLETE: 50,
  DAILY_PERFECT: 100,
  PRACTICE_CORRECT: 10,
  PRACTICE_CORRECT_HARD: 20,
  DIAGNOSTIC_COMPLETE: 100,
  STREAK_7: 200,
  STREAK_30: 1000,
} as const

// Daily challenge config
export const DAILY_CHALLENGE = {
  QUESTION_COUNT: 5,
  TIME_LIMIT_SECONDS: 300, // 5 minutes
} as const

// Difficulty labels
export const DIFFICULTY_LABELS = {
  1: { en: 'Easy', bm: 'Mudah' },
  2: { en: 'Medium', bm: 'Sederhana' },
  3: { en: 'Hard', bm: 'Sukar' },
} as const

// Form level labels
export const FORM_LABELS = {
  1: 'Tingkatan 1',
  2: 'Tingkatan 2',
  3: 'Tingkatan 3',
  4: 'Tingkatan 4',
  5: 'Tingkatan 5',
} as const

// Encouragement messages
export const ENCOURAGEMENT = {
  correct: ['Mantap! 💪', 'Betul! 🎯', 'Hebat! ⭐', 'Power la! 🔥', 'Gempak! 🚀'],
  wrong: ['Cuba lagi! 💡', 'Jangan putus asa! 🌟', 'Teruskan! 💪', 'Boleh punya! 🎯'],
  streak: ['Streak on fire! 🔥', 'Konsisten tu penting! 💪', 'Rajin betul! ⭐'],
} as const

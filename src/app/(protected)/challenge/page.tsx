'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Question, QuestionOption } from '@/types/database'
import { XP, DAILY_CHALLENGE, ENCOURAGEMENT } from '@/lib/constants'

type ChallengeState = 'idle' | 'loading' | 'playing' | 'reviewing' | 'results'

interface AnswerRecord {
  answer: string
  correct: boolean
  time_seconds: number
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

export default function ChallengePage() {
  const router = useRouter()
  const supabase = createClient()

  const [state, setState] = useState<ChallengeState>('idle')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [encouragement, setEncouragement] = useState('')
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [todayScore, setTodayScore] = useState<number | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const questionStartTime = useRef<number>(Date.now())
  const userId = useRef<string>('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userId.current = user.id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) { router.push('/login'); return }
      setProfile(profileData)

      // Check if today's challenge is already completed
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('student_id', user.id)
        .eq('challenge_date', today)
        .not('completed_at', 'is', null)
        .maybeSingle()

      if (existing) {
        setAlreadyCompleted(true)
        setTodayScore(existing.score)
        setXpEarned(existing.xp_earned)
      }

      setPageLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lang = profile?.preferred_language || 'bm'

  async function startChallenge() {
    setState('loading')

    // Get enrolled subjects
    const { data: enrollments } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .eq('student_id', userId.current)

    const subjectIds = enrollments?.map(e => e.subject_id) || []

    // Fetch questions matching form_level and enrolled subjects
    let query = supabase
      .from('questions')
      .select('*')
      .eq('question_type', 'mcq')

    if (profile?.form_level) {
      query = query.eq('form_level', profile.form_level)
    }
    if (subjectIds.length > 0) {
      query = query.in('subject_id', subjectIds)
    }

    let { data: allQuestions } = await query

    // Fallback: fetch any MCQ questions if none match
    if (!allQuestions || allQuestions.length === 0) {
      const { data: fallback } = await supabase
        .from('questions')
        .select('*')
        .eq('question_type', 'mcq')
        .limit(15)

      allQuestions = fallback
    }

    if (!allQuestions || allQuestions.length === 0) {
      alert(lang === 'bm' ? 'Tiada soalan tersedia.' : 'No questions available.')
      setState('idle')
      return
    }

    // Shuffle and pick 5
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5)
    setQuestions(shuffled.slice(0, DAILY_CHALLENGE.QUESTION_COUNT))
    setCurrentIndex(0)
    setAnswers({})
    setSelectedAnswer(null)
    questionStartTime.current = Date.now()
    setState('playing')
  }

  function handleAnswer(key: string) {
    if (state !== 'playing' || selectedAnswer !== null) return

    const question = questions[currentIndex]
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)
    const isCorrect = key === question.correct_answer

    setSelectedAnswer(key)

    const msgs = isCorrect ? ENCOURAGEMENT.correct : ENCOURAGEMENT.wrong
    setEncouragement(msgs[Math.floor(Math.random() * msgs.length)])

    setAnswers(prev => ({
      ...prev,
      [question.id]: {
        answer: key,
        correct: isCorrect,
        time_seconds: timeSpent,
      },
    }))

    setState('reviewing')
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setEncouragement('')
      questionStartTime.current = Date.now()
      setState('playing')
    } else {
      finishChallenge()
    }
  }

  async function finishChallenge() {
    setSaving(true)
    setState('results')

    const score = Object.values(answers).filter(a => a.correct).length
    const totalTime = Object.values(answers).reduce((sum, a) => sum + a.time_seconds, 0)

    // Calculate XP
    let xp = XP.DAILY_COMPLETE
    if (score === DAILY_CHALLENGE.QUESTION_COUNT) {
      xp += XP.DAILY_PERFECT
    }
    setXpEarned(xp)

    const today = new Date().toISOString().split('T')[0]
    const subjectId = questions[0]?.subject_id

    // Save daily challenge
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .insert({
        student_id: userId.current,
        subject_id: subjectId,
        challenge_date: today,
        questions: questions.map(q => q.id),
        answers,
        score,
        xp_earned: xp,
        completed_at: new Date().toISOString(),
        time_taken_seconds: totalTime,
      })
      .select()
      .single()

    // Save individual question attempts
    const attempts = questions.map(q => ({
      student_id: userId.current,
      question_id: q.id,
      challenge_id: challenge?.id || null,
      selected_answer: answers[q.id]?.answer || '',
      is_correct: answers[q.id]?.correct || false,
      time_seconds: answers[q.id]?.time_seconds || 0,
    }))

    await supabase.from('question_attempts').insert(attempts)

    // Update streak and add XP via database functions
    await supabase.rpc('update_streak', { p_student_id: userId.current })
    await supabase.rpc('add_xp', {
      p_student_id: userId.current,
      p_amount: xp,
      p_source: 'daily_challenge',
    })

    setSaving(false)
  }

  // --- Page loading ---
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⚡</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  // --- Already completed today ---
  if (alreadyCompleted) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-2">
            {lang === 'bm' ? 'Cabaran Hari Ini Selesai!' : "Today's Challenge Done!"}
          </h1>
          <p className="text-[#636E72] mb-2">
            {lang === 'bm'
              ? `Skor: ${todayScore}/${DAILY_CHALLENGE.QUESTION_COUNT}`
              : `Score: ${todayScore}/${DAILY_CHALLENGE.QUESTION_COUNT}`}
          </p>
          <p className="text-[#FDCB6E] font-bold mb-4">+{xpEarned} XP</p>
          <p className="text-sm text-[#636E72] mb-6">
            {lang === 'bm'
              ? 'Datang semula esok untuk cabaran baru!'
              : 'Come back tomorrow for a new challenge!'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#6C5CE7] text-white font-bold py-3 px-8 rounded-xl"
          >
            {lang === 'bm' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  // --- Start screen ---
  if (state === 'idle') {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">⚡</div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-2">
            {lang === 'bm' ? 'Cabaran Harian' : 'Daily Challenge'}
          </h1>
          <p className="text-[#636E72] mb-6">
            {lang === 'bm'
              ? `Jawab ${DAILY_CHALLENGE.QUESTION_COUNT} soalan untuk hari ini`
              : `Answer ${DAILY_CHALLENGE.QUESTION_COUNT} questions for today`}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#6C5CE7]/10 rounded-xl p-3">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <p className="font-semibold text-[#2D3436]">
                {lang === 'bm' ? '5 Soalan MCQ' : '5 MCQ Questions'}
              </p>
              <p className="text-sm text-[#636E72]">
                {lang === 'bm' ? 'Soalan rawak berdasarkan tahap anda' : 'Random questions based on your level'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#FDCB6E]/20 rounded-xl p-3">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <p className="font-semibold text-[#2D3436]">+{XP.DAILY_COMPLETE} XP</p>
              <p className="text-sm text-[#636E72]">
                {lang === 'bm'
                  ? `Bonus sempurna: +${XP.DAILY_PERFECT} XP`
                  : `Perfect bonus: +${XP.DAILY_PERFECT} XP`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#00B894]/10 rounded-xl p-3">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <p className="font-semibold text-[#2D3436]">
                {lang === 'bm' ? 'Kekalkan Streak' : 'Maintain Streak'}
              </p>
              <p className="text-sm text-[#636E72]">
                {lang === 'bm'
                  ? `Streak semasa: ${profile?.current_streak || 0} hari`
                  : `Current streak: ${profile?.current_streak || 0} days`}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={startChallenge}
          className="w-full bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
        >
          {lang === 'bm' ? 'Mula Cabaran! 🚀' : 'Start Challenge! 🚀'}
        </button>
      </div>
    )
  }

  // --- Loading questions ---
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⚡</div>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Menyediakan soalan...' : 'Preparing questions...'}
          </p>
        </div>
      </div>
    )
  }

  // --- Question display (playing + reviewing) ---
  if (state === 'playing' || state === 'reviewing') {
    const question = questions[currentIndex]
    const options = (lang === 'bm' ? question.options_bm : question.options_en) || question.options_en || []
    const questionText = lang === 'bm' ? question.question_text_bm : question.question_text_en
    const explanation = lang === 'bm' ? question.explanation_bm : question.explanation_en

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (confirm(lang === 'bm' ? 'Keluar dari cabaran?' : 'Exit challenge?')) {
                setState('idle')
                setQuestions([])
                setAnswers({})
                setCurrentIndex(0)
                setSelectedAnswer(null)
              }
            }}
            className="text-[#636E72] text-xl"
          >
            ✕
          </button>
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#6C5CE7] h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + (state === 'reviewing' ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-[#636E72]">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-sm text-[#6C5CE7] font-medium mb-2">
            {lang === 'bm' ? `Soalan ${currentIndex + 1}` : `Question ${currentIndex + 1}`}
          </p>
          <p className="text-lg font-semibold text-[#2D3436] leading-relaxed">
            {questionText}
          </p>
          {question.question_image_url && (
            <img
              src={question.question_image_url}
              alt="Question"
              className="mt-3 rounded-lg max-w-full"
            />
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option: QuestionOption) => {
            let optionStyle = 'bg-white border-2 border-gray-100 hover:border-[#6C5CE7]/30'

            if (state === 'reviewing') {
              if (option.key === question.correct_answer) {
                optionStyle = 'bg-[#00B894]/10 border-2 border-[#00B894] correct-glow'
              } else if (option.key === selectedAnswer && option.key !== question.correct_answer) {
                optionStyle = 'bg-[#E17055]/10 border-2 border-[#E17055] wrong-shake'
              } else {
                optionStyle = 'bg-gray-50 border-2 border-gray-100 opacity-50'
              }
            }

            return (
              <button
                key={option.key}
                onClick={() => handleAnswer(option.key)}
                disabled={state === 'reviewing'}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${optionStyle}`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  state === 'reviewing' && option.key === question.correct_answer
                    ? 'bg-[#00B894] text-white'
                    : state === 'reviewing' && option.key === selectedAnswer
                    ? 'bg-[#E17055] text-white'
                    : 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                }`}>
                  {option.key}
                </span>
                <span className="flex-1 font-medium text-[#2D3436]">
                  {option.text}
                </span>
                {state === 'reviewing' && option.key === question.correct_answer && (
                  <span className="text-xl">✓</span>
                )}
                {state === 'reviewing' && option.key === selectedAnswer && option.key !== question.correct_answer && (
                  <span className="text-xl">✗</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Review feedback */}
        {state === 'reviewing' && (
          <div className="mt-4">
            <div className={`text-center py-3 rounded-xl mb-3 ${
              answers[question.id]?.correct
                ? 'bg-[#00B894]/10'
                : 'bg-[#E17055]/10'
            }`}>
              <p className="text-lg font-bold">{encouragement}</p>
            </div>

            {explanation && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  {lang === 'bm' ? 'Penjelasan:' : 'Explanation:'}
                </p>
                <p className="text-sm text-blue-700">{explanation}</p>
              </div>
            )}

            <button
              onClick={nextQuestion}
              className="w-full bg-[#6C5CE7] text-white font-bold py-4 rounded-xl text-lg mt-2"
            >
              {currentIndex < questions.length - 1
                ? (lang === 'bm' ? 'Soalan Seterusnya →' : 'Next Question →')
                : (lang === 'bm' ? 'Lihat Keputusan 🎉' : 'See Results 🎉')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- Results screen ---
  if (state === 'results') {
    const score = Object.values(answers).filter(a => a.correct).length
    const totalTime = Object.values(answers).reduce((sum, a) => sum + a.time_seconds, 0)
    const isPerfect = score === DAILY_CHALLENGE.QUESTION_COUNT
    const percentage = Math.round((score / DAILY_CHALLENGE.QUESTION_COUNT) * 100)

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">
            {isPerfect ? '🏆' : score >= 3 ? '🎉' : '💪'}
          </div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-1">
            {isPerfect
              ? (lang === 'bm' ? 'Sempurna! Mantap!' : 'Perfect! Amazing!')
              : score >= 3
              ? (lang === 'bm' ? 'Bagus! Teruskan!' : 'Good job! Keep going!')
              : (lang === 'bm' ? 'Jangan putus asa!' : "Don't give up!")}
          </h1>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Cabaran harian selesai' : 'Daily challenge completed'}
          </p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 text-center">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-[#6C5CE7] mb-3">
            <div>
              <p className="text-3xl font-bold text-[#6C5CE7]">{score}/{DAILY_CHALLENGE.QUESTION_COUNT}</p>
              <p className="text-xs text-[#636E72]">{percentage}%</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold text-[#FDCB6E] xp-pop">+{xpEarned}</p>
              <p className="text-xs text-[#636E72]">XP</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#00B894]">{score}</p>
              <p className="text-xs text-[#636E72]">{lang === 'bm' ? 'Betul' : 'Correct'}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2D3436]">{formatTime(totalTime)}</p>
              <p className="text-xs text-[#636E72]">{lang === 'bm' ? 'Masa' : 'Time'}</p>
            </div>
          </div>

          {isPerfect && (
            <div className="mt-4 bg-[#FDCB6E]/20 rounded-xl p-3">
              <p className="text-sm font-bold text-[#2D3436]">
                🌟 {lang === 'bm' ? `Bonus Sempurna: +${XP.DAILY_PERFECT} XP!` : `Perfect Bonus: +${XP.DAILY_PERFECT} XP!`}
              </p>
            </div>
          )}
        </div>

        {/* Answer summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h3 className="font-bold text-[#2D3436] mb-3">
            {lang === 'bm' ? 'Ringkasan Jawapan' : 'Answer Summary'}
          </h3>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const answer = answers[q.id]
              return (
                <div key={q.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white ${
                    answer?.correct ? 'bg-[#00B894]' : 'bg-[#E17055]'
                  }`}>
                    {answer?.correct ? '✓' : '✗'}
                  </span>
                  <span className="flex-1 text-sm text-[#2D3436] truncate">
                    {lang === 'bm' ? `Soalan ${i + 1}` : `Question ${i + 1}`}
                  </span>
                  <span className="text-xs text-[#636E72]">{answer?.time_seconds}s</span>
                </div>
              )
            })}
          </div>
        </div>

        {saving ? (
          <div className="text-center py-3">
            <p className="text-[#636E72]">
              {lang === 'bm' ? 'Menyimpan keputusan...' : 'Saving results...'}
            </p>
          </div>
        ) : (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#6C5CE7] text-white font-bold py-4 rounded-xl text-lg"
          >
            {lang === 'bm' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}
          </button>
        )}
      </div>
    )
  }

  return null
}

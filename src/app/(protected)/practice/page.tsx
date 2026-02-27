'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Topic, Question, QuestionOption } from '@/types/database'
import { XP, ENCOURAGEMENT, FORM_LABELS, DIFFICULTY_LABELS } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

type PracticeView = 'topics' | 'loading' | 'session' | 'reviewing' | 'results'

interface AnswerRecord {
  answer: string
  correct: boolean
  time_seconds: number
  xp: number
}

interface TopicWithStats extends Topic {
  questionCount: number
  correctCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

function getXpForDifficulty(difficulty: number): number {
  return difficulty >= 2 ? XP.PRACTICE_CORRECT_HARD : XP.PRACTICE_CORRECT
}

// ─── Page wrapper (Suspense required for useSearchParams) ────────────────────

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">📝</div>
            <p className="text-[#636E72]">Memuatkan...</p>
          </div>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  )
}

// ─── Main content ────────────────────────────────────────────────────────────

function PracticeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Page-level state
  const [view, setView] = useState<PracticeView>('topics')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<number>(1)

  // Topic browser state
  const [topics, setTopics] = useState<TopicWithStats[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TopicWithStats | null>(null)

  // Practice session state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [encouragement, setEncouragement] = useState('')
  const [sessionXp, setSessionXp] = useState(0)
  const [saving, setSaving] = useState(false)

  // Refs
  const questionStartTime = useRef<number>(Date.now())
  const userId = useRef<string>('')
  const subjectIdRef = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Initialize ──────────────────────────────────────────────────────────

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
      setSelectedForm(profileData.form_level || 1)

      // Get subject from URL param or first enrolled subject
      const urlSubject = searchParams.get('subject')
      if (urlSubject) {
        subjectIdRef.current = urlSubject
      } else {
        const { data: enrollments } = await supabase
          .from('student_subjects')
          .select('subject_id')
          .eq('student_id', user.id)
          .limit(1)

        if (enrollments && enrollments.length > 0) {
          subjectIdRef.current = enrollments[0].subject_id
        }
      }

      setPageLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load topics when form level or page loading changes
  useEffect(() => {
    if (!pageLoading && userId.current) {
      loadTopics(selectedForm)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm, pageLoading])

  // ─── Data loading ────────────────────────────────────────────────────────

  async function loadTopics(formLevel: number) {
    setTopicsLoading(true)

    // Fetch topics for this form level
    let topicQuery = supabase
      .from('topics')
      .select('*')
      .eq('form_level', formLevel)
      .order('display_order')

    if (subjectIdRef.current) {
      topicQuery = topicQuery.eq('subject_id', subjectIdRef.current)
    }

    const { data: topicData } = await topicQuery

    if (!topicData || topicData.length === 0) {
      setTopics([])
      setTopicsLoading(false)
      return
    }

    const topicIds = topicData.map(t => t.id)

    // Fetch all MCQ questions for these topics (just id + topic_id for counting)
    const { data: questionsData } = await supabase
      .from('questions')
      .select('id, topic_id')
      .eq('question_type', 'mcq')
      .in('topic_id', topicIds)

    // Build question→topic map and count per topic
    const questionTopicMap = new Map<string, string>()
    const countPerTopic = new Map<string, number>()
    ;(questionsData || []).forEach(q => {
      questionTopicMap.set(q.id, q.topic_id)
      countPerTopic.set(q.topic_id, (countPerTopic.get(q.topic_id) || 0) + 1)
    })

    // Fetch student's correct attempts for these questions (distinct question_ids)
    const questionIds = (questionsData || []).map(q => q.id)
    const correctPerTopic = new Map<string, number>()

    if (questionIds.length > 0) {
      const { data: attemptData } = await supabase
        .from('question_attempts')
        .select('question_id')
        .eq('student_id', userId.current)
        .eq('is_correct', true)
        .in('question_id', questionIds)

      // Deduplicate and count by topic
      const seen = new Set<string>()
      ;(attemptData || []).forEach(a => {
        if (!seen.has(a.question_id)) {
          seen.add(a.question_id)
          const tId = questionTopicMap.get(a.question_id)
          if (tId) {
            correctPerTopic.set(tId, (correctPerTopic.get(tId) || 0) + 1)
          }
        }
      })
    }

    // Enrich topics with stats
    const enriched: TopicWithStats[] = topicData.map(t => ({
      ...t,
      questionCount: countPerTopic.get(t.id) || 0,
      correctCount: correctPerTopic.get(t.id) || 0,
    }))

    setTopics(enriched)
    setTopicsLoading(false)
  }

  // ─── Practice session actions ────────────────────────────────────────────

  async function startPractice(topic: TopicWithStats) {
    setSelectedTopic(topic)
    setView('loading')

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('topic_id', topic.id)
      .eq('question_type', 'mcq')

    if (!questionData || questionData.length === 0) {
      alert(lang === 'bm' ? 'Tiada soalan untuk topik ini.' : 'No questions for this topic.')
      setView('topics')
      return
    }

    // Shuffle questions
    const shuffled = [...questionData].sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setCurrentIndex(0)
    setAnswers({})
    setSelectedAnswer(null)
    setSessionXp(0)
    questionStartTime.current = Date.now()
    setView('session')
  }

  function handleAnswer(key: string) {
    if (view !== 'session' || selectedAnswer !== null) return

    const question = questions[currentIndex]
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)
    const isCorrect = key === question.correct_answer

    const xp = isCorrect ? getXpForDifficulty(question.difficulty) : 0

    setSelectedAnswer(key)

    const msgs = isCorrect ? ENCOURAGEMENT.correct : ENCOURAGEMENT.wrong
    setEncouragement(msgs[Math.floor(Math.random() * msgs.length)])

    setAnswers(prev => ({
      ...prev,
      [question.id]: {
        answer: key,
        correct: isCorrect,
        time_seconds: timeSpent,
        xp,
      },
    }))

    if (isCorrect) {
      setSessionXp(prev => prev + xp)
    }

    setView('reviewing')
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setEncouragement('')
      questionStartTime.current = Date.now()
      setView('session')
    } else {
      finishPractice()
    }
  }

  async function finishPractice() {
    setSaving(true)
    setView('results')

    const score = Object.values(answers).filter(a => a.correct).length
    const totalTime = Object.values(answers).reduce((sum, a) => sum + a.time_seconds, 0)
    const totalXp = Object.values(answers).reduce((sum, a) => sum + a.xp, 0)

    // Save practice session
    const { data: session } = await supabase
      .from('practice_sessions')
      .insert({
        student_id: userId.current,
        topic_id: selectedTopic!.id,
        subject_id: selectedTopic!.subject_id,
        questions_attempted: questions.length,
        questions_correct: score,
        xp_earned: totalXp,
        time_taken_seconds: totalTime,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Save individual question attempts
    const attempts = questions.map(q => ({
      student_id: userId.current,
      question_id: q.id,
      session_type: 'practice',
      session_id: session?.id || null,
      answer_given: answers[q.id]?.answer || '',
      is_correct: answers[q.id]?.correct || false,
      time_seconds: answers[q.id]?.time_seconds || 0,
    }))

    await supabase.from('question_attempts').insert(attempts)

    // Award XP via database function
    if (totalXp > 0) {
      await supabase.rpc('add_xp', {
        p_student_id: userId.current,
        p_amount: totalXp,
        p_source: 'practice',
      })
    }

    setSaving(false)
  }

  function backToTopics() {
    setView('topics')
    setSelectedTopic(null)
    setQuestions([])
    setAnswers({})
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setSessionXp(0)
    // Reload to refresh progress bars
    loadTopics(selectedForm)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Page loading ---
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📝</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  // ─── Topics browser ──────────────────────────────────────────────────────

  if (view === 'topics') {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#2D3436]">
            📝 {lang === 'bm' ? 'Latihan' : 'Practice'}
          </h1>
          <p className="text-sm text-[#636E72] mt-1">
            {lang === 'bm'
              ? 'Pilih topik untuk berlatih'
              : 'Choose a topic to practice'}
          </p>
        </div>

        {/* Form level tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
          {([1, 2, 3, 4, 5] as const).map(form => (
            <button
              key={form}
              onClick={() => setSelectedForm(form)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                selectedForm === form
                  ? 'bg-[#6C5CE7] text-white shadow-md'
                  : 'bg-white text-[#636E72] border border-gray-200'
              }`}
            >
              {FORM_LABELS[form]}
              {form === profile?.form_level && (
                <span className="ml-1 text-xs">
                  {selectedForm === form ? '⭐' : '•'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Topics list */}
        {topicsLoading ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3 animate-pulse">📚</div>
            <p className="text-[#636E72]">
              {lang === 'bm' ? 'Memuatkan topik...' : 'Loading topics...'}
            </p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-[#636E72]">
              {lang === 'bm'
                ? 'Tiada topik untuk tingkatan ini.'
                : 'No topics for this form level.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map(topic => {
              const progress = topic.questionCount > 0
                ? Math.round((topic.correctCount / topic.questionCount) * 100)
                : 0
              const hasQuestions = topic.questionCount > 0
              const isComplete = progress === 100 && hasQuestions

              return (
                <button
                  key={topic.id}
                  onClick={() => hasQuestions && startPractice(topic)}
                  disabled={!hasQuestions}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${
                    hasQuestions
                      ? 'hover:shadow-md active:scale-[0.99]'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Chapter badge */}
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold shrink-0 ${
                      isComplete
                        ? 'bg-[#00B894] text-white'
                        : hasQuestions
                        ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                        : 'bg-gray-100 text-[#636E72]'
                    }`}>
                      {isComplete ? '✓' : topic.chapter_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Topic name */}
                      <p className="font-semibold text-[#2D3436] leading-snug">
                        {lang === 'bm' ? topic.name_bm : topic.name_en}
                      </p>

                      {/* Meta info */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#636E72]">
                          {lang === 'bm'
                            ? `Bab ${topic.chapter_number}`
                            : `Ch. ${topic.chapter_number}`}
                        </span>
                        <span className="text-xs text-[#636E72]">•</span>
                        <span className="text-xs text-[#636E72]">
                          {hasQuestions
                            ? `${topic.questionCount} ${lang === 'bm' ? 'soalan' : 'questions'}`
                            : (lang === 'bm' ? 'Akan datang' : 'Coming soon')}
                        </span>
                        {hasQuestions && (
                          <>
                            <span className="text-xs text-[#636E72]">•</span>
                            <span className="text-xs font-medium text-[#FDCB6E]">
                              +{XP.PRACTICE_CORRECT}-{XP.PRACTICE_CORRECT_HARD} XP
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      {hasQuestions && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isComplete ? 'bg-[#00B894]' : 'bg-[#6C5CE7]'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold min-w-[32px] text-right ${
                            isComplete ? 'text-[#00B894]' : 'text-[#636E72]'
                          }`}>
                            {progress}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow or lock */}
                    <span className="text-[#636E72] mt-1 shrink-0">
                      {hasQuestions ? '→' : '🔒'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Loading session ─────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📝</div>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Menyediakan soalan...' : 'Preparing questions...'}
          </p>
        </div>
      </div>
    )
  }

  // ─── Practice session (session + reviewing) ──────────────────────────────

  if (view === 'session' || view === 'reviewing') {
    const question = questions[currentIndex]
    const options = (lang === 'bm' ? question.options_bm : question.options_en) || question.options_en || []
    const questionText = lang === 'bm' ? question.question_text_bm : question.question_text_en
    const explanation = lang === 'bm' ? question.explanation_bm : question.explanation_en
    const diffLabel = DIFFICULTY_LABELS[question.difficulty as keyof typeof DIFFICULTY_LABELS]

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              if (confirm(lang === 'bm' ? 'Keluar dari latihan?' : 'Exit practice?')) {
                backToTopics()
              }
            }}
            className="text-[#636E72] text-xl"
          >
            ✕
          </button>
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#6C5CE7] h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + (view === 'reviewing' ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-[#636E72]">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Topic name + running XP */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[#636E72] font-medium truncate mr-2">
            {lang === 'bm' ? selectedTopic?.name_bm : selectedTopic?.name_en}
          </p>
          <span className="text-sm font-bold text-[#FDCB6E] bg-[#FDCB6E]/10 px-2.5 py-0.5 rounded-lg whitespace-nowrap">
            +{sessionXp} XP
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-[#6C5CE7] font-medium">
              {lang === 'bm' ? `Soalan ${currentIndex + 1}` : `Question ${currentIndex + 1}`}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              question.difficulty === 1
                ? 'bg-[#00B894]/10 text-[#00B894]'
                : question.difficulty === 2
                ? 'bg-[#FDCB6E]/20 text-[#E17055]'
                : 'bg-[#E17055]/10 text-[#E17055]'
            }`}>
              {lang === 'bm' ? diffLabel?.bm : diffLabel?.en}
              {' • +'}
              {getXpForDifficulty(question.difficulty)} XP
            </span>
          </div>
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

            if (view === 'reviewing') {
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
                disabled={view === 'reviewing'}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${optionStyle}`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                  view === 'reviewing' && option.key === question.correct_answer
                    ? 'bg-[#00B894] text-white'
                    : view === 'reviewing' && option.key === selectedAnswer
                    ? 'bg-[#E17055] text-white'
                    : 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                }`}>
                  {option.key}
                </span>
                <span className="flex-1 font-medium text-[#2D3436]">
                  {option.text}
                </span>
                {view === 'reviewing' && option.key === question.correct_answer && (
                  <span className="text-xl">✓</span>
                )}
                {view === 'reviewing' && option.key === selectedAnswer && option.key !== question.correct_answer && (
                  <span className="text-xl">✗</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Review feedback */}
        {view === 'reviewing' && (
          <div className="mt-4">
            {/* Encouragement + per-question XP */}
            <div className={`text-center py-3 rounded-xl mb-3 ${
              answers[question.id]?.correct
                ? 'bg-[#00B894]/10'
                : 'bg-[#E17055]/10'
            }`}>
              <p className="text-lg font-bold">{encouragement}</p>
              {answers[question.id]?.correct && answers[question.id]?.xp > 0 && (
                <p className="text-sm font-bold text-[#FDCB6E] mt-1 xp-pop">
                  +{answers[question.id].xp} XP
                </p>
              )}
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  {lang === 'bm' ? 'Penjelasan:' : 'Explanation:'}
                </p>
                <p className="text-sm text-blue-700">{explanation}</p>
              </div>
            )}

            {/* Next button */}
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

  // ─── Results screen ──────────────────────────────────────────────────────

  if (view === 'results') {
    const score = Object.values(answers).filter(a => a.correct).length
    const totalTime = Object.values(answers).reduce((sum, a) => sum + a.time_seconds, 0)
    const totalXp = Object.values(answers).reduce((sum, a) => sum + a.xp, 0)
    const isPerfect = score === questions.length
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header celebration */}
        <div className="text-center py-6">
          <div className="text-6xl mb-4">
            {isPerfect ? '🏆' : percentage >= 60 ? '🎉' : '💪'}
          </div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-1">
            {isPerfect
              ? (lang === 'bm' ? 'Sempurna! Mantap!' : 'Perfect! Amazing!')
              : percentage >= 60
              ? (lang === 'bm' ? 'Bagus! Teruskan!' : 'Good job! Keep going!')
              : (lang === 'bm' ? 'Jangan putus asa!' : "Don't give up!")}
          </h1>
          <p className="text-sm text-[#636E72]">
            {lang === 'bm' ? selectedTopic?.name_bm : selectedTopic?.name_en}
          </p>
        </div>

        {/* Score card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4 text-center">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-[#6C5CE7] mb-3">
            <div>
              <p className="text-3xl font-bold text-[#6C5CE7]">{score}/{questions.length}</p>
              <p className="text-xs text-[#636E72]">{percentage}%</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold text-[#FDCB6E] xp-pop">+{totalXp}</p>
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
                🌟 {lang === 'bm' ? 'Topik ini sudah dikuasai!' : 'Topic mastered!'}
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
              const diffKey = q.difficulty as keyof typeof DIFFICULTY_LABELS
              return (
                <div key={q.id} className="flex items-center gap-2">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${
                    answer?.correct ? 'bg-[#00B894]' : 'bg-[#E17055]'
                  }`}>
                    {answer?.correct ? '✓' : '✗'}
                  </span>
                  <span className="flex-1 text-sm text-[#2D3436] truncate">
                    {lang === 'bm' ? `Soalan ${i + 1}` : `Q${i + 1}`}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    q.difficulty === 1
                      ? 'bg-[#00B894]/10 text-[#00B894]'
                      : q.difficulty === 2
                      ? 'bg-[#FDCB6E]/20 text-[#E17055]'
                      : 'bg-[#E17055]/10 text-[#E17055]'
                  }`}>
                    {lang === 'bm' ? DIFFICULTY_LABELS[diffKey]?.bm : DIFFICULTY_LABELS[diffKey]?.en}
                  </span>
                  {answer?.correct && (
                    <span className="text-xs font-bold text-[#FDCB6E] shrink-0">+{answer.xp}</span>
                  )}
                  <span className="text-xs text-[#636E72] shrink-0">{answer?.time_seconds}s</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        {saving ? (
          <div className="text-center py-3">
            <p className="text-[#636E72]">
              {lang === 'bm' ? 'Menyimpan keputusan...' : 'Saving results...'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                if (selectedTopic) startPractice(selectedTopic)
              }}
              className="w-full bg-[#6C5CE7] text-white font-bold py-4 rounded-xl text-lg"
            >
              {lang === 'bm' ? 'Cuba Lagi 🔄' : 'Try Again 🔄'}
            </button>
            <button
              onClick={backToTopics}
              className="w-full bg-white text-[#6C5CE7] font-bold py-4 rounded-xl text-lg border-2 border-[#6C5CE7]/20"
            >
              {lang === 'bm' ? 'Pilih Topik Lain' : 'Choose Another Topic'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}

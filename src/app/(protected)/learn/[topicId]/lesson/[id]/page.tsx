'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Topic, Lesson, ContentBlock } from '@/types/database'
import { XP, ENCOURAGEMENT } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickCheckAnswer {
  selected: number
  encouragement: string
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LessonViewerPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const topicId = params.topicId as string
  const lessonId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  // Step-through state
  const [currentStep, setCurrentStep] = useState(0)
  const [qcAnswers, setQcAnswers] = useState<Record<number, QuickCheckAnswer>>({})
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [topicBonus, setTopicBonus] = useState(false)

  const userId = useRef<string>('')
  const startTime = useRef<number>(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)

  const lang = profile?.preferred_language || 'bm'

  // ─── Load data ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userId.current = user.id

      const [profileRes, topicRes, lessonRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('topics').select('*').eq('id', topicId).single(),
        supabase.from('lessons').select('*').eq('id', lessonId).single(),
      ])

      if (!profileRes.data) { router.push('/login'); return }
      if (!topicRes.data) { router.push('/learn'); return }
      if (!lessonRes.data) { router.push(`/learn/${topicId}`); return }

      setProfile(profileRes.data)
      setTopic(topicRes.data)
      setLesson(lessonRes.data as Lesson)

      // Check if already completed
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('completed')
        .eq('student_id', user.id)
        .eq('lesson_id', lessonId)
        .single()

      if (progress?.completed) {
        setAlreadyCompleted(true)
        // Show all blocks immediately for re-reading
        const blocks = profileRes.data.preferred_language === 'en'
          ? (lessonRes.data as Lesson).content_en
          : (lessonRes.data as Lesson).content_bm
        setCurrentStep(blocks.length - 1)
      }

      startTime.current = Date.now()
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  // Auto-scroll when new block appears
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [currentStep, finished])

  // ─── Helpers ───────────────────────────────────────────────────────────

  const blocks: ContentBlock[] = lesson
    ? (lang === 'en' ? lesson.content_en : lesson.content_bm)
    : []

  const visibleBlocks = blocks.slice(0, currentStep + 1)
  const isLastBlock = currentStep >= blocks.length - 1

  // Check if current block is a quick_check that hasn't been answered
  const currentBlock = blocks[currentStep]
  const needsAnswer = currentBlock?.type === 'quick_check' && !qcAnswers[currentStep]

  function handleNext() {
    if (isLastBlock) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  function handleQuickCheck(blockIndex: number, selected: number) {
    if (qcAnswers[blockIndex] !== undefined) return // Already answered

    const block = blocks[blockIndex]
    if (block.type !== 'quick_check') return

    const isCorrect = selected === block.correct
    const msgs = isCorrect ? ENCOURAGEMENT.correct : ENCOURAGEMENT.wrong
    const encouragement = msgs[Math.floor(Math.random() * msgs.length)]

    setQcAnswers(prev => ({
      ...prev,
      [blockIndex]: { selected, encouragement },
    }))
  }

  // ─── Complete lesson ──────────────────────────────────────────────────

  async function handleComplete() {
    if (finished || saving) return
    if (alreadyCompleted) {
      // Already completed — just go back
      router.push(`/learn/${topicId}`)
      return
    }

    setSaving(true)
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000)
    let totalXp = 0

    try {
      // Upsert lesson progress
      await supabase
        .from('lesson_progress')
        .upsert({
          student_id: userId.current,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
        }, { onConflict: 'student_id,lesson_id' })

      // Award lesson XP
      totalXp = XP.LESSON_COMPLETE
      await supabase.rpc('add_xp', {
        p_student_id: userId.current,
        p_amount: XP.LESSON_COMPLETE,
        p_source: 'lesson_complete',
        p_ref_id: lessonId,
      })

      // Check if all lessons in this topic are now complete
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('topic_id', topicId)
        .eq('is_published', true)

      if (allLessons && allLessons.length > 0) {
        const lessonIds = allLessons.map(l => l.id)

        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', userId.current)
          .eq('status', 'completed')
          .in('lesson_id', lessonIds)

        const completedCount = (completedLessons || []).length

        if (completedCount >= lessonIds.length) {
          // All lessons done — award topic bonus
          totalXp += XP.TOPIC_ALL_LESSONS
          setTopicBonus(true)

          await supabase.rpc('add_xp', {
            p_student_id: userId.current,
            p_amount: XP.TOPIC_ALL_LESSONS,
            p_source: 'topic_all_lessons',
            p_ref_id: topicId,
          })
        }
      }

      setXpEarned(totalXp)
      setFinished(true)
    } catch (err) {
      console.error('Error saving lesson progress:', err)
    } finally {
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📖</div>
          <p className="text-[#636E72]">Memuatkan pelajaran...</p>
        </div>
      </div>
    )
  }

  // ── Completion screen ──────────────────────────────────────────────────

  if (finished) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4 xp-pop">🎉</div>
          <h1 className="text-2xl font-bold text-[#2D3436] mb-2">
            {lang === 'bm' ? 'Pelajaran Selesai!' : 'Lesson Complete!'}
          </h1>
          <p className="text-[#636E72] mb-6">
            {lang === 'bm'
              ? `"${lesson?.title_bm}" telah selesai`
              : `"${lesson?.title_en}" completed`}
          </p>

          {/* XP earned */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="text-3xl font-bold text-[#FDCB6E] mb-1 xp-pop">
              +{xpEarned} XP
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#636E72]">
                {lang === 'bm' ? 'Pelajaran selesai' : 'Lesson completed'}: +{XP.LESSON_COMPLETE} XP
              </p>
              {topicBonus && (
                <p className="text-sm font-semibold text-[#00B894]">
                  🌟 {lang === 'bm'
                    ? `Bonus semua pelajaran selesai: +${XP.TOPIC_ALL_LESSONS} XP`
                    : `All lessons bonus: +${XP.TOPIC_ALL_LESSONS} XP`}
                </p>
              )}
            </div>
          </div>

          {/* Encouragement */}
          <p className="text-lg font-semibold text-[#6C5CE7] mb-6">
            {ENCOURAGEMENT.correct[Math.floor(Math.random() * ENCOURAGEMENT.correct.length)]}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/learn/${topicId}`)}
              className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl shadow-md"
            >
              {lang === 'bm' ? 'Kembali ke Topik' : 'Back to Topic'}
            </button>
            <button
              onClick={() => router.push('/learn')}
              className="w-full bg-white text-[#636E72] font-semibold py-3.5 rounded-xl border border-gray-200"
            >
              {lang === 'bm' ? 'Semua Topik' : 'All Topics'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Lesson viewer ──────────────────────────────────────────────────────

  const progressPct = blocks.length > 0
    ? Math.round(((currentStep + 1) / blocks.length) * 100)
    : 0

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.push(`/learn/${topicId}`)}
          className="text-[#636E72] text-lg"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#636E72] truncate">
            {lang === 'bm' ? `Bab ${topic?.chapter_number}` : `Ch. ${topic?.chapter_number}`}
            {' • '}
            {lang === 'bm' ? `Pelajaran ${lesson?.lesson_number}` : `Lesson ${lesson?.lesson_number}`}
          </p>
          <p className="text-sm font-bold text-[#2D3436] truncate">
            {lang === 'bm' ? lesson?.title_bm : lesson?.title_en}
          </p>
        </div>
        {alreadyCompleted && (
          <span className="text-xs bg-[#00B894]/10 text-[#00B894] font-bold px-2 py-1 rounded-lg shrink-0">
            ✓ {lang === 'bm' ? 'Selesai' : 'Done'}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[#636E72] mb-1">
          <span>{currentStep + 1}/{blocks.length}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#6C5CE7] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Content blocks */}
      <div className="space-y-4">
        {visibleBlocks.map((block, index) => (
          <div key={index} className={index === currentStep ? 'xp-pop' : ''}>
            <BlockRenderer
              block={block}
              blockIndex={index}
              qcAnswer={qcAnswers[index]}
              onQuickCheck={handleQuickCheck}
              lang={lang}
            />
          </div>
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-4" />

      {/* Bottom action bar */}
      <div className="fixed bottom-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 z-40">
        <div className="max-w-md mx-auto">
          {needsAnswer ? (
            <p className="text-center text-sm text-[#636E72] py-2">
              {lang === 'bm' ? '👆 Jawab soalan di atas untuk teruskan' : '👆 Answer the question above to continue'}
            </p>
          ) : (
            <button
              onClick={handleNext}
              disabled={saving}
              className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving
                ? (lang === 'bm' ? 'Menyimpan...' : 'Saving...')
                : isLastBlock
                ? (alreadyCompleted
                    ? (lang === 'bm' ? 'Kembali ke Topik' : 'Back to Topic')
                    : (lang === 'bm' ? 'Selesai Pelajaran ✓' : 'Complete Lesson ✓'))
                : (lang === 'bm' ? 'Seterusnya →' : 'Next →')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

function BlockRenderer({ block, blockIndex, qcAnswer, onQuickCheck, lang }: {
  block: ContentBlock
  blockIndex: number
  qcAnswer?: QuickCheckAnswer
  onQuickCheck: (blockIndex: number, selected: number) => void
  lang: string
}) {
  switch (block.type) {
    case 'objective':
      return <ObjectiveBlock text={block.text} lang={lang} />
    case 'concept':
      return <ConceptBlock title={block.title} text={block.text} />
    case 'formula':
      return <FormulaBlock formula={block.formula} note={block.note} lang={lang} />
    case 'worked_example':
      return <WorkedExampleBlock question={block.question} steps={block.steps} lang={lang} />
    case 'quick_check':
      return (
        <QuickCheckBlock
          question={block.question}
          options={block.options}
          correct={block.correct}
          explanation={block.explanation}
          answer={qcAnswer}
          onSelect={(sel) => onQuickCheck(blockIndex, sel)}
          lang={lang}
        />
      )
    case 'summary':
      return <SummaryBlock points={block.points} lang={lang} />
    case 'practice_intro':
      return <PracticeIntroBlock text={block.text} />
    case 'quiz_intro':
      return <QuizIntroBlock text={block.text} />
    default:
      return null
  }
}

// ─── Objective ──────────────────────────────────────────────────────────────

function ObjectiveBlock({ text, lang }: { text: string; lang: string }) {
  return (
    <div className="bg-[#6C5CE7]/5 border-2 border-[#6C5CE7]/20 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">🎯</span>
        <div>
          <p className="text-xs font-bold text-[#6C5CE7] uppercase tracking-wide mb-1">
            {lang === 'bm' ? 'Objektif Pembelajaran' : 'Learning Objective'}
          </p>
          <p className="text-sm text-[#2D3436] leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Concept ────────────────────────────────────────────────────────────────

function ConceptBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="font-bold text-[#2D3436] mb-2">{title}</p>
      <p className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}

// ─── Formula ────────────────────────────────────────────────────────────────

function FormulaBlock({ formula, note, lang }: { formula: string; note?: string; lang: string }) {
  return (
    <div className="bg-[#FDCB6E]/10 border-2 border-[#FDCB6E]/30 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">📐</span>
        <div className="flex-1">
          <p className="text-xs font-bold text-[#E17055] uppercase tracking-wide mb-2">
            {lang === 'bm' ? 'Formula' : 'Formula'}
          </p>
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-lg font-mono font-bold text-[#2D3436]">{formula}</p>
          </div>
          {note && (
            <p className="text-xs text-[#636E72] mt-2 italic">{note}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Worked Example ─────────────────────────────────────────────────────────

function WorkedExampleBlock({ question, steps, lang }: {
  question: string
  steps: string[]
  lang: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Question */}
      <div className="bg-[#6C5CE7]/10 p-4">
        <p className="text-xs font-bold text-[#6C5CE7] uppercase tracking-wide mb-1">
          {lang === 'bm' ? 'Contoh Penyelesaian' : 'Worked Example'}
        </p>
        <p className="text-sm font-semibold text-[#2D3436]">{question}</p>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[#6C5CE7]/10 text-xs font-bold text-[#6C5CE7] shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-[#2D3436] leading-relaxed flex-1">{step}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Quick Check ────────────────────────────────────────────────────────────

function QuickCheckBlock({ question, options, correct, explanation, answer, onSelect, lang }: {
  question: string
  options: string[]
  correct: number
  explanation: string
  answer?: QuickCheckAnswer
  onSelect: (index: number) => void
  lang: string
}) {
  const answered = answer !== undefined
  const isCorrect = answered && answer.selected === correct

  return (
    <div className={`rounded-2xl overflow-hidden ${
      answered
        ? isCorrect
          ? 'border-2 border-[#00B894]/30'
          : 'border-2 border-[#E17055]/30'
        : 'border-2 border-[#6C5CE7]/20'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 ${
        answered
          ? isCorrect ? 'bg-[#00B894]/10' : 'bg-[#E17055]/10'
          : 'bg-[#6C5CE7]/5'
      }`}>
        <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{
          color: answered ? (isCorrect ? '#00B894' : '#E17055') : '#6C5CE7'
        }}>
          {answered
            ? (isCorrect
              ? (lang === 'bm' ? '✓ Betul!' : '✓ Correct!')
              : (lang === 'bm' ? '✗ Salah' : '✗ Incorrect'))
            : (lang === 'bm' ? '❓ Semak Pemahaman' : '❓ Quick Check')}
        </p>
        <p className="text-sm font-semibold text-[#2D3436]">{question}</p>
      </div>

      {/* Options */}
      <div className="p-4 space-y-2 bg-white">
        {options.map((option, i) => {
          let optStyle = 'border-gray-200 bg-white text-[#2D3436]'

          if (answered) {
            if (i === correct) {
              optStyle = 'border-[#00B894] bg-[#00B894]/10 text-[#00B894] font-semibold correct-glow'
            } else if (i === answer.selected && i !== correct) {
              optStyle = 'border-[#E17055] bg-[#E17055]/10 text-[#E17055] wrong-shake'
            } else {
              optStyle = 'border-gray-100 bg-gray-50 text-[#636E72] opacity-50'
            }
          }

          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={answered}
              className={`w-full text-left rounded-xl px-4 py-3 border-2 text-sm transition-all ${optStyle} ${
                !answered ? 'hover:border-[#6C5CE7]/40 active:scale-[0.98]' : ''
              }`}
            >
              <span className="font-bold mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {option}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {answered && (
        <div className={`px-4 py-3 border-t ${
          isCorrect ? 'bg-[#00B894]/5 border-[#00B894]/20' : 'bg-[#E17055]/5 border-[#E17055]/20'
        }`}>
          <p className="text-sm font-bold mb-1" style={{
            color: isCorrect ? '#00B894' : '#E17055'
          }}>
            {answer.encouragement}
          </p>
          <p className="text-xs text-[#636E72] leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  )
}

// ─── Summary ────────────────────────────────────────────────────────────────

function SummaryBlock({ points, lang }: { points: string[]; lang: string }) {
  return (
    <div className="bg-[#6C5CE7]/5 border-2 border-[#6C5CE7]/20 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📝</span>
        <p className="text-xs font-bold text-[#6C5CE7] uppercase tracking-wide">
          {lang === 'bm' ? 'Ringkasan' : 'Summary'}
        </p>
      </div>
      <ul className="space-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#2D3436]">
            <span className="text-[#6C5CE7] mt-0.5 shrink-0">•</span>
            <span className="leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Practice Intro ─────────────────────────────────────────────────────────

function PracticeIntroBlock({ text }: { text: string }) {
  return (
    <div className="bg-[#00B894]/5 border-2 border-[#00B894]/20 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">💪</span>
        <p className="text-sm text-[#2D3436] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

// ─── Quiz Intro ─────────────────────────────────────────────────────────────

function QuizIntroBlock({ text }: { text: string }) {
  return (
    <div className="bg-[#FDCB6E]/10 border-2 border-[#FDCB6E]/30 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">📋</span>
        <p className="text-sm text-[#2D3436] leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

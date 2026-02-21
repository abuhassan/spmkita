'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Topic } from '@/types/database'
import { XP, FORM_LABELS } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopicWithLessons extends Topic {
  lessonCount: number
  completedCount: number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<number>(1)
  const [topics, setTopics] = useState<TopicWithLessons[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Initialise ────────────────────────────────────────────────────────

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
      setPageLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load topics when form or page loading changes
  useEffect(() => {
    if (!pageLoading && userId.current) {
      loadTopics(selectedForm)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm, pageLoading])

  // ─── Data loading ──────────────────────────────────────────────────────

  async function loadTopics(formLevel: number) {
    setTopicsLoading(true)

    // Fetch topics for this form level
    const { data: topicData } = await supabase
      .from('topics')
      .select('*')
      .eq('form_level', formLevel)
      .order('display_order')

    if (!topicData || topicData.length === 0) {
      setTopics([])
      setTopicsLoading(false)
      return
    }

    const topicIds = topicData.map(t => t.id)

    // Fetch lessons for these topics
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, topic_id')
      .eq('is_published', true)
      .in('topic_id', topicIds)

    // Build counts per topic
    const lessonsByTopic = new Map<string, string[]>()
    ;(lessonsData || []).forEach((l: { id: string; topic_id: string }) => {
      const arr = lessonsByTopic.get(l.topic_id) || []
      arr.push(l.id)
      lessonsByTopic.set(l.topic_id, arr)
    })

    // Fetch student's completed lesson progress
    const allLessonIds = (lessonsData || []).map((l: { id: string }) => l.id)
    const completedByTopic = new Map<string, number>()

    if (allLessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', userId.current)
        .eq('status', 'completed')
        .in('lesson_id', allLessonIds)

      // Map lesson_id → topic_id for completed ones
      const lessonToTopic = new Map<string, string>()
      ;(lessonsData || []).forEach((l: { id: string; topic_id: string }) => {
        lessonToTopic.set(l.id, l.topic_id)
      })

      ;(progressData || []).forEach((p: { lesson_id: string }) => {
        const tId = lessonToTopic.get(p.lesson_id)
        if (tId) {
          completedByTopic.set(tId, (completedByTopic.get(tId) || 0) + 1)
        }
      })
    }

    // Enrich topics
    const enriched: TopicWithLessons[] = topicData.map(t => ({
      ...t,
      lessonCount: lessonsByTopic.get(t.id)?.length || 0,
      completedCount: completedByTopic.get(t.id) || 0,
    }))

    setTopics(enriched)
    setTopicsLoading(false)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📖</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#2D3436]">
          📖 {lang === 'bm' ? 'Belajar' : 'Learn'}
        </h1>
        <p className="text-sm text-[#636E72] mt-1">
          {lang === 'bm'
            ? 'Pelajaran berstruktur mengikut topik'
            : 'Structured lessons by topic'}
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

      {/* XP info banner */}
      <div className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-2xl p-4 mb-5 shadow-md">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-sm font-medium text-white/80">
              {lang === 'bm' ? 'Ganjaran Pelajaran' : 'Lesson Rewards'}
            </p>
            <p className="text-xs text-white/60 mt-0.5">
              +{XP.LESSON_COMPLETE} XP {lang === 'bm' ? 'setiap pelajaran' : 'per lesson'}
              {' • '}
              +{XP.TOPIC_ALL_LESSONS} XP {lang === 'bm' ? 'bonus topik' : 'topic bonus'}
            </p>
          </div>
          <span className="text-3xl">🎓</span>
        </div>
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
            const progress = topic.lessonCount > 0
              ? Math.round((topic.completedCount / topic.lessonCount) * 100)
              : 0
            const hasLessons = topic.lessonCount > 0
            const isComplete = progress === 100 && hasLessons

            return (
              <button
                key={topic.id}
                onClick={() => hasLessons ? router.push(`/learn/${topic.id}`) : undefined}
                disabled={!hasLessons}
                className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-all ${
                  hasLessons
                    ? 'hover:shadow-md active:scale-[0.99]'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Chapter badge */}
                  <div className={`w-11 h-11 flex items-center justify-center rounded-xl text-sm font-bold shrink-0 ${
                    isComplete
                      ? 'bg-[#00B894] text-white'
                      : hasLessons
                      ? 'bg-[#6C5CE7]/10 text-[#6C5CE7]'
                      : 'bg-gray-100 text-[#636E72]'
                  }`}>
                    {isComplete ? '✓' : `${topic.chapter_number}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Topic name */}
                    <p className="font-semibold text-[#2D3436] leading-snug">
                      {lang === 'bm' ? topic.name_bm : topic.name_en}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#636E72]">
                        {lang === 'bm' ? `Bab ${topic.chapter_number}` : `Ch. ${topic.chapter_number}`}
                      </span>
                      <span className="text-xs text-[#636E72]">•</span>
                      <span className="text-xs text-[#636E72]">
                        {hasLessons
                          ? `${topic.completedCount}/${topic.lessonCount} ${lang === 'bm' ? 'pelajaran' : 'lessons'}`
                          : (lang === 'bm' ? 'Akan datang' : 'Coming soon')}
                      </span>
                      {isComplete && (
                        <>
                          <span className="text-xs text-[#636E72]">•</span>
                          <span className="text-xs font-medium text-[#00B894]">
                            {lang === 'bm' ? 'Selesai' : 'Done'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    {hasLessons && (
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
                    {hasLessons ? '→' : '🔒'}
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

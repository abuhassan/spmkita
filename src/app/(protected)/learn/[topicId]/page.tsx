'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Topic, Lesson } from '@/types/database'
import { XP } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonWithProgress extends Lesson {
  completed: boolean
  unlocked: boolean
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TopicLessonsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const topicId = params.topicId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lessons, setLessons] = useState<LessonWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [allComplete, setAllComplete] = useState(false)

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Load data ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userId.current = user.id

      const [profileRes, topicRes, lessonsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('topics').select('*').eq('id', topicId).single(),
        supabase
          .from('lessons')
          .select('*')
          .eq('topic_id', topicId)
          .eq('is_published', true)
          .order('lesson_number'),
      ])

      if (!profileRes.data) { router.push('/login'); return }
      if (!topicRes.data) { router.push('/learn'); return }

      setProfile(profileRes.data)
      setTopic(topicRes.data)

      const lessonData = (lessonsRes.data || []) as Lesson[]
      const lessonIds = lessonData.map(l => l.id)

      // Fetch completion status
      let completedSet = new Set<string>()
      if (lessonIds.length > 0) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', user.id)
          .eq('status', 'completed')
          .in('lesson_id', lessonIds)

        completedSet = new Set(
          (progressData || []).map((p: { lesson_id: string }) => p.lesson_id)
        )
      }

      // Build lessons with progress and unlock state
      // Lesson is unlocked if: it's the first one, or the previous one is completed
      const enriched: LessonWithProgress[] = lessonData.map((lesson, index) => ({
        ...lesson,
        completed: completedSet.has(lesson.id),
        unlocked: index === 0 || completedSet.has(lessonData[index - 1]?.id),
      }))

      setLessons(enriched)
      setAllComplete(
        lessonData.length > 0 && lessonData.every(l => completedSet.has(l.id))
      )
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📖</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  const completedCount = lessons.filter(l => l.completed).length

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Header with back button */}
      <button
        onClick={() => router.push('/learn')}
        className="flex items-center gap-2 text-[#636E72] mb-4"
      >
        <span>←</span>
        <span className="text-sm font-medium">
          {lang === 'bm' ? 'Semua Topik' : 'All Topics'}
        </span>
      </button>

      {/* Topic info card */}
      <div className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-2xl p-5 mb-6 shadow-lg text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 font-medium">
              {lang === 'bm' ? `Bab ${topic?.chapter_number}` : `Chapter ${topic?.chapter_number}`}
            </p>
            <h1 className="text-xl font-bold mt-0.5 leading-snug">
              {lang === 'bm' ? topic?.name_bm : topic?.name_en}
            </h1>
            {(lang === 'bm' ? topic?.description_bm : topic?.description_en) && (
              <p className="text-sm text-white/70 mt-1 line-clamp-2">
                {lang === 'bm' ? topic?.description_bm : topic?.description_en}
              </p>
            )}
          </div>
          <span className="text-4xl ml-3 shrink-0">
            {allComplete ? '🏆' : '📖'}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-white/80">
              {completedCount}/{lessons.length} {lang === 'bm' ? 'pelajaran' : 'lessons'}
            </span>
            <span className="font-bold">
              {lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0}%
            </span>
          </div>
          <div className="bg-white/20 rounded-full h-2.5">
            <div
              className="bg-white h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* XP info */}
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">⭐</span>
          <span className="text-xs text-[#636E72]">
            +{XP.LESSON_COMPLETE} XP / {lang === 'bm' ? 'pelajaran' : 'lesson'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🌟</span>
          <span className="text-xs text-[#636E72]">
            +{XP.TOPIC_ALL_LESSONS} XP {lang === 'bm' ? 'bonus penuh' : 'completion bonus'}
          </span>
        </div>
      </div>

      {/* Lessons list */}
      {lessons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Tiada pelajaran lagi.' : 'No lessons yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isNext = !lesson.completed && lesson.unlocked
            const locked = !lesson.unlocked && !lesson.completed

            return (
              <button
                key={lesson.id}
                onClick={() => {
                  if (!locked) {
                    router.push(`/learn/${topicId}/lesson/${lesson.id}`)
                  }
                }}
                disabled={locked}
                className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all ${
                  isNext
                    ? 'bg-[#6C5CE7]/5 border-2 border-[#6C5CE7]/30 hover:shadow-md'
                    : lesson.completed
                    ? 'bg-white hover:shadow-md'
                    : 'bg-white opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Lesson number / status icon */}
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                    lesson.completed
                      ? 'bg-[#00B894] text-white'
                      : isNext
                      ? 'bg-[#6C5CE7] text-white'
                      : 'bg-gray-100 text-[#636E72]'
                  }`}>
                    {lesson.completed ? '✓' : locked ? '🔒' : lesson.lesson_number}
                  </div>

                  {/* Lesson info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold leading-snug ${
                      locked ? 'text-[#636E72]' : 'text-[#2D3436]'
                    }`}>
                      {lang === 'bm' ? lesson.title_bm : lesson.title_en}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#636E72]">
                        {lang === 'bm' ? `Pelajaran ${lesson.lesson_number}` : `Lesson ${lesson.lesson_number}`}
                      </span>
                      <span className="text-xs text-[#636E72]">•</span>
                      <span className="text-xs text-[#636E72]">
                        ~{lesson.duration_minutes} {lang === 'bm' ? 'min' : 'min'}
                      </span>
                      {lesson.completed && (
                        <>
                          <span className="text-xs text-[#636E72]">•</span>
                          <span className="text-xs font-medium text-[#00B894]">
                            {lang === 'bm' ? 'Selesai' : 'Done'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Arrow / label */}
                  {isNext && (
                    <span className="text-xs font-bold text-[#6C5CE7] bg-[#6C5CE7]/10 px-2.5 py-1 rounded-lg shrink-0">
                      {lang === 'bm' ? 'Mula' : 'Start'}
                    </span>
                  )}
                  {lesson.completed && !isNext && (
                    <span className="text-[#00B894] shrink-0">→</span>
                  )}
                </div>

                {/* Connecting line for sequential flow */}
                {index < lessons.length - 1 && (
                  <div className="flex justify-start ml-5 mt-1">
                    <div className={`w-0.5 h-3 ${
                      lesson.completed ? 'bg-[#00B894]/30' : 'bg-gray-200'
                    }`} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* All complete celebration */}
      {allComplete && lessons.length > 0 && (
        <div className="mt-6 bg-[#00B894]/10 rounded-2xl p-4 text-center border border-[#00B894]/20">
          <p className="text-2xl mb-1">🎉</p>
          <p className="text-sm font-bold text-[#00B894]">
            {lang === 'bm'
              ? 'Tahniah! Semua pelajaran selesai!'
              : 'Congratulations! All lessons completed!'}
          </p>
          <p className="text-xs text-[#636E72] mt-0.5">
            +{XP.TOPIC_ALL_LESSONS} XP {lang === 'bm' ? 'bonus dikutip' : 'bonus earned'}
          </p>
        </div>
      )}
    </div>
  )
}

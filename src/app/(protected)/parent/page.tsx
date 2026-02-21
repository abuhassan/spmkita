'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChildInfo {
  id: string
  display_name: string
  school_name: string | null
  form_level: number | null
  xp_total: number
  current_streak: number
}

interface TopicPerformance {
  topicId: string
  name: string
  chapterNumber: number
  completed: number
  total: number
}

interface Alert {
  type: 'warning' | 'danger'
  icon: string
  text: string
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Child data
  const [lessonsCompleted, setLessonsCompleted] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>([])
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [goals, setGoals] = useState<{ goal_type: string; target_value: number; current_value: number }[]>([])

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Load parent data ──────────────────────────────────────────────────

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
      if (profileData.role !== 'parent') { router.push('/dashboard'); return }
      setProfile(profileData)

      // Load linked children
      const { data: links } = await supabase
        .from('parent_children')
        .select('child_id')
        .eq('parent_id', user.id)
        .eq('status', 'active')

      if (!links || links.length === 0) {
        setLoading(false)
        return
      }

      const childIds = links.map(l => l.child_id)
      const { data: childProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, school_name, form_level, xp_total, current_streak')
        .in('id', childIds)

      if (childProfiles && childProfiles.length > 0) {
        setChildren(childProfiles as ChildInfo[])
        setSelectedChild(childProfiles[0].id)
      }

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Load child data when selection changes ───────────────────────────

  useEffect(() => {
    if (!selectedChild) return
    loadChildData(selectedChild)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChild])

  async function loadChildData(childId: string) {
    // Lessons completed
    const { data: lessonData, count: lessonCount } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('student_id', childId)
      .eq('status', 'completed')

    setLessonsCompleted(lessonCount || 0)

    // Weekly activity: check last 7 days via lesson_progress completed_at
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data: recentActivity } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('student_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', startDate)

    // Also check daily challenges
    const { data: recentChallenges } = await supabase
      .from('daily_challenges')
      .select('challenge_date')
      .eq('student_id', childId)
      .not('completed_at', 'is', null)
      .gte('challenge_date', startDate)

    // Build a set of active days
    const activeDays = new Set<string>()
    ;(recentActivity || []).forEach(r => {
      if (r.completed_at) activeDays.add(r.completed_at.split('T')[0])
    })
    ;(recentChallenges || []).forEach(r => {
      activeDays.add(r.challenge_date)
    })

    // Build 7-day activity array (Mon to Sun starting from 6 days ago)
    const activity: boolean[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      activity.push(activeDays.has(d.toISOString().split('T')[0]))
    }
    setWeeklyActivity(activity)

    // Topic performance: lessons per topic
    const child = children.find(c => c.id === childId)
    if (child?.form_level) {
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name_en, name_bm, chapter_number')
        .eq('form_level', child.form_level)
        .order('chapter_number')

      if (topics && topics.length > 0) {
        const topicIds = topics.map(t => t.id)

        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, topic_id')
          .in('topic_id', topicIds)
          .eq('is_published', true)

        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', childId)
          .eq('status', 'completed')

        const completedSet = new Set((completedLessons || []).map(l => l.lesson_id))

        const perf: TopicPerformance[] = topics.map(t => {
          const topicLessons = (allLessons || []).filter(l => l.topic_id === t.id)
          const completed = topicLessons.filter(l => completedSet.has(l.id)).length
          return {
            topicId: t.id,
            name: lang === 'en' ? t.name_en : t.name_bm,
            chapterNumber: t.chapter_number,
            completed,
            total: topicLessons.length,
          }
        }).filter(p => p.total > 0)

        setTopicPerformance(perf)
      }
    }

    // Learning goals
    const { data: goalsData } = await supabase
      .from('learning_goals')
      .select('goal_type, target_value, current_value')
      .eq('student_id', childId)
      .eq('parent_id', userId.current)

    setGoals(goalsData || [])

    // Generate alerts
    const newAlerts: Alert[] = []

    // Check inactivity
    const today = new Date()
    const activeDaysCount = activity.filter(Boolean).length
    const inactiveDays = 7 - activeDaysCount

    if (inactiveDays >= 3) {
      newAlerts.push({
        type: 'danger',
        icon: '🚨',
        text: lang === 'bm'
          ? `Tiada aktiviti selama ${inactiveDays} hari dalam minggu ini`
          : `No activity for ${inactiveDays} days this week`,
      })
    } else if (inactiveDays >= 2) {
      newAlerts.push({
        type: 'warning',
        icon: '⚠️',
        text: lang === 'bm'
          ? `${inactiveDays} hari tidak aktif minggu ini`
          : `${inactiveDays} inactive days this week`,
      })
    }

    // Check low performance topics
    topicPerformance.forEach(tp => {
      if (tp.total > 0 && (tp.completed / tp.total) < 0.3 && tp.completed > 0) {
        newAlerts.push({
          type: 'warning',
          icon: '📉',
          text: lang === 'bm'
            ? `Kemajuan rendah dalam Bab ${tp.chapterNumber} (${Math.round((tp.completed / tp.total) * 100)}%)`
            : `Low progress in Ch. ${tp.chapterNumber} (${Math.round((tp.completed / tp.total) * 100)}%)`,
        })
      }
    })

    if (newAlerts.length === 0) {
      newAlerts.push({
        type: 'warning',
        icon: '✅',
        text: lang === 'bm' ? 'Tiada amaran — semuanya baik!' : 'No alerts — everything looks good!',
      })
    }

    setAlerts(newAlerts)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">👨‍👩‍👧</div>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Memuatkan...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // No children linked yet
  if (children.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12">
        <div className="text-center space-y-6">
          <div className="text-6xl">👨‍👩‍👧</div>
          <h1 className="text-2xl font-bold text-[#2D3436]">
            {lang === 'bm' ? 'Dashboard Ibu Bapa' : 'Parent Dashboard'}
          </h1>
          <p className="text-[#636E72]">
            {lang === 'bm'
              ? 'Anda belum menyambung dengan mana-mana anak lagi.'
              : 'You haven\'t connected with any children yet.'}
          </p>
          <button
            onClick={() => router.push('/parent/add-child')}
            className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl shadow-md"
          >
            ➕ {lang === 'bm' ? 'Tambah Anak' : 'Add Child'}
          </button>
        </div>
      </div>
    )
  }

  const child = children.find(c => c.id === selectedChild)
  const dayLabels = lang === 'bm'
    ? ['Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa', 'Ah']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2D3436]">
          👨‍👩‍👧 {lang === 'bm' ? 'Dashboard Ibu Bapa' : 'Parent Dashboard'}
        </h1>
      </div>

      {/* Child selector */}
      {children.length > 1 ? (
        <select
          value={selectedChild}
          onChange={e => setSelectedChild(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#2D3436] font-semibold focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
        >
          {children.map(c => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center text-lg font-bold text-[#6C5CE7]">
            {(child?.display_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#2D3436] truncate">{child?.display_name}</p>
            <p className="text-xs text-[#636E72]">
              {child?.school_name ? `${child.school_name} • ` : ''}
              {lang === 'bm' ? `Tingkatan ${child?.form_level}` : `Form ${child?.form_level}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/parent/add-child')}
            className="text-[#6C5CE7] text-sm font-semibold"
          >
            ➕
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className={`text-2xl ${(child?.current_streak || 0) > 0 ? 'streak-fire' : ''}`}>🔥</div>
          <p className="text-xl font-bold text-[#2D3436] mt-0.5">{child?.current_streak || 0}</p>
          <p className="text-[10px] text-[#636E72]">Streak</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl">⭐</div>
          <p className="text-xl font-bold text-[#FDCB6E] mt-0.5">{(child?.xp_total || 0).toLocaleString()}</p>
          <p className="text-[10px] text-[#636E72]">XP</p>
        </div>
        <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
          <div className="text-2xl">📖</div>
          <p className="text-xl font-bold text-[#6C5CE7] mt-0.5">{lessonsCompleted}</p>
          <p className="text-[10px] text-[#636E72]">{lang === 'bm' ? 'Pelajaran' : 'Lessons'}</p>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
        <h2 className="text-sm font-bold text-[#2D3436] mb-3">
          📅 {lang === 'bm' ? 'Aktiviti Minggu Ini' : 'This Week\'s Activity'}
        </h2>
        <div className="flex justify-around">
          {dayLabels.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs text-[#636E72] font-medium">{day}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  weeklyActivity[i]
                    ? 'bg-[#00B894] text-white'
                    : 'bg-gray-100 text-gray-300'
                }`}
              >
                {weeklyActivity[i] ? '✓' : '—'}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#636E72] text-center mt-2">
          {weeklyActivity.filter(Boolean).length}/7 {lang === 'bm' ? 'hari aktif' : 'active days'}
        </p>
      </div>

      {/* Topic Performance */}
      {topicPerformance.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <h2 className="text-sm font-bold text-[#2D3436] mb-3">
            📊 {lang === 'bm' ? 'Kemajuan Topik' : 'Topic Performance'}
          </h2>
          <div className="space-y-3">
            {topicPerformance.map(tp => {
              const pct = tp.total > 0 ? Math.round((tp.completed / tp.total) * 100) : 0
              return (
                <div key={tp.topicId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#2D3436] font-medium truncate flex-1 mr-2">
                      {lang === 'bm' ? 'Bab' : 'Ch'} {tp.chapterNumber}: {tp.name}
                    </span>
                    <span className="text-xs font-bold text-[#6C5CE7]">{pct}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? '#00B894' : pct >= 50 ? '#6C5CE7' : '#FDCB6E',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
        <h2 className="text-sm font-bold text-[#2D3436] mb-3">
          ⚠️ {lang === 'bm' ? 'Amaran' : 'Alerts'}
        </h2>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm ${
                alert.type === 'danger'
                  ? 'bg-[#E17055]/10 text-[#E17055]'
                  : 'bg-[#FDCB6E]/10 text-[#2D3436]'
              }`}
            >
              <span className="shrink-0">{alert.icon}</span>
              <span className="leading-snug">{alert.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Goals */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
        <h2 className="text-sm font-bold text-[#2D3436] mb-3">
          🎯 {lang === 'bm' ? 'Sasaran Pembelajaran' : 'Learning Goals'}
        </h2>
        {goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal, i) => {
              const pct = goal.target_value > 0
                ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                : 0
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#2D3436] capitalize">{goal.goal_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold text-[#6C5CE7]">
                      {goal.current_value}/{goal.target_value}
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#6C5CE7] h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[#636E72] text-center py-2">
            {lang === 'bm'
              ? 'Tiada sasaran ditetapkan lagi.'
              : 'No goals set yet.'}
          </p>
        )}
      </div>

      {/* Add another child */}
      <button
        onClick={() => router.push('/parent/add-child')}
        className="w-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-semibold py-3 rounded-xl mb-4 active:scale-[0.98] transition-all"
      >
        ➕ {lang === 'bm' ? 'Tambah Anak Lain' : 'Add Another Child'}
      </button>
    </div>
  )
}

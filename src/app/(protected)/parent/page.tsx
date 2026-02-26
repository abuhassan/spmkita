'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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

interface Goal {
  id: string
  goal_type: string
  target_value: number
  current_value: number
  week_start: string
  week_end: string
  achieved: boolean
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get current date in Malaysia timezone (UTC+8) */
function getMalaysiaDate(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

function getMalaysiaDateStr(): string {
  return getMalaysiaDate().toISOString().split('T')[0]
}

function getWeekRange() {
  const now = getMalaysiaDate()
  const day = now.getDay() // 0=Sun, 1=Mon...
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

const GOAL_TYPES = [
  { value: 'lessons_per_week', icon: '📖', label_bm: 'Pelajaran Seminggu', label_en: 'Lessons per Week', defaults: [5, 10, 15, 20] },
  { value: 'xp_per_week', icon: '⭐', label_bm: 'XP Seminggu', label_en: 'XP per Week', defaults: [200, 500, 1000, 2000] },
  { value: 'active_days', icon: '📅', label_bm: 'Hari Aktif Seminggu', label_en: 'Active Days per Week', defaults: [3, 5, 6, 7] },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParentDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  // Child data
  const [lessonsCompleted, setLessonsCompleted] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>([])
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Goals
  const [goals, setGoals] = useState<Goal[]>([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [goalType, setGoalType] = useState('lessons_per_week')
  const [goalTarget, setGoalTarget] = useState(10)
  const [savingGoal, setSavingGoal] = useState(false)

  // Delete confirmation
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastCounter = useRef(0)

  // Weekly actual values
  const [weekLessons, setWeekLessons] = useState(0)
  const [weekXp, setWeekXp] = useState(0)
  const [weekActiveDays, setWeekActiveDays] = useState(0)

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Toast helper ──────────────────────────────────────────────────────

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }

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
      if (profileData.role !== 'parent' && profileData.role !== 'tutor') { router.push('/dashboard'); return }
      setProfile(profileData)

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

  const loadChildData = useCallback(async (childId: string) => {
    setDataLoading(true)
    const week = getWeekRange()
    const todayStr = getMalaysiaDateStr()

    // Lessons completed (all time)
    const { count: lessonCount } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('student_id', childId)
      .eq('status', 'completed')

    setLessonsCompleted(lessonCount || 0)

    // Weekly lessons (this week only)
    const { count: weekLessonCount } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('student_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', week.start)
      .lte('completed_at', week.end + 'T23:59:59')

    setWeekLessons(weekLessonCount || 0)

    // Weekly XP from xp_transactions
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('student_id', childId)
      .gte('created_at', week.start)
      .lte('created_at', week.end + 'T23:59:59')

    const totalWeekXp = (xpData || []).reduce((sum, t) => sum + (t.amount || 0), 0)
    setWeekXp(totalWeekXp)

    // Weekly activity: check last 7 days
    const sevenDaysAgo = new Date(getMalaysiaDate())
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const startDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data: recentActivity } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('student_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', startDate)

    const { data: recentChallenges } = await supabase
      .from('daily_challenges')
      .select('challenge_date')
      .eq('student_id', childId)
      .not('completed_at', 'is', null)
      .gte('challenge_date', startDate)

    const activeDays = new Set<string>()
    ;(recentActivity || []).forEach(r => {
      if (r.completed_at) activeDays.add(r.completed_at.split('T')[0])
    })
    ;(recentChallenges || []).forEach(r => {
      activeDays.add(r.challenge_date)
    })

    const activity: boolean[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(getMalaysiaDate())
      d.setDate(d.getDate() - 6 + i)
      activity.push(activeDays.has(d.toISOString().split('T')[0]))
    }
    setWeeklyActivity(activity)
    setWeekActiveDays(activeDays.size)

    // Topic performance
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

    // Learning goals (this week)
    const { data: goalsData } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('student_id', childId)
      .eq('parent_id', userId.current)
      .eq('week_start', week.start)

    setGoals((goalsData || []) as Goal[])

    // Generate alerts
    const newAlerts: Alert[] = []
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

    if (newAlerts.length === 0) {
      newAlerts.push({
        type: 'warning',
        icon: '✅',
        text: lang === 'bm' ? 'Tiada amaran — semuanya baik!' : 'No alerts — everything looks good!',
      })
    }

    setAlerts(newAlerts)
    setDataLoading(false)
  }, [children, lang, supabase])

  useEffect(() => {
    if (!selectedChild) return
    loadChildData(selectedChild)
  }, [selectedChild, loadChildData])

  // ─── Goal CRUD ─────────────────────────────────────────────────────────

  const allGoalsSet = goals.length >= GOAL_TYPES.length

  function openNewGoal() {
    if (allGoalsSet) return
    setEditingGoal(null)
    // Default to first available type
    const usedTypes = new Set(goals.map(g => g.goal_type))
    const firstAvailable = GOAL_TYPES.find(g => !usedTypes.has(g.value))
    setGoalType(firstAvailable?.value || 'lessons_per_week')
    setGoalTarget(firstAvailable?.defaults[1] || 10)
    setShowGoalModal(true)
  }

  function openEditGoal(goal: Goal) {
    setEditingGoal(goal)
    setGoalType(goal.goal_type)
    setGoalTarget(goal.target_value)
    setShowGoalModal(true)
  }

  function getCurrentValue(type: string): number {
    switch (type) {
      case 'lessons_per_week': return weekLessons
      case 'xp_per_week': return weekXp
      case 'active_days': return weekActiveDays
      default: return 0
    }
  }

  async function saveGoal() {
    if (!selectedChild || savingGoal) return
    setSavingGoal(true)

    const week = getWeekRange()
    const currentVal = getCurrentValue(goalType)

    try {
      if (editingGoal) {
        await supabase
          .from('learning_goals')
          .update({
            goal_type: goalType,
            target_value: goalTarget,
            current_value: currentVal,
            achieved: currentVal >= goalTarget,
          })
          .eq('id', editingGoal.id)
      } else {
        const existing = goals.find(g => g.goal_type === goalType)
        if (existing) {
          await supabase
            .from('learning_goals')
            .update({
              target_value: goalTarget,
              current_value: currentVal,
              achieved: currentVal >= goalTarget,
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('learning_goals')
            .insert({
              student_id: selectedChild,
              parent_id: userId.current,
              goal_type: goalType,
              target_value: goalTarget,
              current_value: currentVal,
              week_start: week.start,
              week_end: week.end,
              achieved: currentVal >= goalTarget,
            })
        }
      }

      // Refresh goals
      const { data: refreshed } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('student_id', selectedChild)
        .eq('parent_id', userId.current)
        .eq('week_start', week.start)

      setGoals((refreshed || []) as Goal[])
      setShowGoalModal(false)
      showToast(
        editingGoal
          ? (lang === 'bm' ? 'Sasaran dikemaskini ✅' : 'Goal updated ✅')
          : (lang === 'bm' ? 'Sasaran ditetapkan ✅' : 'Goal set ✅')
      )
    } catch {
      showToast(lang === 'bm' ? 'Ralat menyimpan sasaran' : 'Error saving goal', 'error')
    }

    setSavingGoal(false)
  }

  async function confirmDeleteGoal() {
    if (!deletingGoalId) return
    try {
      await supabase.from('learning_goals').delete().eq('id', deletingGoalId)
      setGoals(prev => prev.filter(g => g.id !== deletingGoalId))
      showToast(lang === 'bm' ? 'Sasaran dipadam 🗑️' : 'Goal deleted 🗑️')
    } catch {
      showToast(lang === 'bm' ? 'Ralat memadam sasaran' : 'Error deleting goal', 'error')
    }
    setDeletingGoalId(null)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="h-8 w-56 bg-gray-200 rounded-lg mb-4 animate-pulse" />
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="h-6 w-6 bg-gray-200 rounded mx-auto animate-pulse mb-2" />
              <div className="h-5 w-10 bg-gray-200 rounded mx-auto animate-pulse mb-1" />
              <div className="h-2 w-12 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm mb-5">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
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
            {profile?.role === 'tutor' ? '📖' : '👨‍👩‍👧'} {profile?.role === 'tutor' ? (lang === 'bm' ? 'Dashboard Tutor' : 'Tutor Dashboard') : (lang === 'bm' ? 'Dashboard Ibu Bapa' : 'Parent Dashboard')}
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
      {/* ── Toast Notifications ──────────────────────────────────────── */}
      <div className="fixed top-14 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold animate-toast pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-[#00B894] text-white'
                : 'bg-[#E17055] text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2D3436]">
          {profile?.role === 'tutor' ? '📖' : '👨‍👩‍👧'} {profile?.role === 'tutor' ? (lang === 'bm' ? 'Dashboard Tutor' : 'Tutor Dashboard') : (lang === 'bm' ? 'Dashboard Ibu Bapa' : 'Parent Dashboard')}
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

      {/* Data loading skeleton */}
      {dataLoading ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="h-6 w-6 bg-gray-200 rounded mx-auto animate-pulse mb-2" />
                <div className="h-5 w-10 bg-gray-200 rounded mx-auto animate-pulse mb-1" />
                <div className="h-2 w-12 bg-gray-100 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm mb-5">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-full bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </>
      ) : (
        <>
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
              📅 {lang === 'bm' ? 'Aktiviti Minggu Ini' : "This Week's Activity"}
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

          {/* ── Learning Goals ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#2D3436]">
                🎯 {lang === 'bm' ? 'Sasaran Mingguan' : 'Weekly Goals'}
              </h2>
              {!allGoalsSet && (
                <button
                  onClick={openNewGoal}
                  className="text-xs font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  + {lang === 'bm' ? 'Tetapkan' : 'Set Goal'}
                </button>
              )}
            </div>

            {goals.length > 0 ? (
              <div className="space-y-3">
                {goals.map(goal => {
                  const config = GOAL_TYPES.find(g => g.value === goal.goal_type)
                  const currentVal = getCurrentValue(goal.goal_type)
                  const pct = goal.target_value > 0
                    ? Math.min(100, Math.round((currentVal / goal.target_value) * 100))
                    : 0
                  const isAchieved = currentVal >= goal.target_value
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{config?.icon || '🎯'}</span>
                          <span className="text-xs text-[#2D3436] font-medium">
                            {lang === 'bm' ? config?.label_bm : config?.label_en}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isAchieved ? 'text-[#00B894]' : 'text-[#6C5CE7]'}`}>
                            {isAchieved ? '✅ ' : ''}{currentVal}/{goal.target_value}
                          </span>
                          <button
                            onClick={() => openEditGoal(goal)}
                            className="text-[#636E72] text-xs hover:text-[#6C5CE7] active:scale-90 transition-all"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeletingGoalId(goal.id)}
                            className="text-[#636E72] text-xs hover:text-[#E17055] active:scale-90 transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: isAchieved ? '#00B894' : pct >= 50 ? '#6C5CE7' : '#FDCB6E',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
                {allGoalsSet && (
                  <p className="text-[10px] text-[#636E72] text-center pt-1">
                    ✨ {lang === 'bm' ? 'Semua sasaran telah ditetapkan' : 'All goals set for this week'}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-3xl mb-2">🎯</p>
                <p className="text-xs text-[#636E72]">
                  {lang === 'bm'
                    ? 'Tetapkan sasaran mingguan untuk anak anda'
                    : 'Set weekly goals for your child'}
                </p>
                <button
                  onClick={openNewGoal}
                  className="mt-3 text-sm font-semibold text-[#6C5CE7] bg-[#6C5CE7]/10 px-4 py-2 rounded-xl active:scale-95 transition-all"
                >
                  + {lang === 'bm' ? 'Tetapkan Sasaran' : 'Set a Goal'}
                </button>
              </div>
            )}
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

          {/* Add another child */}
          <button
            onClick={() => router.push('/parent/add-child')}
            className="w-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-semibold py-3 rounded-xl mb-4 active:scale-[0.98] transition-all"
          >
            ➕ {profile?.role === 'tutor' ? (lang === 'bm' ? 'Tambah Pelajar Lain' : 'Add Another Student') : (lang === 'bm' ? 'Tambah Anak Lain' : 'Add Another Child')}
          </button>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GOAL SETTING MODAL                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showGoalModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => setShowGoalModal(false)}>
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#2D3436]">
                🎯 {editingGoal
                  ? (lang === 'bm' ? 'Edit Sasaran' : 'Edit Goal')
                  : (lang === 'bm' ? 'Tetapkan Sasaran' : 'Set a Goal')}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#636E72]"
              >
                ✕
              </button>
            </div>

            <label className="text-xs font-semibold text-[#636E72] uppercase tracking-wide">
              {lang === 'bm' ? 'Jenis Sasaran' : 'Goal Type'}
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2 mb-5">
              {GOAL_TYPES.map(gt => {
                const isSelected = goalType === gt.value
                const alreadyExists = !editingGoal && goals.some(g => g.goal_type === gt.value)
                return (
                  <button
                    key={gt.value}
                    onClick={() => {
                      setGoalType(gt.value)
                      setGoalTarget(gt.defaults[1])
                    }}
                    disabled={alreadyExists}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#6C5CE7] bg-[#6C5CE7]/5'
                        : alreadyExists
                        ? 'border-gray-100 bg-gray-50 opacity-40'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <span className="text-xl">{gt.icon}</span>
                    <span className="text-[10px] font-medium text-[#2D3436] text-center leading-tight">
                      {lang === 'bm' ? gt.label_bm : gt.label_en}
                    </span>
                    {alreadyExists && (
                      <span className="text-[9px] text-[#636E72]">
                        {lang === 'bm' ? 'Ditetapkan' : 'Already set'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <label className="text-xs font-semibold text-[#636E72] uppercase tracking-wide">
              {lang === 'bm' ? 'Sasaran' : 'Target'}
            </label>
            <div className="mt-2 mb-2">
              <div className="flex gap-2 mb-3">
                {(GOAL_TYPES.find(g => g.value === goalType)?.defaults || []).map(val => (
                  <button
                    key={val}
                    onClick={() => setGoalTarget(val)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      goalTarget === val
                        ? 'bg-[#6C5CE7] text-white'
                        : 'bg-gray-100 text-[#2D3436]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#636E72]">
                  {lang === 'bm' ? 'Atau masukkan sendiri:' : 'Or enter custom:'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={goalType === 'active_days' ? 7 : 9999}
                  value={goalTarget}
                  onChange={e => setGoalTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-[#2D3436] focus:border-[#6C5CE7] outline-none"
                />
              </div>
            </div>

            <div className="bg-[#F8F9FE] rounded-xl px-4 py-3 mt-4 mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#636E72]">
                  {lang === 'bm' ? 'Kemajuan semasa minggu ini' : 'Current progress this week'}
                </span>
                <span className="font-bold text-[#6C5CE7]">
                  {getCurrentValue(goalType)}/{goalTarget}
                </span>
              </div>
              <div className="bg-white rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((getCurrentValue(goalType) / goalTarget) * 100))}%`,
                    background: getCurrentValue(goalType) >= goalTarget ? '#00B894' : '#6C5CE7',
                  }}
                />
              </div>
            </div>

            <button
              onClick={saveGoal}
              disabled={savingGoal}
              className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {savingGoal
                ? '...'
                : editingGoal
                ? (lang === 'bm' ? 'Kemaskini Sasaran' : 'Update Goal')
                : (lang === 'bm' ? 'Tetapkan Sasaran' : 'Set Goal')}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {deletingGoalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setDeletingGoalId(null)}>
          <div
            className="w-80 bg-white rounded-2xl p-6 shadow-xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗑️</div>
              <h3 className="text-lg font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Padam Sasaran?' : 'Delete Goal?'}
              </h3>
              <p className="text-sm text-[#636E72] mt-1">
                {lang === 'bm'
                  ? 'Adakah anda pasti mahu memadam sasaran ini?'
                  : 'Are you sure you want to delete this goal?'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingGoalId(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-[#636E72] font-semibold text-sm active:scale-95 transition-all"
              >
                {lang === 'bm' ? 'Batal' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteGoal}
                className="flex-1 py-2.5 rounded-xl bg-[#E17055] text-white font-semibold text-sm active:scale-95 transition-all"
              >
                {lang === 'bm' ? 'Padam' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Animations ────────────────────────────────────────────────── */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        @keyframes toast-in {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-toast {
          animation: toast-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
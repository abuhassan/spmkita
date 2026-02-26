'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChildInfo {
  id: string
  display_name: string
  form_level: number | null
}

interface WeekSummary {
  lessons: number
  xp: number
  activeDays: number
  streak: number
  goalsSet: number
  goalsAchieved: number
  topicBreakdown: { name: string; chapterNumber: number; completed: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get current date in Malaysia timezone (UTC+8) */
function getMalaysiaDate(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

function getWeekRange(offset: number = 0) {
  const now = getMalaysiaDate()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon + offset * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    label: formatWeekLabel(monday, sunday),
  }
}

function formatWeekLabel(mon: Date, sun: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${mon.toLocaleDateString('en-GB', opts)} – ${sun.toLocaleDateString('en-GB', opts)}`
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParentReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [children, setChildren] = useState<ChildInfo[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  const [weekOffset, setWeekOffset] = useState(0)
  const [currentWeek, setCurrentWeek] = useState<WeekSummary | null>(null)
  const [prevWeek, setPrevWeek] = useState<WeekSummary | null>(null)

  const userId = useRef<string>('')
  const lang = profile?.preferred_language || 'bm'

  // ─── Init ──────────────────────────────────────────────────────────────

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
        .select('id, display_name, form_level')
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

  // ─── Load week data ────────────────────────────────────────────────────

  const loadWeekData = useCallback(async (childId: string, offset: number): Promise<WeekSummary> => {
    const week = getWeekRange(offset)
    const startTs = week.start + 'T00:00:00'
    const endTs = week.end + 'T23:59:59'

    const { count: lessonCount } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact' })
      .eq('student_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', startTs)
      .lte('completed_at', endTs)

    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('student_id', childId)
      .gte('created_at', startTs)
      .lte('created_at', endTs)

    const totalXp = (xpData || []).reduce((sum, t) => sum + (t.amount || 0), 0)

    const { data: lessonActivity } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('student_id', childId)
      .eq('status', 'completed')
      .gte('completed_at', startTs)
      .lte('completed_at', endTs)

    const { data: challengeActivity } = await supabase
      .from('daily_challenges')
      .select('challenge_date')
      .eq('student_id', childId)
      .not('completed_at', 'is', null)
      .gte('challenge_date', week.start)
      .lte('challenge_date', week.end)

    const activeDaysSet = new Set<string>()
    ;(lessonActivity || []).forEach(r => {
      if (r.completed_at) activeDaysSet.add(r.completed_at.split('T')[0])
    })
    ;(challengeActivity || []).forEach(r => {
      activeDaysSet.add(r.challenge_date)
    })

    let streak = 0
    if (offset === 0) {
      const { data: childProfile } = await supabase
        .from('profiles')
        .select('current_streak')
        .eq('id', childId)
        .single()
      streak = childProfile?.current_streak || 0
    }

    const { data: goalsData } = await supabase
      .from('learning_goals')
      .select('achieved')
      .eq('student_id', childId)
      .eq('parent_id', userId.current)
      .eq('week_start', week.start)

    const goalsSet = (goalsData || []).length
    const goalsAchieved = (goalsData || []).filter(g => g.achieved).length

    const child = children.find(c => c.id === childId)
    let topicBreakdown: { name: string; chapterNumber: number; completed: number }[] = []

    if (child?.form_level) {
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name_en, name_bm, chapter_number')
        .eq('form_level', child.form_level)
        .order('chapter_number')

      if (topics && topics.length > 0) {
        const { data: completedThisWeek } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('student_id', childId)
          .eq('status', 'completed')
          .gte('completed_at', startTs)
          .lte('completed_at', endTs)

        if (completedThisWeek && completedThisWeek.length > 0) {
          const lessonIds = completedThisWeek.map(l => l.lesson_id)

          const { data: lessonTopics } = await supabase
            .from('lessons')
            .select('id, topic_id')
            .in('id', lessonIds)

          const topicCounts = new Map<string, number>()
          ;(lessonTopics || []).forEach(l => {
            topicCounts.set(l.topic_id, (topicCounts.get(l.topic_id) || 0) + 1)
          })

          topicBreakdown = topics
            .filter(t => topicCounts.has(t.id))
            .map(t => ({
              name: lang === 'en' ? t.name_en : t.name_bm,
              chapterNumber: t.chapter_number,
              completed: topicCounts.get(t.id) || 0,
            }))
        }
      }
    }

    return {
      lessons: lessonCount || 0,
      xp: totalXp,
      activeDays: activeDaysSet.size,
      streak,
      goalsSet,
      goalsAchieved,
      topicBreakdown,
    }
  }, [children, lang, supabase])

  useEffect(() => {
    if (!selectedChild) return

    async function fetchData() {
      setDataLoading(true)
      const [current, prev] = await Promise.all([
        loadWeekData(selectedChild, weekOffset),
        loadWeekData(selectedChild, weekOffset - 1),
      ])
      setCurrentWeek(current)
      setPrevWeek(prev)
      setDataLoading(false)
    }
    fetchData()
  }, [selectedChild, weekOffset, loadWeekData])

  // ─── Trend helper ──────────────────────────────────────────────────────

  function Trend({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
    if (previous === 0 && current === 0) return <span className="text-[10px] text-[#636E72]">—</span>
    const diff = current - previous
    if (diff === 0) return <span className="text-[10px] text-[#636E72]">= {lang === 'bm' ? 'sama' : 'same'}</span>
    const isUp = diff > 0
    return (
      <span className={`text-[10px] font-semibold ${isUp ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
        {isUp ? '↑' : '↓'} {Math.abs(diff)}{suffix} {lang === 'bm' ? (isUp ? 'lebih' : 'kurang') : (isUp ? 'more' : 'less')}
      </span>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-4 animate-pulse" />
        <div className="bg-white rounded-2xl p-3 shadow-sm mb-5 flex items-center justify-between">
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm mb-5">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-12 w-full bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (children.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-[#636E72]">{lang === 'bm' ? 'Tiada anak disambungkan.' : 'No children connected.'}</p>
      </div>
    )
  }

  const week = getWeekRange(weekOffset)
  const isCurrentWeek = weekOffset === 0

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-[#2D3436] mb-4">
        📊 {lang === 'bm' ? 'Laporan Mingguan' : 'Weekly Reports'}
      </h1>

      {children.length > 1 && (
        <select
          value={selectedChild}
          onChange={e => setSelectedChild(e.target.value)}
          className="w-full mb-4 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#2D3436] font-semibold focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
        >
          {children.map(c => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      )}

      {/* Week Navigator */}
      <div className="bg-white rounded-2xl p-3 shadow-sm mb-5 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[#2D3436] active:scale-90 transition-all"
        >
          ◀
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-[#2D3436]">
            {isCurrentWeek
              ? (lang === 'bm' ? 'Minggu Ini' : 'This Week')
              : weekOffset === -1
              ? (lang === 'bm' ? 'Minggu Lepas' : 'Last Week')
              : week.label}
          </p>
          <p className="text-[10px] text-[#636E72]">{week.label}</p>
        </div>
        <button
          onClick={() => setWeekOffset(prev => Math.min(0, prev + 1))}
          disabled={isCurrentWeek}
          className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all ${
            isCurrentWeek ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-[#2D3436]'
          }`}
        >
          ▶
        </button>
      </div>

      {dataLoading ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm mb-5">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-12 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </>
      ) : currentWeek ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <SummaryCard
              icon="📖"
              value={currentWeek.lessons}
              label={lang === 'bm' ? 'Pelajaran' : 'Lessons'}
              trend={<Trend current={currentWeek.lessons} previous={prevWeek?.lessons || 0} />}
            />
            <SummaryCard
              icon="⭐"
              value={currentWeek.xp}
              label="XP"
              valueColor="text-[#FDCB6E]"
              trend={<Trend current={currentWeek.xp} previous={prevWeek?.xp || 0} />}
            />
            <SummaryCard
              icon="📅"
              value={currentWeek.activeDays}
              label={lang === 'bm' ? 'Hari Aktif' : 'Active Days'}
              suffix="/7"
              trend={<Trend current={currentWeek.activeDays} previous={prevWeek?.activeDays || 0} />}
            />
            <SummaryCard
              icon="🔥"
              value={currentWeek.streak}
              label="Streak"
              trend={isCurrentWeek ? undefined : <span className="text-[10px] text-[#636E72]">—</span>}
            />
          </div>

          {/* Goals Achievement */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
            <h2 className="text-sm font-bold text-[#2D3436] mb-3">
              🎯 {lang === 'bm' ? 'Pencapaian Sasaran' : 'Goal Achievement'}
            </h2>
            {currentWeek.goalsSet > 0 ? (
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F0F0F0" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={currentWeek.goalsAchieved === currentWeek.goalsSet ? '#00B894' : '#6C5CE7'}
                      strokeWidth="3"
                      strokeDasharray={`${(currentWeek.goalsAchieved / currentWeek.goalsSet) * 100} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#2D3436]">
                      {currentWeek.goalsAchieved}/{currentWeek.goalsSet}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2D3436]">
                    {currentWeek.goalsAchieved === currentWeek.goalsSet
                      ? (lang === 'bm' ? 'Semua sasaran dicapai! 🎉' : 'All goals achieved! 🎉')
                      : currentWeek.goalsAchieved > 0
                      ? (lang === 'bm'
                        ? `${currentWeek.goalsAchieved} daripada ${currentWeek.goalsSet} sasaran dicapai`
                        : `${currentWeek.goalsAchieved} of ${currentWeek.goalsSet} goals achieved`)
                      : (lang === 'bm' ? 'Belum ada sasaran dicapai' : 'No goals achieved yet')
                    }
                  </p>
                  <p className="text-[10px] text-[#636E72] mt-0.5">
                    {lang === 'bm' ? 'Minggu ini' : 'This week'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#636E72] text-center py-2">
                {lang === 'bm' ? 'Tiada sasaran ditetapkan untuk minggu ini' : 'No goals set for this week'}
              </p>
            )}
          </div>

          {/* Topics Studied This Week */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
            <h2 className="text-sm font-bold text-[#2D3436] mb-3">
              📚 {lang === 'bm' ? 'Topik Dipelajari' : 'Topics Studied'}
            </h2>
            {currentWeek.topicBreakdown.length > 0 ? (
              <div className="space-y-2">
                {currentWeek.topicBreakdown.map((tp, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-[#2D3436]">
                      {lang === 'bm' ? 'Bab' : 'Ch'} {tp.chapterNumber}: {tp.name}
                    </span>
                    <span className="text-xs font-bold text-[#6C5CE7]">
                      {tp.completed} {lang === 'bm' ? 'pelajaran' : tp.completed === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#636E72] text-center py-2">
                {lang === 'bm' ? 'Tiada pelajaran diselesaikan minggu ini' : 'No lessons completed this week'}
              </p>
            )}
          </div>

          {/* Week Comparison */}
          {prevWeek && (
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-5">
              <h2 className="text-sm font-bold text-[#2D3436] mb-3">
                📈 {lang === 'bm' ? 'Berbanding Minggu Sebelum' : 'vs Previous Week'}
              </h2>
              <div className="space-y-2.5">
                <ComparisonRow
                  icon="📖"
                  label={lang === 'bm' ? 'Pelajaran' : 'Lessons'}
                  current={currentWeek.lessons}
                  previous={prevWeek.lessons}
                />
                <ComparisonRow
                  icon="⭐"
                  label="XP"
                  current={currentWeek.xp}
                  previous={prevWeek.xp}
                />
                <ComparisonRow
                  icon="📅"
                  label={lang === 'bm' ? 'Hari Aktif' : 'Active Days'}
                  current={currentWeek.activeDays}
                  previous={prevWeek.activeDays}
                />
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ icon, value, label, valueColor, suffix, trend }: {
  icon: string
  value: number
  label: string
  valueColor?: string
  suffix?: string
  trend?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-[#636E72]">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor || 'text-[#2D3436]'}`}>
        {value.toLocaleString()}{suffix || ''}
      </p>
      {trend && <div className="mt-1">{trend}</div>}
    </div>
  )
}

function ComparisonRow({ icon, label, current, previous }: {
  icon: string
  label: string
  current: number
  previous: number
}) {
  const diff = current - previous
  const isUp = diff > 0
  const isDown = diff < 0
  const pctChange = previous > 0 ? Math.round(Math.abs(diff / previous) * 100) : (current > 0 ? 100 : 0)

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm">{icon}</span>
      <span className="flex-1 text-xs text-[#2D3436]">{label}</span>
      <span className="text-xs text-[#636E72]">{previous}</span>
      <span className="text-xs text-[#636E72]">→</span>
      <span className="text-xs font-bold text-[#2D3436]">{current}</span>
      <span className={`text-[10px] font-semibold min-w-[40px] text-right ${
        isUp ? 'text-[#00B894]' : isDown ? 'text-[#E17055]' : 'text-[#636E72]'
      }`}>
        {diff === 0 ? '=' : `${isUp ? '+' : ''}${diff}`}
        {pctChange > 0 && diff !== 0 ? ` (${pctChange}%)` : ''}
      </span>
    </div>
  )
}
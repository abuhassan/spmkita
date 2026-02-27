'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Achievement } from '@/types/database'
import { FORM_LABELS } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivityStats {
  totalAttempts: number
  correctAttempts: number
  challengesCompleted: number
  topicsMastered: number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<ActivityStats>({
    totalAttempts: 0,
    correctAttempts: 0,
    challengesCompleted: 0,
    topicsMastered: 0,
  })
  const [nationalRank, setNationalRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  // ─── Load all profile data ─────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userId.current = user.id

      // Fire all independent queries in parallel
      const [
        profileRes,
        achievementsRes,
        earnedRes,
        attemptsRes,
        challengesRes,
        leaderboardRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('achievements')
          .select('*')
          .order('xp_reward'),
        supabase
          .from('student_achievements')
          .select('achievement_id')
          .eq('student_id', user.id),
        supabase
          .from('question_attempts')
          .select('id, is_correct, question_id')
          .eq('student_id', user.id),
        supabase
          .from('daily_challenges')
          .select('id, questions, score')
          .eq('student_id', user.id)
          .not('completed_at', 'is', null),
        supabase.rpc('get_leaderboard', {
          p_scope: 'national',
          p_state: null,
          p_school: null,
          p_limit: 100,
        }),
      ])

      if (!profileRes.data) { router.push('/login'); return }
      setProfile(profileRes.data)

      // ── Achievements ──────────────────────────────────────────────────
      setAchievements(achievementsRes.data || [])
      const earned = new Set(
        (earnedRes.data || []).map((e: { achievement_id: string }) => e.achievement_id)
      )
      setEarnedIds(earned)

      // ── Activity stats ────────────────────────────────────────────────
      const attempts = attemptsRes.data || []
      const practiceTotal = attempts.length
      const practiceCorrect = attempts.filter(
        (a: { is_correct: boolean }) => a.is_correct
      ).length

      // Count questions from completed daily challenges
      const completedChallenges = challengesRes.data || []
      const challengesCompleted = completedChallenges.length
      let challengeQuestionTotal = 0
      let challengeQuestionCorrect = 0
      completedChallenges.forEach((c: { questions: string[]; score: number }) => {
        challengeQuestionTotal += (c.questions?.length || 0)
        challengeQuestionCorrect += (c.score || 0)
      })

      const totalAttempts = practiceTotal + challengeQuestionTotal
      const correctAttempts = practiceCorrect + challengeQuestionCorrect

      // Collect unique correctly-answered question IDs
      const correctQuestionIds = new Set<string>()
      attempts.forEach((a: { is_correct: boolean; question_id: string }) => {
        if (a.is_correct) correctQuestionIds.add(a.question_id)
      })

      // ── Topics mastered ───────────────────────────────────────────────
      // Fetch all MCQ questions to group by topic
      let topicsMastered = 0
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, topic_id')
        .eq('question_type', 'mcq')

      if (questionsData && questionsData.length > 0) {
        // Group question IDs by topic
        const questionsByTopic = new Map<string, string[]>()
        questionsData.forEach((q: { id: string; topic_id: string }) => {
          const arr = questionsByTopic.get(q.topic_id) || []
          arr.push(q.id)
          questionsByTopic.set(q.topic_id, arr)
        })

        // A topic is mastered when every question in it has been answered correctly
        questionsByTopic.forEach(qIds => {
          if (qIds.length > 0 && qIds.every(id => correctQuestionIds.has(id))) {
            topicsMastered++
          }
        })
      }

      setStats({
        totalAttempts,
        correctAttempts,
        challengesCompleted,
        topicsMastered,
      })

      // ── National rank ─────────────────────────────────────────────────
      const leaderboard = (leaderboardRes.data || []) as { student_id: string; rank: number }[]
      const myRank = leaderboard.find(e => e.student_id === user.id)
      setNationalRank(myRank?.rank ?? null)

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Logout ────────────────────────────────────────────────────────────

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">👤</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  const correctPct = stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ── Profile card ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-2xl p-5 mb-6 shadow-lg text-white">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {(profile?.display_name || '?')[0].toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile?.display_name}</h1>
            <p className="text-sm text-white/80">
              {profile?.form_level
                ? FORM_LABELS[profile.form_level as keyof typeof FORM_LABELS]
                : ''}
            </p>
            {profile?.school_name && (
              <p className="text-xs text-white/60 truncate">{profile.school_name}</p>
            )}
            {profile?.state && (
              <p className="text-xs text-white/60">{profile.state}</p>
            )}
          </div>

          {/* Settings gear */}
          <button onClick={() => router.push('/settings')} className="text-white/70 text-xl">
            ⚙️
          </button>
        </div>
      </div>

      {/* ── Parent Invite Code ──────────────────────────────────────────── */}
      {profile?.invite_code && profile?.role === 'student' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👨‍👩‍👧</span>
            <h2 className="text-sm font-bold text-[#2D3436]">
              {lang === 'bm' ? 'Kod Jemputan Ibu Bapa' : 'Parent Invite Code'}
            </h2>
          </div>
          <p className="text-xs text-[#636E72] mb-3">
            {lang === 'bm'
              ? 'Kongsi kod ini dengan ibu bapa agar mereka boleh pantau kemajuan anda'
              : 'Share this code with your parents so they can track your progress'}
          </p>

          {/* Code display */}
          <div className="bg-[#F8F9FE] rounded-xl px-4 py-3 text-center mb-3">
            <span className="text-2xl font-mono font-bold tracking-widest text-[#6C5CE7]">
              {profile.invite_code}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.invite_code!)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#6C5CE7]/10 text-[#6C5CE7] font-semibold text-sm py-2.5 rounded-xl active:scale-[0.97] transition-all"
            >
              {copied ? '✓' : '📋'} {copied
                ? (lang === 'bm' ? 'Disalin!' : 'Copied!')
                : (lang === 'bm' ? 'Salin' : 'Copy')}
            </button>
            <button
              onClick={() => {
                const text = lang === 'bm'
                  ? `Saya guna SPMKita untuk belajar SPM! 📚 Gunakan kod jemputan saya untuk pantau kemajuan saya: ${profile.invite_code}\n\nMuat turun di: https://spmkita.vercel.app`
                  : `I'm using SPMKita to study for SPM! 📚 Use my invite code to track my progress: ${profile.invite_code}\n\nDownload at: https://spmkita.vercel.app`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#25D366] font-semibold text-sm py-2.5 rounded-xl active:scale-[0.97] transition-all"
            >
              💬 WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* ── Stats grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon="⭐"
          value={(profile?.xp_total || 0).toLocaleString()}
          label={lang === 'bm' ? 'Jumlah XP' : 'Total XP'}
          valueColor="text-[#FDCB6E]"
        />
        <StatCard
          icon="🔥"
          value={String(profile?.current_streak || 0)}
          label={lang === 'bm' ? 'Streak Semasa' : 'Current Streak'}
          iconClass={(profile?.current_streak || 0) > 0 ? 'streak-fire' : ''}
        />
        <StatCard
          icon="🏅"
          value={String(profile?.longest_streak || 0)}
          label={lang === 'bm' ? 'Streak Terbaik' : 'Longest Streak'}
        />
        <StatCard
          icon="🇲🇾"
          value={nationalRank ? `#${nationalRank}` : '-'}
          label={lang === 'bm' ? 'Ranking Nasional' : 'National Rank'}
          valueColor="text-[#6C5CE7]"
        />
      </div>

      {/* ── Achievements ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#2D3436] mb-3">
          🏆 {lang === 'bm' ? 'Pencapaian' : 'Achievements'}
          <span className="text-sm font-normal text-[#636E72] ml-2">
            {earnedIds.size}/{achievements.length}
          </span>
        </h2>

        {achievements.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-[#636E72]">
              {lang === 'bm' ? 'Tiada pencapaian lagi.' : 'No achievements yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {achievements.map(ach => {
              const earned = earnedIds.has(ach.id)
              return (
                <div
                  key={ach.id}
                  className={`bg-white rounded-2xl p-3 text-center shadow-sm transition-all ${
                    earned ? '' : 'opacity-40 grayscale'
                  }`}
                >
                  <div className="text-2xl mb-1">{earned ? ach.icon : '🔒'}</div>
                  <p className="text-xs font-semibold text-[#2D3436] leading-tight">
                    {lang === 'bm' ? ach.name_bm : ach.name_en}
                  </p>
                  {ach.description_en && (
                    <p className="text-[10px] text-[#636E72] mt-0.5 leading-tight">
                      {lang === 'bm' ? ach.description_bm : ach.description_en}
                    </p>
                  )}
                  <p className="text-xs text-[#FDCB6E] font-bold mt-1">+{ach.xp_reward} XP</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Activity statistics ─────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#2D3436] mb-3">
          📊 {lang === 'bm' ? 'Statistik' : 'Statistics'}
        </h2>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <ActivityRow
            icon="📝"
            label={lang === 'bm' ? 'Soalan Dijawab' : 'Questions Answered'}
            value={stats.totalAttempts.toLocaleString()}
          />
          <ActivityRow
            icon="✅"
            label={lang === 'bm' ? 'Peratus Betul' : 'Correct Rate'}
            value={`${correctPct}%`}
            valueColor={
              correctPct >= 70
                ? 'text-[#00B894]'
                : correctPct >= 40
                ? 'text-[#FDCB6E]'
                : 'text-[#E17055]'
            }
          />
          <ActivityRow
            icon="⚡"
            label={lang === 'bm' ? 'Cabaran Selesai' : 'Challenges Done'}
            value={stats.challengesCompleted.toLocaleString()}
          />
          <ActivityRow
            icon="🎯"
            label={lang === 'bm' ? 'Topik Dikuasai' : 'Topics Mastered'}
            value={stats.topicsMastered.toLocaleString()}
            isLast
          />
        </div>
      </div>

      {/* ── Log out ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleLogout}
        className="w-full bg-[#E17055] text-white font-semibold py-3 rounded-xl mb-4"
      >
        {lang === 'bm' ? 'Log Keluar' : 'Log Out'}
      </button>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, value, label, valueColor, iconClass }: {
  icon: string
  value: string
  label: string
  valueColor?: string
  iconClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
      <div className={`text-2xl ${iconClass || ''}`}>{icon}</div>
      <p className={`text-2xl font-bold mt-1 ${valueColor || 'text-[#2D3436]'}`}>{value}</p>
      <p className="text-xs text-[#636E72]">{label}</p>
    </div>
  )
}

function ActivityRow({ icon, label, value, valueColor, isLast }: {
  icon: string
  label: string
  value: string
  valueColor?: string
  isLast?: boolean
}) {
  return (
    <div className={`flex items-center px-4 py-3.5 ${isLast ? '' : 'border-b border-gray-50'}`}>
      <span className="text-lg mr-3">{icon}</span>
      <span className="flex-1 text-sm text-[#2D3436]">{label}</span>
      <span className={`text-sm font-bold ${valueColor || 'text-[#2D3436]'}`}>{value}</span>
    </div>
  )
}

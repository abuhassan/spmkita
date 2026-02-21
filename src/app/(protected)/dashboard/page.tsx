'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Subject, DailyChallenge } from '@/types/database'
import { FORM_LABELS } from '@/lib/constants'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subjects, setSubjects] = useState<(Subject & { hasTodayChallenge: boolean })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData?.onboarding_completed) {
      router.push('/onboarding')
      return
    }

    setProfile(profileData)

    // Update streak
    await supabase.rpc('update_streak', { p_student_id: user.id })

    // Load enrolled subjects
    const { data: enrollments } = await supabase
      .from('student_subjects')
      .select('subject_id, subjects(*)')
      .eq('student_id', user.id)

    // Check today's challenges
    const today = new Date().toISOString().split('T')[0]
    const { data: todayChallenges } = await supabase
      .from('daily_challenges')
      .select('subject_id, completed_at')
      .eq('student_id', user.id)
      .eq('challenge_date', today)

    const challengeMap = new Map(
      (todayChallenges || []).map(c => [c.subject_id, c.completed_at !== null])
    )

    if (enrollments) {
      const subjectList = enrollments
        .map(e => ({
          ...(e.subjects as unknown as Subject),
          hasTodayChallenge: challengeMap.has((e.subjects as unknown as Subject).id),
        }))
        .sort((a, b) => a.display_order - b.display_order)
      setSubjects(subjectList)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎓</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  const lang = profile?.preferred_language || 'bm'

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3436]">
            {(profile?.preferred_language === 'en' ? 'Hi' : 'Hai')}, {profile?.display_name}! 👋
          </h1>
          <p className="text-sm text-[#636E72]">
            {profile?.preferred_language === 'en' ? `Form ${profile?.form_level}` : `Tingkatan ${profile?.form_level}`} • {profile?.school_name}
          </p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="text-2xl"
        >
          ⚙️
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Streak */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className={`text-2xl ${(profile?.current_streak || 0) > 0 ? 'streak-fire' : ''}`}>
            🔥
          </div>
          <p className="text-2xl font-bold text-[#2D3436] mt-1">
            {profile?.current_streak || 0}
          </p>
          <p className="text-xs text-[#636E72]">Streak</p>
        </div>

        {/* XP */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl">⭐</div>
          <p className="text-2xl font-bold text-[#FDCB6E] mt-1">
            {(profile?.xp_total || 0).toLocaleString()}
          </p>
          <p className="text-xs text-[#636E72]">XP</p>
        </div>

        {/* Best Streak */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl">🏅</div>
          <p className="text-2xl font-bold text-[#2D3436] mt-1">
            {profile?.longest_streak || 0}
          </p>
          {profile?.preferred_language === 'en' ? 'Best' : 'Terbaik'}
        </div>
      </div>

      {/* Daily Challenge Card */}
      <div className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] rounded-2xl p-5 mb-6 shadow-lg">
        <div className="flex items-center justify-between text-white">
          <div>
            {profile?.preferred_language === 'en' ? "Today's Challenge" : 'Cabaran Hari Ini'}
            <h2 className="text-xl font-bold mt-1">
              {profile?.preferred_language === 'en' ? '5 Questions' : '5 Soalan'} ⚡
            </h2>
            <p className="text-sm text-white/70 mt-1">
              +50 XP • {lang === 'bm' ? 'Bonus sempurna +100 XP' : 'Perfect bonus +100 XP'}
            </p>
          </div>
          <div className="text-5xl">🎯</div>
        </div>

        <button
          onClick={() => router.push('/challenge')}
          className="mt-4 w-full bg-white text-[#6C5CE7] font-bold py-3 rounded-xl hover:bg-white/90 transition-colors"
        >
          {lang === 'bm' ? 'Mula Cabaran!' : 'Start Challenge!'}
        </button>
      </div>

      {/* Subjects */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#2D3436] mb-3">
          {lang === 'bm' ? 'Subjek Anda' : 'Your Subjects'}
        </h3>

        <div className="space-y-3">
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => router.push(`/practice?subject=${subject.id}`)}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left"
            >
              <span className="text-3xl">{subject.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-[#2D3436]">
                  {lang === 'bm' ? subject.name_bm : subject.name_en}
                </p>
                <p className="text-xs text-[#636E72]">
                  {lang === 'bm' ? 'Tekan untuk latihan' : 'Tap to practice'}
                </p>
              </div>
              <span className="text-[#6C5CE7]">→</span>
            </button>
          ))}

          {subjects.length === 0 && (
            <div className="text-center py-8 bg-white rounded-2xl">
              <p className="text-4xl mb-2">📚</p>
              <p className="text-[#636E72]">
                Tiada subjek didaftarkan lagi.
              </p>
              <button
                onClick={() => router.push('/onboarding')}
                className="mt-3 text-[#6C5CE7] font-medium underline"
              >
                Pilih subjek
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => router.push('/leaderboard')}
          className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
        >
          <span className="text-2xl">🏆</span>
          Leaderboard  →  {profile?.preferred_language === 'en' ? 'Leaderboard' : 'Kedudukan'}
        </button>
        <button
          onClick={() => router.push('/profile')}
          className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-center"
        >
          <span className="text-2xl">📊</span>
          <p className="text-sm font-medium text-[#2D3436] mt-1">
            {lang === 'bm' ? 'Pencapaian' : 'Achievements'}
          </p>
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, LeaderboardEntry } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────

type LeaderboardScope = 'national' | 'state' | 'school'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [scope, setScope] = useState<LeaderboardScope>('national')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)

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
      setPageLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load leaderboard when scope or profile changes
  useEffect(() => {
    if (!pageLoading && profile) {
      loadLeaderboard(scope)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, pageLoading])

  // ─── Data loading ──────────────────────────────────────────────────────

  async function loadLeaderboard(s: LeaderboardScope) {
    setListLoading(true)

    const { data } = await supabase.rpc('get_leaderboard', {
      p_scope: s,
      p_state: s === 'state' ? (profile?.state || null) : null,
      p_school: s === 'school' ? (profile?.school_name || null) : null,
      p_limit: 50,
    })

    setEntries((data as LeaderboardEntry[]) || [])
    setListLoading(false)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏆</div>
          <p className="text-[#636E72]">Memuatkan...</p>
        </div>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const myEntry = entries.find(e => e.student_id === userId.current)

  const tabs: { key: LeaderboardScope; label: string; icon: string }[] = [
    { key: 'national', label: lang === 'bm' ? 'Nasional' : 'National', icon: '🇲🇾' },
    { key: 'state', label: lang === 'bm' ? 'Negeri' : 'State', icon: '🏛️' },
    { key: 'school', label: lang === 'bm' ? 'Sekolah' : 'School', icon: '🏫' },
  ]

  // Subtitle shows context for each scope
  const scopeSubtitle = scope === 'state' && profile?.state
    ? profile.state
    : scope === 'school' && profile?.school_name
    ? profile.school_name
    : scope === 'national'
    ? (lang === 'bm' ? 'Seluruh Malaysia' : 'All of Malaysia')
    : ''

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#2D3436] mb-0.5">
        🏆 {lang === 'bm' ? 'Papan Pendahulu' : 'Leaderboard'}
      </h1>
      <p className="text-sm text-[#636E72] mb-4">{scopeSubtitle}</p>

      {/* Scope tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setScope(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              scope === tab.key
                ? 'bg-[#6C5CE7] text-white shadow-md'
                : 'bg-white text-[#636E72] border border-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {listLoading ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-3 animate-pulse">🏆</div>
          <p className="text-[#636E72]">
            {lang === 'bm' ? 'Memuatkan ranking...' : 'Loading rankings...'}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-[#636E72]">
            {lang === 'bm'
              ? 'Tiada data leaderboard lagi.'
              : 'No leaderboard data yet.'}
          </p>
          <p className="text-sm text-[#636E72] mt-1">
            {lang === 'bm'
              ? 'Selesaikan cabaran untuk muncul di sini!'
              : 'Complete challenges to appear here!'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Podium (top 3) ─────────────────────────────────── */}
          {top3.length >= 3 ? (
            <div className="flex items-end justify-center gap-3 mb-6 px-2">
              {/* 2nd place — left */}
              <PodiumCard
                entry={top3[1]}
                rank={2}
                medal="🥈"
                barColor="bg-[#C0C0C0]/20"
                barBorder="border-[#C0C0C0]"
                barHeight="h-20"
                isMe={top3[1].student_id === userId.current}
                lang={lang}
              />
              {/* 1st place — center, tallest */}
              <PodiumCard
                entry={top3[0]}
                rank={1}
                medal="🥇"
                barColor="bg-[#FDCB6E]/20"
                barBorder="border-[#FDCB6E]"
                barHeight="h-28"
                isMe={top3[0].student_id === userId.current}
                lang={lang}
              />
              {/* 3rd place — right */}
              <PodiumCard
                entry={top3[2]}
                rank={3}
                medal="🥉"
                barColor="bg-[#CD7F32]/20"
                barBorder="border-[#CD7F32]"
                barHeight="h-16"
                isMe={top3[2].student_id === userId.current}
                lang={lang}
              />
            </div>
          ) : (
            /* Fewer than 3 — show as simple rows */
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              {top3.map((entry, i) => (
                <RankRow
                  key={entry.student_id}
                  entry={entry}
                  isMe={entry.student_id === userId.current}
                  medal={['🥇', '🥈', '🥉'][i]}
                  lang={lang}
                />
              ))}
            </div>
          )}

          {/* ── Remaining list (4th onwards) ───────────────────── */}
          {rest.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              {rest.map(entry => (
                <RankRow
                  key={entry.student_id}
                  entry={entry}
                  isMe={entry.student_id === userId.current}
                  lang={lang}
                />
              ))}
            </div>
          )}

          {/* ── "Your position" banner if not visible ──────────── */}
          {myEntry && !entries.some(e => e.student_id === userId.current) && (
            <MyPositionBanner entry={myEntry} lang={lang} />
          )}

          {/* Always show current user position if they exist */}
          {myEntry && (
            <div className="bg-[#6C5CE7]/5 rounded-2xl p-4 border-2 border-[#6C5CE7]/20">
              <p className="text-xs text-[#636E72] mb-2 font-medium">
                {lang === 'bm' ? 'Kedudukan Anda' : 'Your Position'}
              </p>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#6C5CE7] text-white text-sm font-bold">
                  {myEntry.rank}
                </span>
                {myEntry.avatar_url ? (
                  <img src={myEntry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center text-sm font-bold text-[#6C5CE7] shrink-0">
                    {(myEntry.display_name || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#6C5CE7] truncate">{myEntry.display_name}</p>
                  <p className="text-xs text-[#636E72] truncate">{myEntry.school_name || ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#FDCB6E]">{myEntry.xp_total.toLocaleString()}</p>
                  <p className="text-xs text-[#636E72]">🔥 {myEntry.current_streak}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Podium card ───────────────────────────────────────────────────────────

function PodiumCard({ entry, rank, medal, barColor, barBorder, barHeight, isMe, lang }: {
  entry: LeaderboardEntry
  rank: number
  medal: string
  barColor: string
  barBorder: string
  barHeight: string
  isMe: boolean
  lang: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Avatar */}
      <div className={`relative mb-1 ${isMe ? 'ring-2 ring-[#6C5CE7] ring-offset-2' : ''} rounded-full`}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center text-lg font-bold text-[#6C5CE7]">
            {(entry.display_name || '?')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <p className={`text-xs font-semibold text-center truncate w-full ${isMe ? 'text-[#6C5CE7]' : 'text-[#2D3436]'}`}>
        {entry.display_name || (lang === 'bm' ? 'Pelajar' : 'Student')}
      </p>
      <p className="text-xs text-[#FDCB6E] font-bold">{entry.xp_total.toLocaleString()}</p>

      {/* Podium bar */}
      <div
        className={`w-full ${barHeight} rounded-t-xl mt-1 flex items-start justify-center pt-2 border-t-4 ${barColor} ${barBorder}`}
      >
        <span className="text-2xl">{medal}</span>
      </div>
    </div>
  )
}

// ─── Rank row ──────────────────────────────────────────────────────────────

function RankRow({ entry, isMe, medal, lang }: {
  entry: LeaderboardEntry
  isMe: boolean
  medal?: string
  lang: string
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 ${
      isMe ? 'bg-[#6C5CE7]/5' : ''
    }`}>
      {/* Rank */}
      <span className={`w-8 text-center text-sm font-bold shrink-0 ${
        isMe ? 'text-[#6C5CE7]' : 'text-[#636E72]'
      }`}>
        {medal || `#${entry.rank}`}
      </span>

      {/* Avatar */}
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center text-sm font-bold text-[#6C5CE7] shrink-0">
          {(entry.display_name || '?')[0].toUpperCase()}
        </div>
      )}

      {/* Name + school */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isMe ? 'text-[#6C5CE7]' : 'text-[#2D3436]'}`}>
          {entry.display_name || (lang === 'bm' ? 'Pelajar' : 'Student')}
          {isMe && (
            <span className="text-xs font-normal ml-1">({lang === 'bm' ? 'Anda' : 'You'})</span>
          )}
        </p>
        <p className="text-xs text-[#636E72] truncate">{entry.school_name || ''}</p>
      </div>

      {/* XP + Streak */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-[#FDCB6E]">{entry.xp_total.toLocaleString()}</p>
        <p className="text-xs text-[#636E72]">🔥 {entry.current_streak}</p>
      </div>
    </div>
  )
}

// ─── "Your position" banner (if outside visible range) ─────────────────────

function MyPositionBanner({ entry, lang }: {
  entry: LeaderboardEntry
  lang: string
}) {
  return (
    <div className="bg-[#6C5CE7]/5 rounded-2xl p-4 mb-4 border-2 border-[#6C5CE7]/20">
      <p className="text-xs text-[#636E72] mb-2 font-medium">
        {lang === 'bm' ? 'Kedudukan Anda' : 'Your Position'}
      </p>
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#6C5CE7] text-white text-sm font-bold">
          {entry.rank}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#6C5CE7]">{entry.display_name}</p>
          <p className="text-xs text-[#636E72]">{entry.school_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#FDCB6E]">{entry.xp_total.toLocaleString()}</p>
          <p className="text-xs text-[#636E72]">🔥 {entry.current_streak}</p>
        </div>
      </div>
    </div>
  )
}

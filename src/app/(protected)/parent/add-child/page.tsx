'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types/database'

export default function AddChildPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [childName, setChildName] = useState('')
  const [childSchool, setChildSchool] = useState('')

  const userId = useRef<string>('')

  const lang = profile?.preferred_language || 'bm'

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      userId.current = user.id

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!data || data.role !== 'parent') { router.push('/dashboard'); return }
      setProfile(data)
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')

    const code = inviteCode.trim().toUpperCase()

    // Find student with this invite code
    const { data: child } = await supabase
      .from('profiles')
      .select('id, display_name, school_name')
      .eq('invite_code', code)
      .eq('role', 'student')
      .single()

    if (!child) {
      setError(lang === 'bm'
        ? 'Kod tidak sah. Sila semak semula dengan anak anda.'
        : 'Invalid code. Please check with your child.')
      setSubmitting(false)
      return
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from('parent_children')
      .select('id')
      .eq('parent_id', userId.current)
      .eq('child_id', child.id)
      .eq('status', 'active')
      .single()

    if (existing) {
      setError(lang === 'bm'
        ? 'Anak ini sudah disambung dengan akaun anda.'
        : 'This child is already linked to your account.')
      setSubmitting(false)
      return
    }

    // Create parent-child link
    await supabase.from('parent_children').insert({
      parent_id: userId.current,
      child_id: child.id,
      invite_code: code,
      status: 'active',
    })

    setChildName(child.display_name || '')
    setChildSchool(child.school_name || '')
    setSuccess(true)
    setSubmitting(false)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🔗</div>
          <p className="text-[#636E72]">{lang === 'bm' ? 'Memuatkan...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-12">
        <div className="text-center space-y-6">
          <div className="text-6xl xp-pop">✅</div>
          <h1 className="text-2xl font-bold text-[#2D3436]">
            {lang === 'bm' ? 'Berjaya!' : 'Success!'}
          </h1>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-[#636E72] mb-1">
              {lang === 'bm' ? 'Anak anda:' : 'Your child:'}
            </p>
            <p className="text-xl font-bold text-[#2D3436]">{childName}</p>
            {childSchool && (
              <p className="text-sm text-[#636E72] mt-1">{childSchool}</p>
            )}
          </div>

          <p className="text-sm text-[#636E72]">
            {lang === 'bm'
              ? 'Anda kini boleh pantau kemajuan anak ini dari dashboard anda.'
              : 'You can now monitor this child\'s progress from your dashboard.'}
          </p>

          <button
            onClick={() => router.push('/parent')}
            className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl shadow-md"
          >
            {lang === 'bm' ? '← Kembali ke Dashboard' : '← Back to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/parent')}
          className="text-[#636E72] text-lg"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-[#2D3436]">
          {lang === 'bm' ? 'Tambah Anak' : 'Add Child'}
        </h1>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🔗</div>
          <p className="text-[#636E72]">
            {lang === 'bm'
              ? 'Masukkan kod jemputan dari anak anda'
              : 'Enter the invite code from your child'}
          </p>
        </div>

        {/* How to find code hint */}
        <div className="bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 rounded-xl p-3">
          <p className="text-xs text-[#636E72] leading-relaxed">
            💡 {lang === 'bm'
              ? 'Anak anda boleh cari kod jemputan di halaman Profil mereka dalam app SPMKita.'
              : 'Your child can find their invite code on their Profile page in the SPMKita app.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2D3436] mb-1">
            {lang === 'bm' ? 'Kod Jemputan' : 'Invite Code'}
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="ABC12345"
            className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none text-center text-xl font-mono font-bold tracking-widest uppercase"
            maxLength={12}
          />
          {error && (
            <p className="text-sm text-[#E17055] mt-2">{error}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!inviteCode.trim() || submitting}
          className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
        >
          {submitting
            ? (lang === 'bm' ? 'Menyemak...' : 'Checking...')
            : (lang === 'bm' ? 'Sambung Anak' : 'Connect Child')}
        </button>
      </div>
    </div>
  )
}

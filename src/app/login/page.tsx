'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Ralat: ' + error.message)
    } else {
      setMessage('✅ Semak email anda untuk link log masuk!')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col items-center justify-center px-6">
      {/* Back */}
      <Link href="/" className="absolute top-6 left-6 text-[#636E72] hover:text-[#2D3436]">
        ← Kembali
      </Link>

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-3xl font-extrabold text-[#2D3436]">
            SPM<span className="text-[#6C5CE7]">Kita</span>
          </h1>
          <p className="mt-2 text-[#636E72]">Log masuk untuk mula belajar</p>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 font-medium text-[#2D3436] shadow-sm hover:shadow-md transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Log masuk dengan Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-[#636E72]">atau</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email Magic Link */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#2D3436] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.edu.my"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
          >
            {loading ? 'Menghantar...' : 'Hantar Magic Link ✨'}
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm text-center ${message.startsWith('✅') ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[#636E72]">
          Dengan log masuk, anda bersetuju dengan{' '}
          <span className="underline">Terma Perkhidmatan</span> kami.
        </p>
      </div>
    </div>
  )
}

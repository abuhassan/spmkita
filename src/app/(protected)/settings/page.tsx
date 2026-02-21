'use client'

import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-[#2D3436] mb-4">⚙️ Tetapan</h1>
      <button
        onClick={handleLogout}
        className="w-full bg-[#E17055] text-white font-semibold py-3 rounded-xl"
      >
        Log Keluar
      </button>
    </div>
  )
}

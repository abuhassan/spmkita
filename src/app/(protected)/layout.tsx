'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const studentNav = [
  { href: '/dashboard', label_bm: 'Utama', label_en: 'Home', icon: '🏠' },
  { href: '/challenge', label_bm: 'Cabaran', label_en: 'Challenge', icon: '⚡' },
  { href: '/learn', label_bm: 'Belajar', label_en: 'Learn', icon: '📖' },
  { href: '/leaderboard', label_bm: 'Ranking', label_en: 'Ranking', icon: '🏆' },
  { href: '/profile', label_bm: 'Profil', label_en: 'Profile', icon: '👤' },
]

const parentNav = [
  { href: '/parent', label_bm: 'Utama', label_en: 'Home', icon: '🏠' },
  { href: '/parent/reports', label_bm: 'Laporan', label_en: 'Reports', icon: '📊' },
  { href: '/parent/add-child', label_bm: 'Tambah', label_en: 'Add Child', icon: '➕' },
  { href: '/profile', label_bm: 'Profil', label_en: 'Profile', icon: '👤' },
]

const tutorNav = [
  { href: '/tutor', label_bm: 'Utama', label_en: 'Home', icon: '🏠' },
  { href: '/tutor/reports', label_bm: 'Laporan', label_en: 'Reports', icon: '📊' },
  { href: '/tutor/add-child', label_bm: 'Tambah', label_en: 'Add Student', icon: '➕' },
  { href: '/profile', label_bm: 'Profil', label_en: 'Profile', icon: '👤' },
]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [lang, setLang] = useState<'bm' | 'en' | null>(null)
  const [role, setRole] = useState<'student' | 'parent' | 'tutor' | null>(null)
  const [toggling, setToggling] = useState(false)

  // Load current language and role from profile
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('preferred_language, role')
        .eq('id', user.id)
        .single()
      if (data) {
        setLang(data.preferred_language as 'bm' | 'en')
        setRole((data.role as 'student' | 'parent' | 'tutor') || 'student')
      }
    }
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redirect parents from student-only routes to /parent
  useEffect(() => {
    if (role === 'parent' && pathname === '/dashboard') {
      router.replace('/parent')
    }
    if (role === 'tutor' && pathname === '/dashboard') {
      router.replace('/tutor')
    }
  }, [role, pathname, router])

  async function toggleLang() {
    if (toggling || !lang) return
    setToggling(true)

    const newLang = lang === 'bm' ? 'en' : 'bm'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToggling(false); return }

    await supabase
      .from('profiles')
      .update({ preferred_language: newLang })
      .eq('id', user.id)

    setLang(newLang)
    setToggling(false)
    window.location.reload()
  }

  const navItems = role === 'tutor' ? tutorNav : role === 'parent' ? parentNav : studentNav
  return (
    <div className="min-h-screen bg-[#F8F9FE] pb-20">
      {/* Language Toggle — fixed top-right */}
      {lang && (
        <button
          onClick={toggleLang}
          disabled={toggling}
          className="fixed top-3 right-3 z-50 flex items-center gap-1.5 bg-white border-2 border-[#6C5CE7]/20 rounded-full px-3 py-1.5 shadow-md active:scale-95 transition-all disabled:opacity-60"
        >
          <span className="text-sm">{lang === 'bm' ? '🇲🇾' : '🇬🇧'}</span>
          <span className="text-xs font-bold text-[#6C5CE7]">
            {lang === 'bm' ? 'BM' : 'EN'}
          </span>
        </button>
      )}

      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-around">
          {navItems.map(item => {
            const isActive = item.href === '/parent'
              ? pathname === '/parent'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 transition-colors ${
                  isActive ? 'text-[#6C5CE7]' : 'text-[#636E72]'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium mt-0.5">{lang === 'en' ? item.label_en : item.label_bm}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-[#6C5CE7] rounded-full mt-0.5" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
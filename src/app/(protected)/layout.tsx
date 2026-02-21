'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/learn', label: 'Belajar', icon: '📖' },
  { href: '/leaderboard', label: 'Ranking', icon: '🏆' },
  { href: '/profile', label: 'Profil', icon: '👤' },
]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F8F9FE] pb-20">
      {children}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-around">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-4 transition-colors ${
                  isActive ? 'text-[#6C5CE7]' : 'text-[#636E72]'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium mt-0.5">{item.label}</span>
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

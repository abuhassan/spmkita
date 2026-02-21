import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Top decorative wave */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] rounded-b-[60px]" />
      
      {/* Floating accent circles */}
      <div className="absolute top-20 left-8 w-20 h-20 bg-[#FBBF24] rounded-full opacity-20" />
      <div className="absolute top-40 right-6 w-14 h-14 bg-[#34D399] rounded-full opacity-25" />
      <div className="absolute top-72 left-16 w-10 h-10 bg-[#F472B6] rounded-full opacity-20" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-6 pt-16 pb-10">
        {/* Logo section on purple bg */}
        <div className="text-center text-white mb-12">
          <div className="text-7xl mb-4">🎓</div>
          <h1 className="text-5xl font-extrabold tracking-tight">
            SPM<span className="text-[#FBBF24]">Kita</span>
          </h1>
          <p className="mt-2 text-base text-white/80 font-medium">
            Persediaan SPM Terbaik 🇲🇾
          </p>
        </div>

        {/* White card section */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 -mt-2 mb-8">
          {/* Tagline */}
          <div className="text-center mb-8">
            <p className="text-2xl font-extrabold text-[#1E1B4B]">
              Belajar 5 minit sehari.
            </p>
            <p className="text-2xl font-extrabold text-[#7C3AED]">
              Skor SPM naik! 🚀
            </p>
            <p className="mt-3 text-[#6B7280] text-sm leading-relaxed">
              Cabaran harian, latihan interaktif, dan AI tutor — semua dalam satu app untuk pelajar Tingkatan 1 hingga 5.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-[#F3F0FF] rounded-2xl p-4 text-center border-2 border-[#EDE9FE] hover:border-[#8B5CF6] transition-colors">
              <div className="text-3xl mb-1">⚡</div>
              <p className="text-sm font-bold text-[#5B21B6]">Cabaran Harian</p>
            </div>
            <div className="bg-[#FFF7ED] rounded-2xl p-4 text-center border-2 border-[#FFEDD5] hover:border-[#F59E0B] transition-colors">
              <div className="text-3xl mb-1">🔥</div>
              <p className="text-sm font-bold text-[#B45309]">Streak & XP</p>
            </div>
            <div className="bg-[#EFF6FF] rounded-2xl p-4 text-center border-2 border-[#DBEAFE] hover:border-[#3B82F6] transition-colors">
              <div className="text-3xl mb-1">🏆</div>
              <p className="text-sm font-bold text-[#1D4ED8]">Leaderboard</p>
            </div>
            <div className="bg-[#ECFDF5] rounded-2xl p-4 text-center border-2 border-[#D1FAE5] hover:border-[#10B981] transition-colors">
              <div className="text-3xl mb-1">🤖</div>
              <p className="text-sm font-bold text-[#047857]">AI Tutor</p>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="block w-full bg-[#7C3AED] text-white font-extrabold text-lg py-4 rounded-2xl text-center shadow-lg shadow-[#7C3AED]/30 hover:bg-[#6D28D9] hover:shadow-xl hover:shadow-[#7C3AED]/40 transform hover:scale-[1.02] transition-all duration-200"
          >
            Mula Sekarang — Percuma! 🎯
          </Link>

          <p className="mt-3 text-center text-xs text-[#9CA3AF]">
            Tiada kad kredit diperlukan
          </p>
        </div>

        {/* Stats bar */}
        <div className="w-full max-w-md bg-[#F9FAFB] rounded-2xl p-5 flex justify-around items-center border border-[#E5E7EB]">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-[#7C3AED]">2M+</p>
            <p className="text-xs text-[#6B7280] font-medium">Pelajar SPM</p>
          </div>
          <div className="w-px h-10 bg-[#E5E7EB]" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-[#F59E0B]">9</p>
            <p className="text-xs text-[#6B7280] font-medium">Subjek</p>
          </div>
          <div className="w-px h-10 bg-[#E5E7EB]" />
          <div className="text-center">
            <p className="text-2xl font-extrabold text-[#10B981]">5</p>
            <p className="text-xs text-[#6B7280] font-medium">Tingkatan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

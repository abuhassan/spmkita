'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { MALAYSIAN_STATES } from '@/types/database'
import type { Subject } from '@/types/database'

type Step = 'profile' | 'subjects' | 'ready'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('profile')
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Profile form
  const [displayName, setDisplayName] = useState('')
  const [formLevel, setFormLevel] = useState<number>(1)
  const [schoolName, setSchoolName] = useState('')
  const [state, setState] = useState('')
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')

  // Subject selection
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  useEffect(() => {
    loadSubjects()
  }, [])

  async function loadSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    if (data) setSubjects(data)
  }

  async function handleProfileSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      display_name: displayName,
      form_level: formLevel,
      school_name: schoolName || null,
      state: state || null,
      preferred_language: language,
    }).eq('id', user.id)

    setStep('subjects')
    setLoading(false)
  }

  async function handleSubjectsSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Enroll in selected subjects
    const enrollments = selectedSubjects.map(subjectId => ({
      student_id: user.id,
      subject_id: subjectId,
    }))

    await supabase.from('student_subjects').insert(enrollments)

    // Mark onboarding complete
    await supabase.from('profiles').update({
      onboarding_completed: true,
      last_active_date: new Date().toISOString().split('T')[0],
    }).eq('id', user.id)

    setStep('ready')
    setLoading(false)
  }

  function toggleSubject(id: string) {
    setSelectedSubjects(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const filteredSubjects = subjects.filter(s =>
    s.form_levels.includes(formLevel)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {(['profile', 'subjects', 'ready'] as Step[]).map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                step === s ? 'bg-[#6C5CE7]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 'profile' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">Selamat Datang!</h2>
              <p className="text-[#636E72] mt-1">Beritahu kami tentang diri anda</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  Nama Paparan *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nama yang ditunjukkan di leaderboard"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  Tingkatan *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setFormLevel(level)}
                      className={`py-3 rounded-xl font-bold text-lg transition-all ${
                        formLevel === level
                          ? 'bg-[#6C5CE7] text-white shadow-lg'
                          : 'bg-white border border-gray-200 text-[#2D3436] hover:border-[#6C5CE7]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  Nama Sekolah (pilihan)
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  placeholder="SMK..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  Negeri
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                >
                  <option value="">Pilih negeri</option>
                  {MALAYSIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  Bahasa Pilihan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'bm' as const, label: '🇲🇾 Bahasa Melayu' },
                    { val: 'en' as const, label: '🇬🇧 English' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setLanguage(opt.val)}
                      className={`py-3 rounded-xl font-medium transition-all ${
                        language === opt.val
                          ? 'bg-[#6C5CE7] text-white'
                          : 'bg-white border border-gray-200 text-[#2D3436]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleProfileSubmit}
              disabled={!displayName || loading}
              className="w-full bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Seterusnya →'}
            </button>
          </div>
        )}

        {/* Step 2: Subject Selection */}
        {step === 'subjects' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">Pilih Subjek</h2>
              <p className="text-[#636E72] mt-1">
                Subjek yang anda mahu fokus untuk Tingkatan {formLevel}
              </p>
            </div>

            <div className="space-y-3">
              {filteredSubjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                    selectedSubjects.includes(subject.id)
                      ? 'bg-[#6C5CE7] text-white shadow-lg'
                      : 'bg-white border border-gray-200 text-[#2D3436] hover:border-[#6C5CE7]'
                  }`}
                >
                  <span className="text-2xl">{subject.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold">
                      {language === 'bm' ? subject.name_bm : subject.name_en}
                    </p>
                  </div>
                  {selectedSubjects.includes(subject.id) && (
                    <span className="ml-auto text-xl">✓</span>
                  )}
                </button>
              ))}

              {filteredSubjects.length === 0 && (
                <div className="text-center py-8 text-[#636E72]">
                  <p className="text-4xl mb-2">🔜</p>
                  <p>Subjek untuk Tingkatan {formLevel} akan datang!</p>
                  <p className="text-sm mt-1">Matematik tersedia untuk semua tingkatan.</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('profile')}
                className="flex-1 bg-white border border-gray-200 text-[#2D3436] font-semibold py-3.5 rounded-xl"
              >
                ← Kembali
              </button>
              <button
                onClick={handleSubjectsSubmit}
                disabled={selectedSubjects.length === 0 || loading}
                className="flex-1 bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Mula! 🚀'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 'ready' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-[#2D3436]">Anda sudah sedia!</h2>
            <p className="text-[#636E72] text-lg">
              Mari mulakan cabaran pertama anda.
            </p>

            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <p className="font-semibold text-[#2D3436]">Apa yang menanti anda:</p>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <span className="text-sm">5 soalan cabaran harian</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <span className="text-sm">Kumpul streak & XP setiap hari</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏆</span>
                  <span className="text-sm">Bersaing di leaderboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📈</span>
                  <span className="text-sm">Jejak kemajuan anda</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#6C5CE7] text-white font-bold text-lg py-4 rounded-2xl hover:bg-[#5A4BD1] transition-colors shadow-lg"
            >
              Pergi ke Dashboard 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

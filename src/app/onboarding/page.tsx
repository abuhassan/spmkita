'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { MALAYSIAN_STATES } from '@/types/database'
import type { Subject } from '@/types/database'

type Role = 'student' | 'parent'
type Step = 'role' | 'profile' | 'subjects' | 'ready' | 'parent_info' | 'parent_code' | 'parent_done'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Student profile form
  const [displayName, setDisplayName] = useState('')
  const [formLevel, setFormLevel] = useState<number>(1)
  const [schoolName, setSchoolName] = useState('')
  const [state, setState] = useState('')
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  // Parent form
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [childName, setChildName] = useState('')
  const [childSchool, setChildSchool] = useState('')

  const lang = language

  useEffect(() => {
    loadSubjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    if (data) setSubjects(data)
  }

  // ─── Student Handlers ──────────────────────────────────────────────────

  function handleRoleSelect(r: Role) {
    setRole(r)
    setStep(r === 'student' ? 'profile' : 'parent_info')
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
      role: 'student',
    }).eq('id', user.id)

    setStep('subjects')
    setLoading(false)
  }

  async function handleSubjectsSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const enrollments = selectedSubjects.map(subjectId => ({
      student_id: user.id,
      subject_id: subjectId,
    }))

    await supabase.from('student_subjects').insert(enrollments)

    await supabase.from('profiles').update({
      onboarding_completed: true,
      last_active_date: new Date().toISOString().split('T')[0],
    }).eq('id', user.id)

    setStep('ready')
    setLoading(false)
  }

  function toggleSubject(id: string) {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // ─── Parent Handlers ──────────────────────────────────────────────────

  async function handleParentInfoSubmit() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Update profile with parent role and name
    await supabase.from('profiles').update({
      display_name: parentName,
      preferred_language: language,
      role: 'parent',
    }).eq('id', user.id)

    // Create parent_profiles record
    await supabase.from('parent_profiles').upsert({
      user_id: user.id,
      phone: parentPhone || null,
      notification_preferences: { weekly_report: true, low_activity: true },
    }, { onConflict: 'user_id' })

    setStep('parent_code')
    setLoading(false)
  }

  async function handleCodeSubmit() {
    setLoading(true)
    setCodeError('')

    const code = inviteCode.trim().toUpperCase()

    // Find student with this invite code
    const { data: child } = await supabase
      .from('profiles')
      .select('id, display_name, school_name')
      .eq('invite_code', code)
      .eq('role', 'student')
      .single()

    if (!child) {
      setCodeError(lang === 'bm'
        ? 'Kod tidak sah. Sila semak semula dengan anak anda.'
        : 'Invalid code. Please check with your child.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Create parent-child link
    await supabase.from('parent_children').insert({
  parent_id: user.id,
  child_id: child.id,
  status: 'active',
})

    setChildName(child.display_name || '')
    setChildSchool(child.school_name || '')

    // Mark onboarding complete
    await supabase.from('profiles').update({
      onboarding_completed: true,
      last_active_date: new Date().toISOString().split('T')[0],
    }).eq('id', user.id)

    setStep('parent_done')
    setLoading(false)
  }

  // ─── Progress dots ─────────────────────────────────────────────────────

  const studentSteps: Step[] = ['role', 'profile', 'subjects', 'ready']
  const parentSteps: Step[] = ['role', 'parent_info', 'parent_code', 'parent_done']
  const steps = role === 'parent' ? parentSteps : studentSteps

  const filteredSubjects = subjects.filter(s => s.form_levels.includes(formLevel))

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#F8F9FE] flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                step === s ? 'bg-[#6C5CE7]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* ── Step 0: Role Selection ─────────────────────────────────────── */}
        {step === 'role' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl mb-3">🎓</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Selamat Datang ke SPMKita!' : 'Welcome to SPMKita!'}
              </h2>
              <p className="text-[#636E72] mt-2">
                {lang === 'bm' ? 'Saya seorang...' : 'I am a...'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleRoleSelect('student')}
                className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-[#6C5CE7] transition-all active:scale-[0.98]"
              >
                <span className="text-4xl">📚</span>
                <div className="text-left flex-1">
                  <p className="text-lg font-bold text-[#2D3436]">
                    {lang === 'bm' ? 'Pelajar' : 'Student'}
                  </p>
                  <p className="text-sm text-[#636E72]">
                    {lang === 'bm'
                      ? 'Saya mahu belajar dan bersedia untuk SPM'
                      : 'I want to learn and prepare for SPM'}
                  </p>
                </div>
                <span className="text-[#6C5CE7] text-xl">→</span>
              </button>

              <button
                onClick={() => handleRoleSelect('parent')}
                className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border-2 border-transparent hover:border-[#6C5CE7] transition-all active:scale-[0.98]"
              >
                <span className="text-4xl">👨‍👩‍👧</span>
                <div className="text-left flex-1">
                  <p className="text-lg font-bold text-[#2D3436]">
                    {lang === 'bm' ? 'Ibu Bapa' : 'Parent'}
                  </p>
                  <p className="text-sm text-[#636E72]">
                    {lang === 'bm'
                      ? 'Saya mahu pantau kemajuan anak saya'
                      : 'I want to monitor my child\'s progress'}
                  </p>
                </div>
                <span className="text-[#6C5CE7] text-xl">→</span>
              </button>
            </div>

            {/* Language picker at bottom */}
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setLanguage('bm')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  language === 'bm'
                    ? 'bg-[#6C5CE7] text-white'
                    : 'bg-white text-[#636E72] border border-gray-200'
                }`}
              >
                🇲🇾 BM
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  language === 'en'
                    ? 'bg-[#6C5CE7] text-white'
                    : 'bg-white text-[#636E72] border border-gray-200'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Student Profile ────────────────────────────────────── */}
        {step === 'profile' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Selamat Datang!' : 'Welcome!'}
              </h2>
              <p className="text-[#636E72] mt-1">
                {lang === 'bm' ? 'Beritahu kami tentang diri anda' : 'Tell us about yourself'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  {lang === 'bm' ? 'Nama Paparan *' : 'Display Name *'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={lang === 'bm' ? 'Nama yang ditunjukkan di leaderboard' : 'Name shown on leaderboard'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  {lang === 'bm' ? 'Tingkatan *' : 'Form Level *'}
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
                  {lang === 'bm' ? 'Nama Sekolah (pilihan)' : 'School Name (optional)'}
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
                  {lang === 'bm' ? 'Negeri' : 'State'}
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                >
                  <option value="">{lang === 'bm' ? 'Pilih negeri' : 'Select state'}</option>
                  {MALAYSIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setRole(null); setStep('role') }}
                className="flex-1 bg-white border border-gray-200 text-[#2D3436] font-semibold py-3.5 rounded-xl"
              >
                ← {lang === 'bm' ? 'Kembali' : 'Back'}
              </button>
              <button
                onClick={handleProfileSubmit}
                disabled={!displayName || loading}
                className="flex-1 bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
              >
                {loading
                  ? (lang === 'bm' ? 'Menyimpan...' : 'Saving...')
                  : (lang === 'bm' ? 'Seterusnya →' : 'Next →')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Subject Selection ──────────────────────────────────── */}
        {step === 'subjects' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Pilih Subjek' : 'Choose Subjects'}
              </h2>
              <p className="text-[#636E72] mt-1">
                {lang === 'bm'
                  ? `Subjek yang anda mahu fokus untuk Tingkatan ${formLevel}`
                  : `Subjects you want to focus on for Form ${formLevel}`}
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
                      {lang === 'bm' ? subject.name_bm : subject.name_en}
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
                  <p>{lang === 'bm'
                    ? `Subjek untuk Tingkatan ${formLevel} akan datang!`
                    : `Subjects for Form ${formLevel} coming soon!`}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('profile')}
                className="flex-1 bg-white border border-gray-200 text-[#2D3436] font-semibold py-3.5 rounded-xl"
              >
                ← {lang === 'bm' ? 'Kembali' : 'Back'}
              </button>
              <button
                onClick={handleSubjectsSubmit}
                disabled={selectedSubjects.length === 0 || loading}
                className="flex-1 bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
              >
                {loading ? (lang === 'bm' ? 'Menyimpan...' : 'Saving...') : (lang === 'bm' ? 'Mula! 🚀' : 'Start! 🚀')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Student Ready ──────────────────────────────────────── */}
        {step === 'ready' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-[#2D3436]">
              {lang === 'bm' ? 'Anda sudah sedia!' : 'You\'re all set!'}
            </h2>
            <p className="text-[#636E72] text-lg">
              {lang === 'bm' ? 'Mari mulakan cabaran pertama anda.' : 'Let\'s start your first challenge.'}
            </p>

            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <p className="font-semibold text-[#2D3436]">
                {lang === 'bm' ? 'Apa yang menanti anda:' : 'What awaits you:'}
              </p>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <span className="text-sm">{lang === 'bm' ? '5 soalan cabaran harian' : '5 daily challenge questions'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <span className="text-sm">{lang === 'bm' ? 'Kumpul streak & XP setiap hari' : 'Collect streaks & XP daily'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏆</span>
                  <span className="text-sm">{lang === 'bm' ? 'Bersaing di leaderboard' : 'Compete on the leaderboard'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📈</span>
                  <span className="text-sm">{lang === 'bm' ? 'Jejak kemajuan anda' : 'Track your progress'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-[#6C5CE7] text-white font-bold text-lg py-4 rounded-2xl hover:bg-[#5A4BD1] transition-colors shadow-lg"
            >
              {lang === 'bm' ? 'Pergi ke Dashboard 🚀' : 'Go to Dashboard 🚀'}
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PARENT ONBOARDING FLOW                                         */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {/* ── Parent Step 1: Name & Phone ────────────────────────────────── */}
        {step === 'parent_info' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">👨‍👩‍👧</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Maklumat Ibu Bapa' : 'Parent Information'}
              </h2>
              <p className="text-[#636E72] mt-1">
                {lang === 'bm'
                  ? 'Maklumat asas untuk akaun anda'
                  : 'Basic information for your account'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  {lang === 'bm' ? 'Nama Paparan *' : 'Display Name *'}
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder={lang === 'bm' ? 'Contoh: Puan Aminah' : 'e.g. Mrs. Aminah'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">
                  {lang === 'bm' ? 'No. Telefon (pilihan)' : 'Phone Number (optional)'}
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={e => setParentPhone(e.target.value)}
                  placeholder="012-345 6789"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setRole(null); setStep('role') }}
                className="flex-1 bg-white border border-gray-200 text-[#2D3436] font-semibold py-3.5 rounded-xl"
              >
                ← {lang === 'bm' ? 'Kembali' : 'Back'}
              </button>
              <button
                onClick={handleParentInfoSubmit}
                disabled={!parentName || loading}
                className="flex-1 bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
              >
                {loading
                  ? (lang === 'bm' ? 'Menyimpan...' : 'Saving...')
                  : (lang === 'bm' ? 'Seterusnya →' : 'Next →')}
              </button>
            </div>
          </div>
        )}

        {/* ── Parent Step 2: Enter Invite Code ───────────────────────────── */}
        {step === 'parent_code' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <h2 className="text-2xl font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Sambung dengan Anak' : 'Connect with Your Child'}
              </h2>
              <p className="text-[#636E72] mt-1">
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
                {lang === 'bm' ? 'Kod Jemputan *' : 'Invite Code *'}
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value.toUpperCase()); setCodeError('') }}
                placeholder="ABC12345"
                className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#6C5CE7] focus:border-transparent outline-none text-center text-xl font-mono font-bold tracking-widest uppercase"
                maxLength={12}
              />
              {codeError && (
                <p className="text-sm text-[#E17055] mt-2">{codeError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('parent_info')}
                className="flex-1 bg-white border border-gray-200 text-[#2D3436] font-semibold py-3.5 rounded-xl"
              >
                ← {lang === 'bm' ? 'Kembali' : 'Back'}
              </button>
              <button
                onClick={handleCodeSubmit}
                disabled={!inviteCode.trim() || loading}
                className="flex-1 bg-[#6C5CE7] text-white font-semibold py-3.5 rounded-xl hover:bg-[#5A4BD1] transition-colors disabled:opacity-50"
              >
                {loading
                  ? (lang === 'bm' ? 'Menyemak...' : 'Checking...')
                  : (lang === 'bm' ? 'Sahkan →' : 'Verify →')}
              </button>
            </div>
          </div>
        )}

        {/* ── Parent Step 3: Confirmation ────────────────────────────────── */}
        {step === 'parent_done' && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-[#2D3436]">
              {lang === 'bm' ? 'Berjaya disambung!' : 'Successfully connected!'}
            </h2>

            {/* Child info card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-[#636E72] mb-2">
                {lang === 'bm' ? 'Anak anda:' : 'Your child:'}
              </p>
              <p className="text-xl font-bold text-[#2D3436]">{childName}</p>
              {childSchool && (
                <p className="text-sm text-[#636E72] mt-1">{childSchool}</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 text-left">
              <p className="font-semibold text-[#2D3436] text-center">
                {lang === 'bm' ? 'Anda kini boleh:' : 'You can now:'}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <span className="text-sm">{lang === 'bm' ? 'Lihat statistik pembelajaran anak' : 'View your child\'s learning stats'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <span className="text-sm">{lang === 'bm' ? 'Pantau aktiviti mingguan' : 'Monitor weekly activity'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <span className="text-sm">{lang === 'bm' ? 'Tetapkan sasaran pembelajaran' : 'Set learning goals'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <span className="text-sm">{lang === 'bm' ? 'Terima amaran aktiviti rendah' : 'Receive low activity alerts'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/parent')}
              className="w-full bg-[#6C5CE7] text-white font-bold text-lg py-4 rounded-2xl hover:bg-[#5A4BD1] transition-colors shadow-lg"
            >
              {lang === 'bm' ? 'Pergi ke Dashboard Ibu Bapa 🚀' : 'Go to Parent Dashboard 🚀'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

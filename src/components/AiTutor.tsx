'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiTutorProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  lang: string
  lessonTitle?: string
  topicName?: string
  currentBlock?: string // description of what the student is currently viewing
}

export default function AiTutor({
  isOpen,
  onClose,
  userId,
  lang,
  lessonTitle,
  topicName,
  currentBlock,
}: AiTutorProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Build context string from lesson info
  const context = [
    topicName && `Topic: ${topicName}`,
    lessonTitle && `Lesson: ${lessonTitle}`,
    currentBlock && `Currently viewing: ${currentBlock}`,
  ].filter(Boolean).join('\n')

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context,
          userId,
          lang,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setError(lang === 'bm' ? 'Ralat rangkaian. Cuba lagi.' : 'Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Quick prompts
  const quickPrompts = lang === 'bm'
    ? ['Jelaskan konsep ini', 'Beri saya contoh', 'Saya tak faham langkah ini', 'Beri petunjuk']
    : ['Explain this concept', 'Give me an example', "I don't understand this step", 'Give me a hint']

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} style={{ zIndex: 50 }} />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 top-16 bg-white rounded-t-3xl flex flex-col animate-slide-up overflow-hidden" style={{ zIndex: 51 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/10 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#2D3436]">
                {lang === 'bm' ? 'Tutor AI SPMKita' : 'SPMKita AI Tutor'}
              </p>
              <p className="text-[10px] text-[#636E72]">
                {lang === 'bm' ? 'Tanya apa sahaja tentang Matematik' : 'Ask me anything about Maths'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#636E72] text-lg"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🧑‍🏫</div>
              <p className="text-sm font-semibold text-[#2D3436] mb-1">
                {lang === 'bm' ? 'Hai! Saya tutor AI kamu.' : 'Hi! I\'m your AI tutor.'}
              </p>
              <p className="text-xs text-[#636E72] mb-4">
                {lang === 'bm'
                  ? 'Tanya saya apa sahaja tentang pelajaran ini.'
                  : 'Ask me anything about this lesson.'}
              </p>

              {/* Quick prompts */}
              <div className="flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt)
                      setTimeout(() => inputRef.current?.focus(), 100)
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-medium active:scale-95 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#6C5CE7] text-white rounded-br-md'
                    : 'bg-gray-100 text-[#2D3436] rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#6C5CE7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#6C5CE7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#6C5CE7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-[#E17055]/10 text-[#E17055] text-xs px-3 py-2 rounded-xl text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={lang === 'bm' ? 'Taip soalan anda...' : 'Type your question...'}
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-[#2D3436] placeholder:text-[#636E72]/50 outline-none focus:ring-2 focus:ring-[#6C5CE7]/30"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#6C5CE7] text-white flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40"
            >
              ➤
            </button>
          </div>
          <p className="text-[10px] text-[#636E72] text-center mt-1.5">
            {lang === 'bm' ? '20 soalan/hari • Matematik SPM sahaja' : '20 questions/day • SPM Maths only'}
          </p>
        </div>
      </div>
    </>
  )
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Rate limit: simple in-memory store (resets on server restart)
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_DAY = 20

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimits.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 })
    return true
  }

  if (userLimit.count >= MAX_REQUESTS_PER_DAY) return false

  userLimit.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, userId, lang } = await req.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!checkRateLimit(userId)) {
      return NextResponse.json({
        error: lang === 'bm'
          ? 'Had pertanyaan harian tercapai (20/hari). Cuba lagi esok!'
          : 'Daily question limit reached (20/day). Try again tomorrow!',
      }, { status: 429 })
    }

    const systemPrompt = lang === 'bm'
      ? `Kamu adalah tutor AI SPMKita yang mesra dan sabar untuk pelajar SPM Malaysia.

PERANAN:
- Bantu pelajar memahami konsep Matematik SPM
- Jelaskan langkah demi langkah dalam Bahasa Malaysia
- Gunakan contoh yang relevan dengan kehidupan pelajar Malaysia
- Beri galakan: "Bagus!", "Cuba lagi!", "Kamu boleh!"

PERATURAN:
- Jawab HANYA soalan berkaitan Matematik SPM (Tingkatan 1-5)
- Jika soalan bukan berkaitan Matematik, katakan: "Maaf, saya hanya boleh bantu dengan Matematik SPM 😊"
- Jangan beri jawapan penuh terus — bimbing pelajar langkah demi langkah
- Gunakan format ringkas, sesuai untuk skrin telefon
- Gunakan emoji secara sederhana untuk kejelasan

${context ? `KONTEKS PELAJARAN SEMASA:\n${context}` : ''}`
      : `You are SPMKita's friendly and patient AI tutor for Malaysian SPM students.

ROLE:
- Help students understand SPM Mathematics concepts
- Explain step by step in clear English
- Use examples relevant to Malaysian students' daily life
- Give encouragement: "Great job!", "Try again!", "You can do this!"

RULES:
- ONLY answer questions related to SPM Mathematics (Form 1-5)
- If the question is not about Maths, say: "Sorry, I can only help with SPM Maths 😊"
- Don't give full answers directly — guide students step by step
- Keep responses concise, suitable for mobile screens
- Use emojis sparingly for clarity

${context ? `CURRENT LESSON CONTEXT:\n${context}` : ''}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const reply = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Error generating response'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI Tutor error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
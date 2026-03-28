import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'

const app = express()
const PORT = process.env.PORT ?? '8080'

app.use(cors())
app.use(express.json())

// ── In-memory store ──────────────────────────────────────────────
let latestHealthSummary: unknown = null

// ── Gemini ───────────────────────────────────────────────────────
const SYSTEM_PROMPT =
  'You are a wellness assistant. Use the provided health summary JSON to answer ' +
  "the user's question simply and cautiously. Do not diagnose disease. If data is limited, say so."

async function askGemini(question: string, healthData: unknown): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const ai = new GoogleGenAI({ apiKey })
  const prompt =
    `${SYSTEM_PROMPT}\n\n` +
    `Health summary:\n${JSON.stringify(healthData, null, 2)}\n\n` +
    `Question: ${question}`

  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: prompt,
  })

  return result.text ?? ''
}

// ── Routes ───────────────────────────────────────────────────────

// GET /health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// POST /api/health/ingest
app.post('/api/health/ingest', (req, res) => {
  latestHealthSummary = req.body
  console.log('[ingest]', new Date().toISOString(), JSON.stringify(req.body))
  res.json({ success: true, message: 'Data received' })
})

// POST /api/health/ask
app.post('/api/health/ask', async (req, res) => {
  if (!latestHealthSummary) {
    res.json({
      answer: 'No health data has been ingested yet. Send data to /api/health/ingest first.',
      healthData: null,
    })
    return
  }

  const question = String(req.body?.question ?? '').trim()
  if (!question) {
    res.status(400).json({ error: 'Missing "question" field' })
    return
  }

  try {
    const answer = await askGemini(question, latestHealthSummary)
    res.json({ answer, healthData: latestHealthSummary })
  } catch (err) {
    console.error('[ask]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`hackathon-api running on port ${PORT}`)
})

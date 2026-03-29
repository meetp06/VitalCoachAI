/* ──────────────────────────────────────────────────
   hackathon-api — 7-Day Health Forecast Endpoint
   POST /api/health/forecast
   Uses stored health summaries to project trends
   and generate a week-ahead wellness plan.
   ────────────────────────────────────────────────── */

import { Router, Request, Response } from 'express'
import { GoogleGenAI } from '@google/genai'

const router = Router()

// In-memory history (last 7 days of ingested summaries)
export const healthHistory: unknown[] = []

router.post('/forecast', async (req: Request, res: Response) => {
  const { days = 7 } = req.body as { days?: number }

  if (!healthHistory.length) {
    res.status(200).json({
      error: 'No historical data available. Ingest at least one day of data first.',
      forecast: null,
    })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not set' })
    return
  }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are a health analytics AI. Based on this health history data:
${JSON.stringify(healthHistory.slice(-7), null, 2)}

Generate a ${days}-day health forecast. Return ONLY valid JSON:
{
  "trend": "improving|stable|declining",
  "weeklyForecast": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "predictedHealthScore": 75,
      "glucoseForecast": "stable|rising|falling",
      "hrvForecast": "recovering|stable|declining",
      "recommendation": "short actionable tip"
    }
  ],
  "weekSummary": "2-3 sentence overview of the week ahead",
  "topPriority": "single most impactful thing to focus on this week",
  "risks": ["risk1", "risk2"]
}`

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: prompt,
    })

    const raw = result.text ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const forecast = JSON.parse(cleaned)

    res.json({
      forecast,
      dataPoints: healthHistory.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[forecast]', err)
    res.status(500).json({ error: String(err) })
  }
})

export default router

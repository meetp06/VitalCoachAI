/* ──────────────────────────────────────────────────
   hackathon-api — AI Insights Endpoints
   POST /api/health/insights  — structured insights
   POST /api/health/anomalies — anomaly detection
   POST /api/health/mealplan  — AI meal plan
   POST /api/health/compare   — compare two summaries
   ────────────────────────────────────────────────── */

import { Router, Request, Response } from 'express'
import { GoogleGenAI } from '@google/genai'

const router = Router()

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  return new GoogleGenAI({ apiKey })
}

async function callGemini(prompt: string): Promise<string> {
  const ai = getAI()
  const result = await ai.models.generateContent({
    model: 'gemini-2.0-flash-lite',
    contents: prompt,
  })
  return (result.text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ── POST /api/health/insights ─────────────────────
// Returns structured observations, factors, correlations, action plan

router.post('/insights', async (req: Request, res: Response) => {
  const healthData = req.body
  if (!healthData || Object.keys(healthData).length === 0) {
    res.status(400).json({ error: 'Health data required in request body' })
    return
  }

  try {
    const raw = await callGemini(`You are VitalCoach. Analyze this health data and return structured wellness insights as JSON:
${JSON.stringify(healthData, null, 2)}

Return ONLY valid JSON:
{
  "observations": ["obs1", "obs2", "obs3"],
  "contributingFactors": [
    { "name": "factor", "impact": "high|medium|low", "detail": "explanation" }
  ],
  "correlations": [
    { "description": "A and B are related", "strength": 0.82, "mechanism": "why" }
  ],
  "actionPlan": {
    "rightNow": ["action1"],
    "nextMeal": ["action2"],
    "tonight": ["action3"]
  },
  "wellnessScore": 72,
  "disclaimer": "Not medical advice."
}`)

    res.json({ insights: JSON.parse(raw), analyzedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── POST /api/health/anomalies ────────────────────
// Scans for clinical anomalies and flags risks

router.post('/anomalies', (req: Request, res: Response) => {
  const { daily_summary } = req.body as {
    daily_summary?: {
      avg_blood_oxygen?: number
      avg_respiratory_rate?: number
      min_heart_rate?: number
      max_heart_rate?: number
      total_flights_climbed?: number
    }
  }

  if (!daily_summary) {
    res.status(400).json({ error: 'daily_summary required' })
    return
  }

  const anomalies: { metric: string; severity: string; value: number; message: string }[] = []

  if (daily_summary.avg_blood_oxygen != null && daily_summary.avg_blood_oxygen < 95) {
    anomalies.push({ metric: 'SpO2', severity: daily_summary.avg_blood_oxygen < 90 ? 'critical' : 'warning', value: daily_summary.avg_blood_oxygen, message: `Blood oxygen ${daily_summary.avg_blood_oxygen}% — below normal range (95–100%)` })
  }
  if (daily_summary.max_heart_rate != null && daily_summary.max_heart_rate > 185) {
    anomalies.push({ metric: 'heart_rate', severity: 'warning', value: daily_summary.max_heart_rate, message: `Peak heart rate ${daily_summary.max_heart_rate}bpm — very high` })
  }
  if (daily_summary.min_heart_rate != null && daily_summary.min_heart_rate < 40) {
    anomalies.push({ metric: 'heart_rate', severity: 'warning', value: daily_summary.min_heart_rate, message: `Minimum heart rate ${daily_summary.min_heart_rate}bpm — bradycardia range` })
  }
  if (daily_summary.avg_respiratory_rate != null && (daily_summary.avg_respiratory_rate < 10 || daily_summary.avg_respiratory_rate > 25)) {
    anomalies.push({ metric: 'respiratory_rate', severity: 'warning', value: daily_summary.avg_respiratory_rate, message: `Respiratory rate ${daily_summary.avg_respiratory_rate} breaths/min — outside normal (12–20)` })
  }

  const riskScore = anomalies.reduce((s, a) => s + (a.severity === 'critical' ? 40 : 20), 0)

  res.json({
    anomalies,
    riskScore: Math.min(100, riskScore),
    requiresAttention: anomalies.some(a => a.severity === 'critical'),
    scannedAt: new Date().toISOString(),
  })
})

// ── POST /api/health/mealplan ─────────────────────
// Generates a personalized daily meal plan

router.post('/mealplan', async (req: Request, res: Response) => {
  const healthData = req.body

  try {
    const raw = await callGemini(`Generate a personalized daily meal plan for this person's health data:
${JSON.stringify(healthData, null, 2)}

Return ONLY valid JSON:
{
  "targetCalories": 2000,
  "meals": [
    {
      "name": "meal name",
      "time": "8:00 AM",
      "calories": 400,
      "macros": { "protein": 30, "carbs": 40, "fat": 15, "fiber": 8 },
      "glycemicLoad": 10,
      "ingredients": ["ingredient 1", "ingredient 2"],
      "whyThisMeal": "personalized reason based on health data"
    }
  ],
  "hydrationTarget": 2500,
  "glucoseStrategy": "explanation of glucose management approach",
  "notes": ["note1", "note2"]
}`)

    res.json({ plan: JSON.parse(raw), generatedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── POST /api/health/compare ──────────────────────
// Compare two health summaries (e.g. today vs yesterday)

router.post('/compare', async (req: Request, res: Response) => {
  const { current, previous } = req.body as { current?: unknown; previous?: unknown }

  if (!current || !previous) {
    res.status(400).json({ error: 'Both "current" and "previous" health summaries required' })
    return
  }

  try {
    const raw = await callGemini(`Compare these two health summaries and identify what changed and why it matters:
PREVIOUS: ${JSON.stringify(previous, null, 2)}
CURRENT:  ${JSON.stringify(current, null, 2)}

Return ONLY valid JSON:
{
  "overallChange": "improved|declined|stable",
  "changeScore": 5,
  "improvements": ["what got better"],
  "declines": ["what got worse"],
  "keyInsight": "most important 1-sentence takeaway",
  "likelyCause": "probable explanation for the change",
  "recommendation": "what to do today based on this comparison"
}`)

    res.json({ comparison: JSON.parse(raw), comparedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router

/* ──────────────────────────────────────────────────
   VitalCoach MCP Tool — Health Predictions
   Exposes glucose/HRV/recovery forecasts as an
   MCP tool for Claude and other AI clients.
   ────────────────────────────────────────────────── */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ToolContext } from '../server.js'
import { fetchFromWorker } from '../server.js'

export function register(server: McpServer, ctx: ToolContext) {
  server.tool(
    'predict_health_trends',
    'Forecast glucose levels, HRV recovery, and readiness score for the next 24 hours using linear regression and exponential smoothing on recent biometric data.',
    {
      horizon_hours: z.number().min(1).max(24).default(12).describe('How many hours ahead to forecast (default: 12)'),
      metrics: z.array(z.enum(['glucose', 'hrv', 'recovery', 'all'])).default(['all']).describe('Which metrics to forecast'),
    },
    async ({ horizon_hours, metrics }) => {
      const includeAll = metrics.includes('all')

      // Fetch recent data from worker
      const [glucoseData, vitalsData, summaryData] = await Promise.all([
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/glucose', { hours: String(horizon_hours * 2) }).catch(() => ({ readings: [] })),
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/vitals').catch(() => ({ samples: [] })),
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/health-summary').catch(() => ({})),
      ])

      const readings: { glucoseMgDL: number; timestamp: string }[] = glucoseData.readings ?? []
      const vitals: { metricType: string; value: number }[] = vitalsData.samples ?? []
      const summary = summaryData ?? {}

      const results: Record<string, unknown> = {}

      // ── Glucose Forecast ──────────────────────────
      if (includeAll || metrics.includes('glucose')) {
        const glucoseValues = readings.map((r: { glucoseMgDL: number }) => r.glucoseMgDL)
        const { slope, intercept } = linearRegression(
          glucoseValues.map((_, i) => i),
          glucoseValues
        )

        const alpha = 0.3
        let smoothed = glucoseValues[0] ?? 90
        for (const v of glucoseValues) smoothed = alpha * v + (1 - alpha) * smoothed

        const now = Date.now()
        const forecastPoints = Array.from({ length: Math.min(horizon_hours, 12) }, (_, i) => {
          const predicted = Math.max(40, Math.min(300, smoothed + slope * (i + 1) * 0.5))
          return {
            timestamp: new Date(now + (i + 1) * 3600000).toISOString(),
            predicted_mg_dl: Math.round(predicted),
            confidence: Math.max(0.5, 0.95 - i * 0.04),
          }
        })

        const projectedMin = Math.min(...forecastPoints.map(p => p.predicted_mg_dl))
        const projectedMax = Math.max(...forecastPoints.map(p => p.predicted_mg_dl))

        results.glucose = {
          current_mg_dl: glucoseValues[glucoseValues.length - 1] ?? summary.glucose ?? 'no data',
          trend: slope > 1 ? 'rising' : slope < -1 ? 'falling' : 'stable',
          slope_per_hour: Math.round(slope * 100) / 100,
          forecast: forecastPoints,
          risk_of_crash: projectedMin < 70 ? 'HIGH' : projectedMin < 80 ? 'MODERATE' : 'LOW',
          risk_of_spike: projectedMax > 180 ? 'HIGH' : projectedMax > 140 ? 'MODERATE' : 'LOW',
          recommendation: slope < -2
            ? 'Glucose dropping — consider a small protein+fat snack within 30 minutes'
            : slope > 2
              ? 'Glucose rising — a 10-minute walk now would blunt the spike'
              : 'Glucose is stable — maintain current pattern',
        }
      }

      // ── HRV Forecast ──────────────────────────────
      if (includeAll || metrics.includes('hrv')) {
        const hrvSamples = vitals
          .filter((v: { metricType: string }) => v.metricType === 'HRV')
          .map((v: { value: number }) => v.value)

        const currentHRV: number = summary.hrv ?? (hrvSamples[hrvSamples.length - 1] ?? 35)
        const personalBaseline = hrvSamples.length > 5
          ? hrvSamples.reduce((a: number, b: number) => a + b, 0) / hrvSamples.length
          : 48

        // Each hour of quality sleep recovers ~0.5ms HRV on average
        const recoveryRate = 0.5
        const projectedMorning = Math.round(currentHRV + recoveryRate * 8)
        const daysToBaseline = currentHRV >= personalBaseline
          ? 0
          : Math.ceil((personalBaseline - currentHRV) / 4)

        results.hrv = {
          current_ms: currentHRV,
          personal_baseline_ms: Math.round(personalBaseline),
          deficit_ms: Math.max(0, Math.round(personalBaseline - currentHRV)),
          projected_tomorrow_morning: Math.max(20, Math.min(90, projectedMorning)),
          days_to_baseline: daysToBaseline,
          trend: projectedMorning > currentHRV + 2 ? 'recovering' : projectedMorning < currentHRV - 2 ? 'declining' : 'stable',
          key_lever: currentHRV < 35
            ? 'Sleep is the #1 lever — aim for 7.5h tonight with consistent bedtime'
            : 'Add 5-min slow nasal breathing sessions to accelerate HRV recovery',
        }
      }

      // ── Recovery Score ────────────────────────────
      if (includeAll || metrics.includes('recovery')) {
        const hrv: number = summary.hrv ?? 35
        const rhr: number = summary.heartRate ?? 68
        const sleepHours = summary.sleepHours ?? 6.5
        const spo2 = vitals.find((v: { metricType: string }) => v.metricType === 'SpO2')?.value ?? 97

        const components = [
          { name: 'HRV',            weight: 0.35, score: clamp((hrv - 20) / 60 * 100, 0, 100) },
          { name: 'Sleep Duration', weight: 0.30, score: clamp((sleepHours / 8) * 100, 0, 100) },
          { name: 'Resting HR',     weight: 0.20, score: clamp((80 - rhr) / 30 * 100, 0, 100) },
          { name: 'SpO2',           weight: 0.15, score: clamp((spo2 - 90) / 10 * 100, 0, 100) },
        ]

        const score = Math.round(components.reduce((sum, c) => sum + c.score * c.weight, 0))
        const label = score >= 67 ? 'Optimal' : score >= 34 ? 'Moderate' : score >= 15 ? 'Low' : 'Rest'
        const strainCapacity = Math.round((score / 100) * 21 * 10) / 10

        results.recovery = {
          score_0_to_100: score,
          readiness_label: label,
          strain_capacity_0_to_21: strainCapacity,
          training_recommendation:
            score >= 67 ? 'Green light — full training load safe'
            : score >= 34 ? 'Moderate — keep intensity ≤70% max HR'
            : score >= 15 ? 'Low — active recovery only (walk, yoga, stretching)'
            : 'Rest day — prioritize sleep and nutrition only',
          components: components.map(c => ({
            metric: c.name,
            score: Math.round(c.score),
            contribution: Math.round(c.score * c.weight),
          })),
        }
      }

      return {
        structuredContent: {
          type: 'health_predictions',
          generated_at: new Date().toISOString(),
          horizon_hours,
          predictions: results,
        },
      }
    }
  )
}

// ─── Utilities ────────────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1)
  return { slope, intercept: (sumY - slope * sumX) / n }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

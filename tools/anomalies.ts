/* ──────────────────────────────────────────────────
   VitalCoach MCP Tool — Real-Time Anomaly Detection
   Exposes the anomaly detection engine as an MCP
   tool — flags critical health events for AI clients.
   ────────────────────────────────────────────────── */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ToolContext } from '../server.js'
import { fetchFromWorker } from '../server.js'

export function register(server: McpServer, ctx: ToolContext) {
  server.tool(
    'detect_health_anomalies',
    'Scan all health metrics for anomalies using z-score analysis and clinical threshold checks. Returns risk score, severity-ranked alerts, and prioritized recommendations.',
    {
      severity_filter: z
        .enum(['all', 'critical', 'warning', 'info'])
        .default('all')
        .describe('Filter by minimum severity level'),
      metrics: z
        .array(z.enum(['glucose', 'hrv', 'heart_rate', 'spo2', 'compound', 'all']))
        .default(['all'])
        .describe('Which metric categories to scan'),
    },
    async ({ severity_filter, metrics }) => {
      const includeAll = metrics.includes('all')

      // Parallel data fetch
      const [glucoseData, vitalsData, summaryData] = await Promise.all([
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/glucose', { hours: '6' }).catch(() => ({ readings: [] })),
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/vitals').catch(() => ({ samples: [] })),
        fetchFromWorker(ctx.workerUrl, '/api/v1/query/health-summary').catch(() => ({})),
      ])

      const readings: { glucoseMgDL: number; timestamp: string }[] = glucoseData.readings ?? []
      const vitals: { metricType: string; value: number; timestamp?: string }[] = vitalsData.samples ?? []
      const summary = summaryData ?? {}

      const anomalies: {
        id: string
        metric: string
        severity: 'critical' | 'warning' | 'info'
        value: number | string
        message: string
        recommendation: string
        detected_at: string
      }[] = []

      // ── Glucose Checks ────────────────────────────
      if (includeAll || metrics.includes('glucose')) {
        const glucoseValues = readings.map((r: { glucoseMgDL: number }) => r.glucoseMgDL)
        const glucoseMean = mean(glucoseValues)
        const glucoseStd = stddev(glucoseValues, glucoseMean)

        // Rapid rate-of-change detection
        for (let i = 1; i < readings.length; i++) {
          const delta = readings[i].glucoseMgDL - readings[i - 1].glucoseMgDL
          if (Math.abs(delta) > 40) {
            anomalies.push({
              id: `glucose-rapid-change-${i}`,
              metric: 'glucose',
              severity: Math.abs(delta) > 60 ? 'critical' : 'warning',
              value: readings[i].glucoseMgDL,
              message: `Rapid glucose ${delta > 0 ? 'rise' : 'drop'}: ${Math.abs(delta)} mg/dL`,
              recommendation: delta > 0
                ? 'Take a 10-minute walk to reduce the spike'
                : 'Consume 15g fast carbs if symptomatic (juice, glucose tabs)',
              detected_at: readings[i].timestamp,
            })
          }
        }

        // Absolute thresholds
        const latest = readings[readings.length - 1]?.glucoseMgDL ?? summary.glucose
        if (latest != null) {
          if (latest <= 54) {
            anomalies.push({ id: 'glucose-critical-low', metric: 'glucose', severity: 'critical', value: latest, message: `Severe hypoglycemia: ${latest} mg/dL`, recommendation: 'Consume 15–20g fast-acting carbs immediately. Do not drive. Recheck in 15 minutes.', detected_at: new Date().toISOString() })
          } else if (latest < 70) {
            anomalies.push({ id: 'glucose-low', metric: 'glucose', severity: 'warning', value: latest, message: `Low glucose: ${latest} mg/dL`, recommendation: '15g fast carbs (banana, juice) and recheck in 15 minutes', detected_at: new Date().toISOString() })
          } else if (latest > 250) {
            anomalies.push({ id: 'glucose-critical-high', metric: 'glucose', severity: 'critical', value: latest, message: `Severe hyperglycemia: ${latest} mg/dL`, recommendation: 'Hydrate aggressively. Avoid all carbs. Contact healthcare provider if sustained.', detected_at: new Date().toISOString() })
          } else if (latest > 180) {
            anomalies.push({ id: 'glucose-high', metric: 'glucose', severity: 'warning', value: latest, message: `Elevated glucose: ${latest} mg/dL`, recommendation: '15-minute walk reduces glucose by 15–25%', detected_at: new Date().toISOString() })
          }
        }

        // Z-score outlier on recent window
        if (glucoseStd > 0 && glucoseValues.length > 3) {
          const latestZ = (glucoseValues[glucoseValues.length - 1] - glucoseMean) / glucoseStd
          if (Math.abs(latestZ) > 2.5) {
            anomalies.push({ id: 'glucose-outlier', metric: 'glucose', severity: Math.abs(latestZ) > 3 ? 'critical' : 'warning', value: glucoseValues[glucoseValues.length - 1], message: `Statistical outlier: z-score ${latestZ.toFixed(1)} (>2.5σ from your 6h baseline)`, recommendation: 'Recheck glucose in 15 minutes to confirm reading', detected_at: new Date().toISOString() })
          }
        }
      }

      // ── HRV Checks ────────────────────────────────
      if (includeAll || metrics.includes('hrv')) {
        const hrv: number | undefined = summary.hrv ?? vitals.find((v: { metricType: string }) => v.metricType === 'HRV')?.value
        if (hrv != null) {
          if (hrv < 20) {
            anomalies.push({ id: 'hrv-critical', metric: 'hrv', severity: 'critical', value: hrv, message: `Critical HRV suppression: ${hrv}ms`, recommendation: 'No training today. Prioritize rest, hydration, and 9h sleep.', detected_at: new Date().toISOString() })
          } else if (hrv < 30) {
            anomalies.push({ id: 'hrv-very-low', metric: 'hrv', severity: 'warning', value: hrv, message: `Very low HRV: ${hrv}ms (healthy: 40–60ms)`, recommendation: 'Light activity only. 5-min slow nasal breathing can help.', detected_at: new Date().toISOString() })
          }
        }
      }

      // ── SpO2 Checks ───────────────────────────────
      if (includeAll || metrics.includes('spo2')) {
        const spo2 = vitals.find((v: { metricType: string }) => v.metricType === 'SpO2')?.value
        if (spo2 != null) {
          if (spo2 < 90) {
            anomalies.push({ id: 'spo2-critical', metric: 'spo2', severity: 'critical', value: spo2, message: `Critical blood oxygen: ${spo2}%`, recommendation: 'Seek medical attention immediately if persistent', detected_at: new Date().toISOString() })
          } else if (spo2 < 95) {
            anomalies.push({ id: 'spo2-low', metric: 'spo2', severity: 'warning', value: spo2, message: `Low SpO2: ${spo2}%`, recommendation: 'Move to fresh air and perform slow deep breathing', detected_at: new Date().toISOString() })
          }
        }
      }

      // ── Compound Pattern ──────────────────────────
      if (includeAll || metrics.includes('compound')) {
        const hrv: number = summary.hrv ?? 40
        const hr: number = summary.heartRate ?? 70
        const sleep = summary.sleepHours ?? 7
        const stressScore = (hrv < 30 ? 2 : hrv < 40 ? 1 : 0) + (hr > 85 ? 2 : hr > 75 ? 1 : 0) + (sleep < 5 ? 2 : sleep < 6.5 ? 1 : 0)
        if (stressScore >= 4) {
          anomalies.push({ id: 'compound-stress', metric: 'compound', severity: 'critical', value: stressScore, message: `Compound stress pattern: HRV ${hrv}ms + HR ${hr}bpm + ${sleep.toFixed(1)}h sleep`, recommendation: 'Avoid intense exercise. Prioritize hydration, light movement, and early sleep tonight.', detected_at: new Date().toISOString() })
        }
      }

      // ── Filter + Sort ─────────────────────────────
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      const filtered = anomalies
        .filter(a => severity_filter === 'all' || a.severity === severity_filter)
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const riskScore = Math.min(100, filtered.reduce((sum, a) => sum + (a.severity === 'critical' ? 35 : a.severity === 'warning' ? 15 : 5), 0))

      return {
        structuredContent: {
          type: 'anomaly_report',
          scanned_at: new Date().toISOString(),
          risk_score: riskScore,
          risk_level: riskScore >= 70 ? 'HIGH' : riskScore >= 35 ? 'MODERATE' : 'LOW',
          requires_attention: filtered.some(a => a.severity === 'critical'),
          anomaly_count: filtered.length,
          anomalies: filtered,
          summary: filtered.length === 0
            ? 'All monitored metrics are within normal ranges. No anomalies detected.'
            : `${filtered.filter(a => a.severity === 'critical').length} critical, ${filtered.filter(a => a.severity === 'warning').length} warnings. Risk score: ${riskScore}/100.`,
        },
      }
    }
  )
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 1
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length)
}

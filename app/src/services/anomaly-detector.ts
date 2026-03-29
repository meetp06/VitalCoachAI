/* ──────────────────────────────────────────────────
   VitalCoach — Real-Time Health Anomaly Detector
   Uses z-score + rolling baseline to flag unusual
   patterns in glucose, HRV, heart rate, and steps.
   ────────────────────────────────────────────────── */

import type { HealthContext, GlucoseReading, VitalSample } from '../lib/types.js';

export type AnomalySeverity = 'critical' | 'warning' | 'info';

export interface Anomaly {
  id: string;
  metric: string;
  severity: AnomalySeverity;
  value: number;
  baseline: number;
  zScore: number;
  message: string;
  recommendation: string;
  detectedAt: string;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  riskScore: number;            // 0–100
  requiresAttention: boolean;
  summary: string;
}

// ─── Z-Score Baseline Windows ─────────────────────

const GLUCOSE_THRESHOLDS = { low: 70, high: 180, criticalLow: 54, criticalHigh: 250 };
const HRV_THRESHOLDS     = { low: 20, warning: 35 };
const HR_THRESHOLDS      = { restingHigh: 100, exerciseHigh: 185 };
const SPO2_THRESHOLDS    = { low: 95, critical: 90 };

// ─── Core Detection ───────────────────────────────

export function detectAnomalies(ctx: HealthContext): AnomalyReport {
  const anomalies: Anomaly[] = [];

  anomalies.push(...detectGlucoseAnomalies(ctx.glucose));
  anomalies.push(...detectVitalAnomalies(ctx.vitals));
  anomalies.push(...detectPatternAnomalies(ctx));

  const riskScore = calculateRiskScore(anomalies);
  const requiresAttention = anomalies.some(a => a.severity === 'critical');

  return {
    anomalies,
    riskScore,
    requiresAttention,
    summary: buildSummary(anomalies, riskScore),
  };
}

// ─── Glucose Anomaly Detection ────────────────────

function detectGlucoseAnomalies(readings: GlucoseReading[]): Anomaly[] {
  if (!readings.length) return [];

  const anomalies: Anomaly[] = [];
  const values = readings.map(r => r.glucoseMgDL);
  const baseline = mean(values);
  const std = stddev(values, baseline);

  // Rolling window: detect rapid spikes (>40 mg/dL in 15 min)
  for (let i = 1; i < readings.length; i++) {
    const delta = readings[i].glucoseMgDL - readings[i - 1].glucoseMgDL;
    const minutesBetween = timeDiffMinutes(readings[i - 1].timestamp, readings[i].timestamp);
    const rate = minutesBetween > 0 ? delta / minutesBetween : 0;

    if (Math.abs(rate) > 3) {
      anomalies.push({
        id: `glucose-spike-${i}`,
        metric: 'glucose',
        severity: Math.abs(rate) > 5 ? 'critical' : 'warning',
        value: readings[i].glucoseMgDL,
        baseline,
        zScore: std > 0 ? (readings[i].glucoseMgDL - baseline) / std : 0,
        message: `Rapid glucose ${delta > 0 ? 'rise' : 'drop'}: ${Math.abs(delta).toFixed(0)} mg/dL in ${minutesBetween} min`,
        recommendation: delta > 0
          ? 'Take a 10-minute walk to blunt the spike'
          : 'Consume 15g fast carbs immediately if symptomatic',
        detectedAt: readings[i].timestamp,
      });
    }
  }

  // Absolute threshold violations
  const latest = readings[readings.length - 1];
  if (latest.glucoseMgDL <= GLUCOSE_THRESHOLDS.criticalLow) {
    anomalies.push({
      id: 'glucose-critical-low',
      metric: 'glucose',
      severity: 'critical',
      value: latest.glucoseMgDL,
      baseline,
      zScore: std > 0 ? (latest.glucoseMgDL - baseline) / std : -3,
      message: `Critical hypoglycemia: ${latest.glucoseMgDL} mg/dL`,
      recommendation: 'Consume 15–20g fast-acting carbohydrates immediately and recheck in 15 minutes',
      detectedAt: latest.timestamp,
    });
  } else if (latest.glucoseMgDL >= GLUCOSE_THRESHOLDS.criticalHigh) {
    anomalies.push({
      id: 'glucose-critical-high',
      metric: 'glucose',
      severity: 'critical',
      value: latest.glucoseMgDL,
      baseline,
      zScore: std > 0 ? (latest.glucoseMgDL - baseline) / std : 3,
      message: `Critical hyperglycemia: ${latest.glucoseMgDL} mg/dL`,
      recommendation: 'Hydrate immediately, avoid carbohydrates, and consult your healthcare provider',
      detectedAt: latest.timestamp,
    });
  }

  return anomalies;
}

// ─── Vitals Anomaly Detection ─────────────────────

function detectVitalAnomalies(vitals: VitalSample[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const grouped = groupBy(vitals, v => v.metricType);

  // HRV anomaly
  const hrvSamples = (grouped['HRV'] ?? []).map(v => v.value);
  if (hrvSamples.length) {
    const avg = mean(hrvSamples);
    const latest = hrvSamples[hrvSamples.length - 1];
    if (latest < HRV_THRESHOLDS.low) {
      anomalies.push({
        id: 'hrv-critically-low',
        metric: 'HRV',
        severity: 'critical',
        value: latest,
        baseline: avg,
        zScore: stddev(hrvSamples, avg) > 0 ? (latest - avg) / stddev(hrvSamples, avg) : -2,
        message: `HRV critically low: ${latest}ms — severe nervous system suppression`,
        recommendation: 'Skip intense exercise today. Focus on hydration, slow breathing, and early sleep.',
        detectedAt: new Date().toISOString(),
      });
    } else if (latest < HRV_THRESHOLDS.warning) {
      anomalies.push({
        id: 'hrv-low',
        metric: 'HRV',
        severity: 'warning',
        value: latest,
        baseline: avg,
        zScore: stddev(hrvSamples, avg) > 0 ? (latest - avg) / stddev(hrvSamples, avg) : -1,
        message: `HRV below optimal: ${latest}ms (target: 40–60ms)`,
        recommendation: '5 minutes of box breathing can raise HRV within the hour',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // SpO2 anomaly
  const spo2Samples = (grouped['SpO2'] ?? []).map(v => v.value);
  if (spo2Samples.length) {
    const latest = spo2Samples[spo2Samples.length - 1];
    if (latest < SPO2_THRESHOLDS.critical) {
      anomalies.push({
        id: 'spo2-critical',
        metric: 'SpO2',
        severity: 'critical',
        value: latest,
        baseline: mean(spo2Samples),
        zScore: -3,
        message: `Critical oxygen saturation: ${latest}% — seek medical attention`,
        recommendation: 'This level requires immediate medical evaluation',
        detectedAt: new Date().toISOString(),
      });
    } else if (latest < SPO2_THRESHOLDS.low) {
      anomalies.push({
        id: 'spo2-low',
        metric: 'SpO2',
        severity: 'warning',
        value: latest,
        baseline: mean(spo2Samples),
        zScore: -1.5,
        message: `Low blood oxygen: ${latest}%`,
        recommendation: 'Move to fresh air and try slow deep breathing for 5 minutes',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

// ─── Pattern-Level Anomaly Detection ──────────────

function detectPatternAnomalies(ctx: HealthContext): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Compound stress pattern: low HRV + high HR + poor sleep
  const hrv = ctx.summary.hrv ?? 999;
  const hr = ctx.summary.heartRate ?? 0;
  const sleep = ctx.sleep ? parseFloat(ctx.sleep.duration) : 8;

  const compoundStressScore =
    (hrv < 30 ? 2 : hrv < 40 ? 1 : 0) +
    (hr > 85 ? 2 : hr > 75 ? 1 : 0) +
    (sleep < 5 ? 2 : sleep < 6.5 ? 1 : 0);

  if (compoundStressScore >= 4) {
    anomalies.push({
      id: 'compound-stress-pattern',
      metric: 'compound',
      severity: 'critical',
      value: compoundStressScore,
      baseline: 0,
      zScore: 3,
      message: 'Compound stress pattern detected: low HRV + elevated HR + sleep deficit',
      recommendation: 'Your body is in high-stress mode. Prioritize rest, hydration, and light movement only today.',
      detectedAt: new Date().toISOString(),
    });
  } else if (compoundStressScore >= 2) {
    anomalies.push({
      id: 'mild-stress-pattern',
      metric: 'compound',
      severity: 'warning',
      value: compoundStressScore,
      baseline: 0,
      zScore: 1.5,
      message: 'Early stress pattern: multiple recovery metrics below optimal',
      recommendation: 'Consider reducing training intensity and adding one recovery habit today.',
      detectedAt: new Date().toISOString(),
    });
  }

  return anomalies;
}

// ─── Risk Scoring ─────────────────────────────────

function calculateRiskScore(anomalies: Anomaly[]): number {
  const weights = { critical: 35, warning: 15, info: 5 };
  const raw = anomalies.reduce((sum, a) => sum + (weights[a.severity] ?? 0), 0);
  return Math.min(100, raw);
}

function buildSummary(anomalies: Anomaly[], riskScore: number): string {
  if (!anomalies.length) return 'All metrics within normal ranges. No anomalies detected.';
  const criticals = anomalies.filter(a => a.severity === 'critical').length;
  const warnings = anomalies.filter(a => a.severity === 'warning').length;
  return `Risk score ${riskScore}/100. ${criticals} critical alert${criticals !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}. Immediate attention ${criticals > 0 ? 'required' : 'not required'}.`;
}

// ─── Utilities ────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 1;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function timeDiffMinutes(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

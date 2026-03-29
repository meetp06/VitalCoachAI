/* ──────────────────────────────────────────────────
   VitalCoach — Predictive Health Engine
   Linear regression + exponential smoothing to
   forecast glucose, HRV, and recovery over 24h.
   ────────────────────────────────────────────────── */

import type { HealthContext, GlucoseReading, VitalSample } from '../lib/types.js';

export interface ForecastPoint {
  timestamp: string;
  predicted: number;
  lower: number;   // 80% confidence interval
  upper: number;
  confidence: number;
}

export interface GlucoseForecast {
  nextHour: ForecastPoint[];    // 12 × 5-min points
  nextMeal: { expectedSpike: number; peakTime: string; recoveryTime: string };
  riskOfCrash: number;          // 0–1 probability
  riskOfSpike: number;
}

export interface HRVForecast {
  morningHRV: number;           // predicted tomorrow morning
  trend: 'recovering' | 'declining' | 'stable';
  daysToBaseline: number;
  optimizedBedtime: string;
}

export interface RecoveryForecast {
  recoveryScore: number;        // 0–100 (Whoop-style)
  readinessLabel: 'optimal' | 'moderate' | 'low' | 'rest';
  strainCapacity: number;       // max recommended training load
  factors: { name: string; contribution: number }[];
}

// ─── Main Forecast API ────────────────────────────

export function forecastHealth(ctx: HealthContext): {
  glucose: GlucoseForecast;
  hrv: HRVForecast;
  recovery: RecoveryForecast;
} {
  return {
    glucose: forecastGlucose(ctx),
    hrv: forecastHRV(ctx),
    recovery: computeRecoveryScore(ctx),
  };
}

// ─── Glucose Forecasting ──────────────────────────

function forecastGlucose(ctx: HealthContext): GlucoseForecast {
  const readings = ctx.glucose;

  if (readings.length < 3) {
    return {
      nextHour: [],
      nextMeal: { expectedSpike: 30, peakTime: '+20 min', recoveryTime: '+90 min' },
      riskOfCrash: 0.2,
      riskOfSpike: 0.3,
    };
  }

  // Fit linear trend over last 6 readings
  const window = readings.slice(-6);
  const xs = window.map((_, i) => i);
  const ys = window.map(r => r.glucoseMgDL);
  const { slope, intercept } = linearRegression(xs, ys);

  // Exponential smoothing alpha=0.3 for noise reduction
  const alpha = 0.3;
  let smoothed = ys[0];
  for (const y of ys) smoothed = alpha * y + (1 - alpha) * smoothed;

  // Project 12 × 5-min points
  const now = new Date();
  const residualStd = stddev(ys.map((y, i) => y - (slope * i + intercept)));
  const nextHour: ForecastPoint[] = Array.from({ length: 12 }, (_, i) => {
    const xFuture = window.length + i;
    const predicted = Math.max(40, smoothed + slope * (i + 1));
    const margin = residualStd * 1.28 * Math.sqrt(1 + i * 0.15); // widening CI
    return {
      timestamp: new Date(now.getTime() + (i + 1) * 5 * 60000).toISOString(),
      predicted: Math.round(predicted),
      lower: Math.round(predicted - margin),
      upper: Math.round(predicted + margin),
      confidence: Math.max(0.5, 0.95 - i * 0.04),
    };
  });

  // Crash / spike risk
  const currentGlucose = readings[readings.length - 1].glucoseMgDL;
  const projectedMin = Math.min(...nextHour.map(p => p.lower));
  const projectedMax = Math.max(...nextHour.map(p => p.upper));

  const riskOfCrash = sigmoidRisk(70 - projectedMin, 10);
  const riskOfSpike = sigmoidRisk(projectedMax - 160, 10);

  // Next-meal spike estimate (based on last 3 post-meal patterns)
  const recentMealReadings = ctx.meals.length > 0 ? readings.filter(r => {
    const mealTime = new Date(ctx.meals[ctx.meals.length - 1].timestamp).getTime();
    const readingTime = new Date(r.timestamp).getTime();
    return readingTime > mealTime && readingTime < mealTime + 2 * 3600000;
  }) : [];

  const avgSpike = recentMealReadings.length
    ? Math.max(...recentMealReadings.map(r => r.glucoseMgDL)) - currentGlucose
    : 35;

  return {
    nextHour,
    nextMeal: {
      expectedSpike: Math.max(0, Math.round(avgSpike)),
      peakTime: '+18 min',
      recoveryTime: '+75 min',
    },
    riskOfCrash: Math.round(riskOfCrash * 100) / 100,
    riskOfSpike: Math.round(riskOfSpike * 100) / 100,
  };
}

// ─── HRV Forecasting ──────────────────────────────

function forecastHRV(ctx: HealthContext): HRVForecast {
  const hrvSamples = ctx.vitals
    .filter(v => v.metricType === 'HRV')
    .map(v => v.value);

  const currentHRV = ctx.summary.hrv ?? (hrvSamples.length ? hrvSamples[hrvSamples.length - 1] : 35);
  const sleepHours = ctx.sleep ? parseFloat(ctx.sleep.duration) : 6;
  const sleepDebt = Math.max(0, 7.5 - sleepHours);

  // HRV recovery model: baseline 50ms, sleep debt reduces by ~3ms/h deficit
  // Each night of full sleep recovers ~4ms
  const personalBaseline = hrvSamples.length > 5 ? mean(hrvSamples) : 48;
  const recoveryRate = 4; // ms per night of full sleep
  const decayRate = 3;    // ms lost per hour of sleep debt

  const projectedTomorrow = Math.round(
    currentHRV + recoveryRate - decayRate * sleepDebt
  );

  const daysToBaseline = currentHRV >= personalBaseline
    ? 0
    : Math.ceil((personalBaseline - currentHRV) / recoveryRate);

  const trend: HRVForecast['trend'] =
    projectedTomorrow > currentHRV + 2 ? 'recovering' :
    projectedTomorrow < currentHRV - 2 ? 'declining' : 'stable';

  // Optimal bedtime: 10:30 PM standard, adjust earlier if HRV is low
  const bedtimeOffset = currentHRV < 30 ? -60 : currentHRV < 40 ? -30 : 0;
  const baselineBedtime = new Date();
  baselineBedtime.setHours(22, 30 + bedtimeOffset / 60, 0, 0);

  return {
    morningHRV: Math.max(20, Math.min(90, projectedTomorrow)),
    trend,
    daysToBaseline,
    optimizedBedtime: baselineBedtime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

// ─── Recovery Score (Whoop-style) ─────────────────

function computeRecoveryScore(ctx: HealthContext): RecoveryForecast {
  const hrv = ctx.summary.hrv ?? 35;
  const sleepHours = ctx.sleep ? parseFloat(ctx.sleep.duration) : 6;
  const rhr = ctx.summary.heartRate ?? 70;
  const spo2 = ctx.vitals.find(v => v.metricType === 'SpO2')?.value ?? 97;

  // Weighted recovery components
  const components = [
    { name: 'HRV',              weight: 0.35, score: clamp((hrv - 20) / 60 * 100, 0, 100) },
    { name: 'Sleep Duration',   weight: 0.30, score: clamp((sleepHours / 8) * 100, 0, 100) },
    { name: 'Resting HR',       weight: 0.20, score: clamp((80 - rhr) / 30 * 100, 0, 100) },
    { name: 'Blood Oxygen',     weight: 0.15, score: clamp((spo2 - 90) / 10 * 100, 0, 100) },
  ];

  const recoveryScore = Math.round(
    components.reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  const readinessLabel: RecoveryForecast['readinessLabel'] =
    recoveryScore >= 67 ? 'optimal' :
    recoveryScore >= 34 ? 'moderate' :
    recoveryScore >= 15 ? 'low' : 'rest';

  // Strain capacity: max training load (0-21 Whoop-style)
  const strainCapacity = Math.round((recoveryScore / 100) * 21 * 10) / 10;

  return {
    recoveryScore,
    readinessLabel,
    strainCapacity,
    factors: components.map(c => ({
      name: c.name,
      contribution: Math.round(c.score * c.weight),
    })),
  };
}

// ─── Math Utilities ───────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr: number[]): number {
  const avg = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (arr.length || 1));
}

function sigmoidRisk(x: number, scale: number): number {
  return 1 / (1 + Math.exp(-x / scale));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

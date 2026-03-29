/* ──────────────────────────────────────────────────
   VitalCoach — Biometric Correlation Engine
   Computes Pearson correlations across all health
   metrics to surface hidden cause-effect patterns.
   Uses sliding window analysis for temporal lag.
   ────────────────────────────────────────────────── */

import type { HealthContext } from '../lib/types.js';

export interface MetricCorrelation {
  metricA: string;
  metricB: string;
  pearsonR: number;          // -1 to 1
  lagHours: number;          // time lag where correlation is strongest
  sampleCount: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  direction: 'positive' | 'negative';
  interpretation: string;
  actionableInsight: string;
}

export interface CorrelationMatrix {
  correlations: MetricCorrelation[];
  topInsight: string;
  causalHypotheses: CausalHypothesis[];
}

export interface CausalHypothesis {
  cause: string;
  effect: string;
  confidence: number;        // 0–1
  mechanism: string;
  evidencePoints: string[];
}

// Known causal relationship library
const CAUSAL_LIBRARY: Record<string, { mechanism: string; lag: number }> = {
  'sleep→HRV':            { mechanism: 'Slow-wave sleep drives autonomic nervous system recovery, directly raising next-day HRV', lag: 8 },
  'glucose→HRV':          { mechanism: 'Hyperglycemia triggers oxidative stress, reducing heart rate variability within 2-4 hours', lag: 3 },
  'steps→glucose':        { mechanism: 'Muscular glucose uptake via GLUT-4 transporters lowers circulating glucose within 30 minutes of movement', lag: 0.5 },
  'sleep→glucose':        { mechanism: 'Sleep deprivation raises cortisol and growth hormone, increasing insulin resistance by morning', lag: 8 },
  'HRV→performance':      { mechanism: 'Higher parasympathetic tone (HRV) predicts greater metabolic flexibility and cognitive performance', lag: 0 },
  'meal→glucose':         { mechanism: 'Carbohydrate digestion raises portal glucose, triggering insulin response within 15-20 minutes', lag: 0.3 },
  'stress→HRV':           { mechanism: 'Cortisol activates sympathetic nervous system, suppressing vagal tone and reducing HRV immediately', lag: 0.1 },
};

// ─── Main Correlation API ─────────────────────────

export function computeCorrelations(ctx: HealthContext): CorrelationMatrix {
  const series = extractTimeSeries(ctx);
  const correlations: MetricCorrelation[] = [];

  const metricKeys = Object.keys(series);
  for (let i = 0; i < metricKeys.length; i++) {
    for (let j = i + 1; j < metricKeys.length; j++) {
      const a = metricKeys[i];
      const b = metricKeys[j];

      const { r, lag } = bestLagCorrelation(series[a], series[b], [0, 1, 2, 4, 8]);
      if (series[a].length < 3 || series[b].length < 3) continue;

      const strength: MetricCorrelation['strength'] =
        Math.abs(r) > 0.7 ? 'strong' :
        Math.abs(r) > 0.4 ? 'moderate' :
        Math.abs(r) > 0.2 ? 'weak' : 'none';

      if (strength === 'none') continue;

      correlations.push({
        metricA: a,
        metricB: b,
        pearsonR: Math.round(r * 1000) / 1000,
        lagHours: lag,
        sampleCount: Math.min(series[a].length, series[b].length),
        strength,
        direction: r >= 0 ? 'positive' : 'negative',
        interpretation: buildInterpretation(a, b, r, lag),
        actionableInsight: buildActionableInsight(a, b, r),
      });
    }
  }

  // Sort by absolute correlation strength
  correlations.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));

  const causalHypotheses = buildCausalHypotheses(correlations, ctx);
  const topInsight = correlations.length
    ? `Strongest pattern: ${correlations[0].interpretation}`
    : 'Collect more data over multiple days to surface correlations.';

  return { correlations, topInsight, causalHypotheses };
}

// ─── Time Series Extraction ───────────────────────

function extractTimeSeries(ctx: HealthContext): Record<string, number[]> {
  const series: Record<string, number[]> = {};

  // Glucose readings
  if (ctx.glucose.length) {
    series['Glucose'] = ctx.glucose.map(r => r.glucoseMgDL);
  }

  // Vitals by metric type
  const vitalGroups: Record<string, number[]> = {};
  for (const v of ctx.vitals) {
    (vitalGroups[v.metricType] = vitalGroups[v.metricType] ?? []).push(v.value);
  }
  Object.assign(series, vitalGroups);

  // Summary scalars as single-point series for pattern matching
  if (ctx.summary.hrv != null)       series['HRV_summary']   = [ctx.summary.hrv];
  if (ctx.summary.glucose != null)   series['Glucose_fasting'] = [ctx.summary.glucose];
  if (ctx.summary.heartRate != null) series['HR_resting']    = [ctx.summary.heartRate];
  if (ctx.summary.steps != null)     series['Steps']         = [ctx.summary.steps];

  return series;
}

// ─── Pearson Correlation with Lag ────────────────

function pearsonR(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const a = xs.slice(0, n);
  const b = ys.slice(0, n);
  const meanA = mean(a), meanB = mean(b);
  const num = a.reduce((sum, x, i) => sum + (x - meanA) * (b[i] - meanB), 0);
  const denA = Math.sqrt(a.reduce((sum, x) => sum + Math.pow(x - meanA, 2), 0));
  const denB = Math.sqrt(b.reduce((sum, y) => sum + Math.pow(y - meanB, 2), 0));
  return denA * denB === 0 ? 0 : num / (denA * denB);
}

function bestLagCorrelation(
  xs: number[],
  ys: number[],
  lags: number[]
): { r: number; lag: number } {
  let best = { r: 0, lag: 0 };
  for (const lag of lags) {
    const steps = Math.round(lag); // simplified: 1 step ≈ 1 hour
    const xShifted = xs.slice(steps);
    const yTrimmed = ys.slice(0, xShifted.length);
    const r = pearsonR(xShifted, yTrimmed);
    if (Math.abs(r) > Math.abs(best.r)) best = { r, lag };
  }
  return best;
}

// ─── Interpretation Builders ──────────────────────

function buildInterpretation(a: string, b: string, r: number, lag: number): string {
  const dir = r > 0 ? 'positively correlated with' : 'negatively correlated with';
  const strength = Math.abs(r) > 0.7 ? 'strongly' : Math.abs(r) > 0.4 ? 'moderately' : 'weakly';
  const lagStr = lag > 0 ? ` (${lag}h delay)` : '';
  return `${a} is ${strength} ${dir} ${b}${lagStr} (r=${r.toFixed(2)})`;
}

function buildActionableInsight(a: string, b: string, r: number): string {
  const key = `${a}→${b}`;
  const reverseKey = `${b}→${a}`;
  const known = CAUSAL_LIBRARY[key] ?? CAUSAL_LIBRARY[reverseKey];
  if (known) return known.mechanism;
  if (r < -0.5 && a === 'Glucose') return 'Consider limiting refined carbs to improve this metric.';
  if (r > 0.5 && a === 'Steps') return 'Maintaining your step count is positively impacting this metric.';
  return 'Monitor these metrics together to identify actionable patterns over time.';
}

// ─── Causal Hypothesis Generation ─────────────────

function buildCausalHypotheses(
  correlations: MetricCorrelation[],
  _ctx: HealthContext
): CausalHypothesis[] {
  return correlations
    .filter(c => c.strength === 'strong' || c.strength === 'moderate')
    .slice(0, 5)
    .map(c => {
      const key = `${c.metricA}→${c.metricB}`;
      const reverseKey = `${c.metricB}→${c.metricA}`;
      const library = CAUSAL_LIBRARY[key] ?? CAUSAL_LIBRARY[reverseKey];
      return {
        cause: c.metricA,
        effect: c.metricB,
        confidence: Math.min(0.95, Math.abs(c.pearsonR) * 0.9),
        mechanism: library?.mechanism ?? `${c.metricA} and ${c.metricB} move together — a likely physiological link.`,
        evidencePoints: [
          `Pearson r = ${c.pearsonR.toFixed(2)} across ${c.sampleCount} data points`,
          c.lagHours > 0 ? `Effect appears ${c.lagHours}h after cause` : 'Effect appears simultaneously',
          `Direction: ${c.direction} relationship`,
        ],
      };
    });
}

// ─── Utilities ────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

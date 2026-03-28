/* ──────────────────────────────────────────────────
   VitalCoach — Nexla Data Pipeline
   Normalizes heterogeneous wearable/health data
   streams into a unified HealthContext schema.
   Sponsor: Nexla
   ────────────────────────────────────────────────── */

import type {
  HealthContext,
  HealthSummary,
  GlucoseReading,
  VitalSample,
  SleepData,
  MealEvent,
  MoodCheckin,
  MealAnalysisResult,
  MetricCardData,
} from './types.js';

// ─── Pipeline Stages ──────────────────────────────

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  duration?: number;
}

export interface PipelineResult {
  context: HealthContext;
  stages: PipelineStage[];
  totalDuration: number;
}

/** Run the full Nexla-style normalization pipeline */
export function runNexlaPipeline(rawInputs: {
  healthSummary?: Partial<HealthSummary>;
  glucose?: GlucoseReading[];
  vitals?: VitalSample[];
  meals?: MealEvent[];
  sleep?: Partial<SleepData> | null;
  mood?: Partial<MoodCheckin> | null;
  mealAnalysis?: MealAnalysisResult | null;
}): PipelineResult {
  const stages: PipelineStage[] = [
    { name: 'Ingest', status: 'pending' },
    { name: 'Validate', status: 'pending' },
    { name: 'Normalize', status: 'pending' },
    { name: 'Enrich', status: 'pending' },
  ];

  const start = performance.now();

  // Stage 1: Ingest
  stages[0].status = 'running';
  const ingested = ingestRawData(rawInputs);
  stages[0].status = 'complete';
  stages[0].duration = performance.now() - start;

  // Stage 2: Validate
  const validateStart = performance.now();
  stages[1].status = 'running';
  const validated = validateData(ingested);
  stages[1].status = 'complete';
  stages[1].duration = performance.now() - validateStart;

  // Stage 3: Normalize
  const normalizeStart = performance.now();
  stages[2].status = 'running';
  const normalized = normalizeUnits(validated);
  stages[2].status = 'complete';
  stages[2].duration = performance.now() - normalizeStart;

  // Stage 4: Enrich
  const enrichStart = performance.now();
  stages[3].status = 'running';
  const enriched = enrichContext(normalized);
  stages[3].status = 'complete';
  stages[3].duration = performance.now() - enrichStart;

  return {
    context: enriched,
    stages,
    totalDuration: performance.now() - start,
  };
}

// ─── Stage Implementations ────────────────────────

function ingestRawData(raw: Parameters<typeof runNexlaPipeline>[0]): HealthContext {
  return {
    summary: {
      healthScore: raw.healthSummary?.healthScore ?? 0,
      healthLabel: raw.healthSummary?.healthLabel ?? 'Unknown',
      glucose: raw.healthSummary?.glucose ?? null,
      hrv: raw.healthSummary?.hrv ?? null,
      heartRate: raw.healthSummary?.heartRate ?? null,
      sleepHours: raw.healthSummary?.sleepHours ?? null,
      steps: raw.healthSummary?.steps ?? null,
      dopamineDebt: raw.healthSummary?.dopamineDebt ?? null,
      skinScore: raw.healthSummary?.skinScore ?? null,
      topPatterns: raw.healthSummary?.topPatterns ?? [],
    },
    glucose: raw.glucose ?? [],
    vitals: raw.vitals ?? [],
    meals: raw.meals ?? [],
    sleep: raw.sleep ? normalizeSleep(raw.sleep) : null,
    mood: raw.mood ? normalizeMoodCheckin(raw.mood) : null,
    mealAnalysis: raw.mealAnalysis ?? null,
    timestamp: new Date().toISOString(),
  };
}

function validateData(ctx: HealthContext): HealthContext {
  // Clamp health score to valid range
  ctx.summary.healthScore = Math.max(0, Math.min(100, ctx.summary.healthScore));

  // Filter invalid glucose readings
  ctx.glucose = ctx.glucose.filter(
    (r) => r.glucoseMgDL > 0 && r.glucoseMgDL < 500 && r.timestamp
  );

  // Filter invalid vitals
  ctx.vitals = ctx.vitals.filter(
    (v) => v.value >= 0 && v.timestamp && v.metricType
  );

  return ctx;
}

function normalizeUnits(ctx: HealthContext): HealthContext {
  // Ensure glucose is in mg/dL (convert from mmol/L if needed)
  ctx.glucose = ctx.glucose.map((r) => {
    if (r.glucoseMgDL < 30) {
      // Likely mmol/L, convert to mg/dL
      return { ...r, glucoseMgDL: Math.round(r.glucoseMgDL * 18) };
    }
    return r;
  });

  // Sort glucose by timestamp
  ctx.glucose.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Sort vitals by timestamp
  ctx.vitals.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return ctx;
}

function enrichContext(ctx: HealthContext): HealthContext {
  // Auto-compute health label if not set
  if (ctx.summary.healthLabel === 'Unknown') {
    const score = ctx.summary.healthScore;
    ctx.summary.healthLabel =
      score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Attention';
  }

  // If glucose available but summary glucose is null, set from latest reading
  if (ctx.summary.glucose === null && ctx.glucose.length > 0) {
    ctx.summary.glucose = ctx.glucose[ctx.glucose.length - 1].glucoseMgDL;
  }

  // Extract HRV from vitals if not in summary
  if (ctx.summary.hrv === null) {
    const hrvSample = ctx.vitals.find((v) => v.metricType === 'hrv_sdnn');
    if (hrvSample) ctx.summary.hrv = hrvSample.value;
  }

  // Extract heart rate from vitals if not in summary
  if (ctx.summary.heartRate === null) {
    const hrSample = ctx.vitals.find((v) => v.metricType === 'heart_rate' || v.metricType === 'resting_hr');
    if (hrSample) ctx.summary.heartRate = hrSample.value;
  }

  // Extract steps from vitals if not in summary
  if (ctx.summary.steps === null) {
    const stepsSample = ctx.vitals.find((v) => v.metricType === 'step_count');
    if (stepsSample) ctx.summary.steps = stepsSample.value;
  }

  return ctx;
}

// ─── Helpers ──────────────────────────────────────

function normalizeSleep(raw: Partial<SleepData>): SleepData {
  return {
    duration: raw.duration ?? '0h 00m',
    bedtime: raw.bedtime ?? '--:--',
    waketime: raw.waketime ?? '--:--',
    stages: raw.stages ?? [],
  };
}

function normalizeMoodCheckin(raw: Partial<MoodCheckin>): MoodCheckin {
  return {
    transcript: raw.transcript ?? '',
    detectedMood: raw.detectedMood ?? 'Unknown',
    detectedSymptoms: raw.detectedSymptoms ?? [],
    energyLevel: raw.energyLevel ?? 'moderate',
    stressLevel: raw.stressLevel ?? 'moderate',
    timestamp: raw.timestamp ?? new Date().toISOString(),
  };
}

// ─── Build Metric Cards from Health Context ───────

export function buildMetricCards(ctx: HealthContext): MetricCardData[] {
  const cards: MetricCardData[] = [];
  const s = ctx.summary;

  if (s.sleepHours !== null) {
    const hrs = s.sleepHours;
    cards.push({
      label: 'Sleep',
      value: `${Math.floor(hrs)}h ${String(Math.round((hrs % 1) * 60)).padStart(2, '0')}m`,
      unit: '',
      icon: '🌙',
      delta: hrs < 7 ? `↓ ${(7 - hrs).toFixed(1)}h` : 'On track',
      deltaStatus: hrs >= 7 ? 'good' : hrs >= 5.5 ? 'warn' : 'bad',
      sparkline: [],
      color: 'var(--accent-purple)',
      tint: 'var(--tint-purple)',
    });
  }

  if (s.hrv !== null) {
    cards.push({
      label: 'HRV',
      value: String(Math.round(s.hrv)),
      unit: 'ms',
      icon: '📈',
      delta: s.hrv < 40 ? `↓ ${40 - Math.round(s.hrv)}ms` : 'Normal',
      deltaStatus: s.hrv >= 40 ? 'good' : s.hrv >= 25 ? 'warn' : 'bad',
      sparkline: [],
      color: 'var(--accent-teal)',
      tint: 'var(--tint-teal)',
    });
  }

  if (s.glucose !== null) {
    cards.push({
      label: 'Glucose',
      value: String(s.glucose),
      unit: 'mg/dL',
      icon: '🩸',
      delta: s.glucose >= 70 && s.glucose <= 140 ? 'In range' : s.glucose > 140 ? '↑ High' : '↓ Low',
      deltaStatus: s.glucose >= 70 && s.glucose <= 140 ? 'good' : 'warn',
      sparkline: [],
      color: 'var(--accent-blue)',
      tint: 'var(--tint-blue)',
    });
  }

  if (s.heartRate !== null) {
    cards.push({
      label: 'Heart Rate',
      value: String(s.heartRate),
      unit: 'bpm',
      icon: '❤️',
      delta: s.heartRate > 72 ? `↑ ${s.heartRate - 72} bpm` : 'Normal',
      deltaStatus: s.heartRate <= 72 ? 'good' : s.heartRate <= 80 ? 'warn' : 'bad',
      sparkline: [],
      color: 'var(--accent-red)',
      tint: 'var(--tint-red)',
    });
  }

  if (s.steps !== null) {
    cards.push({
      label: 'Steps',
      value: s.steps.toLocaleString(),
      unit: '',
      icon: '🚶',
      delta: s.steps < 8000 ? `↓ ${(8000 - s.steps).toLocaleString()} to goal` : 'On track',
      deltaStatus: s.steps >= 8000 ? 'good' : s.steps >= 4000 ? 'warn' : 'bad',
      sparkline: [],
      color: 'var(--accent-green)',
      tint: 'var(--tint-green)',
    });
  }

  return cards;
}

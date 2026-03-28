/* ──────────────────────────────────────────────────
   VitalCoach — Health Data Service
   Fetches from Cloudflare Worker API with fallback
   to demo fixtures when data is empty/unavailable.
   ────────────────────────────────────────────────── */

import type { HealthSummary, GlucoseReading, VitalSample, MealEvent } from '../lib/types.js';
import { DEMO_HEALTH_SUMMARY, DEMO_GLUCOSE, DEMO_VITALS } from '../lib/demo-data.js';

const API_BASE = '/api/v1/query';

// ─── Fetcher ──────────────────────────────────────

async function fetchHealthApi<T>(
  path: string,
  params?: Record<string, string>
): Promise<T | null> {
  try {
    const url = new URL(`${API_BASE}/${path}`, window.location.origin);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────

export async function getHealthSummary(): Promise<HealthSummary> {
  const data = await fetchHealthApi<HealthSummary>('health-summary', {
    window_hours: '6',
  });

  // Use demo data as fallback if API returns sparse data
  if (!data || (data.glucose === null && data.hrv === null && data.sleepHours === null)) {
    return structuredClone(DEMO_HEALTH_SUMMARY);
  }

  return data;
}

export async function getGlucoseReadings(
  startDate?: string,
  endDate?: string,
  limit = 100
): Promise<GlucoseReading[]> {
  const end = endDate ?? new Date().toISOString();
  const start = startDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const data = await fetchHealthApi<{ readings: GlucoseReading[] }>('glucose', {
    start_date: start,
    end_date: end,
    limit: String(limit),
  });

  if (!data?.readings?.length) {
    return structuredClone(DEMO_GLUCOSE);
  }

  return data.readings;
}

export async function getVitals(
  startDate?: string,
  endDate?: string,
  metricType?: string
): Promise<VitalSample[]> {
  const end = endDate ?? new Date().toISOString();
  const start = startDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const params: Record<string, string> = { start_date: start, end_date: end };
  if (metricType) params.metric_type = metricType;

  const data = await fetchHealthApi<{ samples: VitalSample[] }>('vitals', params);

  if (!data?.samples?.length) {
    return structuredClone(DEMO_VITALS);
  }

  return data.samples;
}

export async function getMeals(
  startDate?: string,
  endDate?: string
): Promise<MealEvent[]> {
  const end = endDate ?? new Date().toISOString();
  const start = startDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const data = await fetchHealthApi<{ meals: MealEvent[] }>('meals', {
    start_date: start,
    end_date: end,
  });

  return data?.meals ?? [];
}

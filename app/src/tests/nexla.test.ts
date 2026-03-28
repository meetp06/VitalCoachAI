/* ──────────────────────────────────────────────────
   VitalCoach — Nexla Pipeline Tests
   ────────────────────────────────────────────────── */

import { describe, it, expect } from 'vitest';
import { runNexlaPipeline, buildMetricCards } from '../lib/nexla.js';

describe('Nexla Pipeline', () => {
  describe('runNexlaPipeline', () => {
    it('normalizes empty input to valid HealthContext', () => {
      const result = runNexlaPipeline({});

      expect(result.context).toBeDefined();
      expect(result.context.summary.healthScore).toBe(0);
      expect(result.context.summary.healthLabel).toBe('Needs Attention');
      expect(result.context.glucose).toEqual([]);
      expect(result.context.vitals).toEqual([]);
      expect(result.context.timestamp).toBeDefined();
    });

    it('runs all 4 pipeline stages', () => {
      const result = runNexlaPipeline({});

      expect(result.stages).toHaveLength(4);
      expect(result.stages.map((s) => s.name)).toEqual(['Ingest', 'Validate', 'Normalize', 'Enrich']);
      result.stages.forEach((s) => {
        expect(s.status).toBe('complete');
        expect(s.duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('reports total duration', () => {
      const result = runNexlaPipeline({});
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('clamps health score to 0-100', () => {
      const resultHigh = runNexlaPipeline({ healthSummary: { healthScore: 150 } as any });
      expect(resultHigh.context.summary.healthScore).toBeLessThanOrEqual(100);

      const resultLow = runNexlaPipeline({ healthSummary: { healthScore: -10 } as any });
      expect(resultLow.context.summary.healthScore).toBeGreaterThanOrEqual(0);
    });

    it('filters invalid glucose readings', () => {
      const result = runNexlaPipeline({
        glucose: [
          { timestamp: '2026-01-01T00:00:00Z', glucoseMgDL: 95, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '2026-01-01T01:00:00Z', glucoseMgDL: -5, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '2026-01-01T02:00:00Z', glucoseMgDL: 600, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '', glucoseMgDL: 100, trend: 'stable' as const, energyState: 'steady' as const },
        ],
      });

      // Only the first reading (95) is valid
      expect(result.context.glucose).toHaveLength(1);
      expect(result.context.glucose[0].glucoseMgDL).toBe(95);
    });

    it('converts mmol/L glucose to mg/dL', () => {
      const result = runNexlaPipeline({
        glucose: [
          { timestamp: '2026-01-01T00:00:00Z', glucoseMgDL: 5.5, trend: 'stable' as const, energyState: 'steady' as const },
        ],
      });

      // 5.5 mmol/L * 18 = 99 mg/dL
      expect(result.context.glucose[0].glucoseMgDL).toBe(99);
    });

    it('sorts glucose readings by timestamp', () => {
      const result = runNexlaPipeline({
        glucose: [
          { timestamp: '2026-01-01T03:00:00Z', glucoseMgDL: 100, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '2026-01-01T01:00:00Z', glucoseMgDL: 90, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '2026-01-01T02:00:00Z', glucoseMgDL: 95, trend: 'stable' as const, energyState: 'steady' as const },
        ],
      });

      expect(result.context.glucose[0].glucoseMgDL).toBe(90);
      expect(result.context.glucose[1].glucoseMgDL).toBe(95);
      expect(result.context.glucose[2].glucoseMgDL).toBe(100);
    });

    it('enriches summary from vitals data', () => {
      const result = runNexlaPipeline({
        healthSummary: { healthScore: 70 } as any,
        vitals: [
          { timestamp: '2026-01-01T00:00:00Z', metricType: 'hrv_sdnn', value: 45, unit: 'ms' },
          { timestamp: '2026-01-01T00:00:00Z', metricType: 'heart_rate', value: 68, unit: 'bpm' },
          { timestamp: '2026-01-01T00:00:00Z', metricType: 'step_count', value: 5000, unit: 'steps' },
        ],
      });

      expect(result.context.summary.hrv).toBe(45);
      expect(result.context.summary.heartRate).toBe(68);
      expect(result.context.summary.steps).toBe(5000);
    });

    it('enriches summary glucose from glucose array', () => {
      const result = runNexlaPipeline({
        glucose: [
          { timestamp: '2026-01-01T00:00:00Z', glucoseMgDL: 95, trend: 'stable' as const, energyState: 'steady' as const },
          { timestamp: '2026-01-01T01:00:00Z', glucoseMgDL: 105, trend: 'rising' as const, energyState: 'rising' as const },
        ],
      });

      // Should use latest reading
      expect(result.context.summary.glucose).toBe(105);
    });

    it('auto-computes health label from score', () => {
      const result = runNexlaPipeline({ healthSummary: { healthScore: 85 } as any });
      expect(result.context.summary.healthLabel).toBe('Excellent');

      const result2 = runNexlaPipeline({ healthSummary: { healthScore: 65 } as any });
      expect(result2.context.summary.healthLabel).toBe('Good');

      const result3 = runNexlaPipeline({ healthSummary: { healthScore: 45 } as any });
      expect(result3.context.summary.healthLabel).toBe('Fair');
    });

    it('normalizes sleep data with defaults', () => {
      const result = runNexlaPipeline({ sleep: {} });
      expect(result.context.sleep).toBeDefined();
      expect(result.context.sleep!.duration).toBe('0h 00m');
      expect(result.context.sleep!.stages).toEqual([]);
    });
  });

  describe('buildMetricCards', () => {
    it('builds cards from health context', () => {
      const result = runNexlaPipeline({
        healthSummary: {
          healthScore: 52,
          healthLabel: 'Needs Attention',
          glucose: 74,
          hrv: 28,
          heartRate: 78,
          sleepHours: 5.1,
          steps: 3840,
          dopamineDebt: 62,
          skinScore: 58,
          topPatterns: [],
        },
      });

      const cards = buildMetricCards(result.context);
      expect(cards.length).toBeGreaterThan(0);

      // Check sleep card
      const sleepCard = cards.find((c) => c.label === 'Sleep');
      expect(sleepCard).toBeDefined();
      expect(sleepCard!.deltaStatus).toBe('bad'); // 5.1h < 5.5h
    });

    it('handles all null summary values', () => {
      const result = runNexlaPipeline({});
      const cards = buildMetricCards(result.context);
      expect(cards).toEqual([]);
    });
  });
});

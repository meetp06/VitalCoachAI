/* ──────────────────────────────────────────────────
   VitalCoach — Insight Engine Tests
   ────────────────────────────────────────────────── */

import { describe, it, expect } from 'vitest';
import { generateRuleBasedInsight } from '../services/insight-engine.js';
import type { HealthContext } from '../lib/types.js';

function makeContext(overrides: Partial<HealthContext['summary']> = {}): HealthContext {
  return {
    summary: {
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
      ...overrides,
    },
    glucose: [],
    vitals: [],
    meals: [],
    sleep: {
      duration: '5h 06m',
      bedtime: '1:24 AM',
      waketime: '6:30 AM',
      stages: [
        { label: 'Awake', percent: 14 },
        { label: 'REM', percent: 18 },
        { label: 'Core', percent: 36 },
        { label: 'Deep', percent: 32 },
      ],
    },
    mood: null,
    mealAnalysis: null,
    timestamp: new Date().toISOString(),
  };
}

describe('Insight Engine', () => {
  describe('generateRuleBasedInsight', () => {
    it('generates observations from poor health data', () => {
      const ctx = makeContext();
      const result = generateRuleBasedInsight(ctx);

      expect(result.observations).toBeInstanceOf(Array);
      expect(result.observations.length).toBeGreaterThan(0);
      // Should mention sleep being below target
      expect(result.observations.some((o) => o.includes('sleep'))).toBe(true);
    });

    it('identifies contributing factors with correct impact levels', () => {
      const ctx = makeContext();
      const result = generateRuleBasedInsight(ctx);

      expect(result.contributingFactors.length).toBeGreaterThan(0);

      // Sleep debt should be high impact when < 6 hours
      const sleepFactor = result.contributingFactors.find((f) => f.name.includes('Sleep'));
      expect(sleepFactor).toBeDefined();
      expect(sleepFactor!.impact).toBe('high');

      // Low HRV should be high impact
      const hrvFactor = result.contributingFactors.find((f) => f.name.includes('HRV'));
      expect(hrvFactor).toBeDefined();
      expect(hrvFactor!.impact).toBe('high');
    });

    it('generates action plan with three sections', () => {
      const ctx = makeContext();
      const result = generateRuleBasedInsight(ctx);

      expect(result.actionPlan.rightNow).toBeInstanceOf(Array);
      expect(result.actionPlan.nextMeal).toBeInstanceOf(Array);
      expect(result.actionPlan.tonight).toBeInstanceOf(Array);

      // Should always have hydration recommendation
      expect(result.actionPlan.rightNow.some((a) => a.icon === '💧')).toBe(true);
    });

    it('includes a disclaimer', () => {
      const ctx = makeContext();
      const result = generateRuleBasedInsight(ctx);

      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer.length).toBeGreaterThan(0);
      expect(result.disclaimer.toLowerCase()).toContain('not medical advice');
    });

    it('does not produce diagnostic language in observations', () => {
      const ctx = makeContext();
      const result = generateRuleBasedInsight(ctx);

      const bannedPhrases = ['you have', 'you are diagnosed', 'disease detected', 'prescribe'];
      const allText = result.observations.join(' ').toLowerCase();

      bannedPhrases.forEach((phrase) => {
        expect(allText).not.toContain(phrase);
      });
    });

    it('handles healthy data gracefully', () => {
      const ctx = makeContext({
        healthScore: 92,
        sleepHours: 7.8,
        hrv: 55,
        glucose: 95,
        heartRate: 62,
        steps: 9200,
        dopamineDebt: 20,
      });
      const result = generateRuleBasedInsight(ctx);

      expect(result.observations.length).toBeGreaterThan(0);
      // Should be positive messaging
      expect(result.contributingFactors.length).toBe(0);
    });

    it('handles null values without crashing', () => {
      const ctx = makeContext({
        glucose: null,
        hrv: null,
        heartRate: null,
        sleepHours: null,
        steps: null,
        dopamineDebt: null,
      });

      expect(() => generateRuleBasedInsight(ctx)).not.toThrow();
      const result = generateRuleBasedInsight(ctx);
      expect(result.observations).toBeInstanceOf(Array);
    });

    it('detects mood correlation when voice check-in is present', () => {
      const ctx: HealthContext = {
        ...makeContext(),
        mood: {
          transcript: 'I feel very tired and stressed.',
          detectedMood: 'Fatigued',
          detectedSymptoms: ['fatigue', 'stress'],
          energyLevel: 'low',
          stressLevel: 'moderate',
          timestamp: new Date().toISOString(),
        },
      };

      const result = generateRuleBasedInsight(ctx);
      // Should mention voice check-in findings
      expect(result.observations.some((o) => o.includes('check-in') || o.includes('mood'))).toBe(true);
      // Should find correlation with physical data
      expect(result.correlations.length).toBeGreaterThan(0);
    });

    it('detects meal correlation when meal analysis is present', () => {
      const ctx: HealthContext = {
        ...makeContext({ glucose: 68 }),
        mealAnalysis: {
          foods: [{ name: 'Pasta', portion: '2 cups', confidence: 0.9 }],
          macros: { calories: 500, proteinG: 15, carbsG: 65, fatG: 12, fiberG: 3 },
          glycemicImpact: 'high',
          glycemicLoadEstimate: 28,
          contextualNote: 'High GL meal',
          disclaimer: 'Estimates only',
        },
      };

      const result = generateRuleBasedInsight(ctx);
      const mealCorrelation = result.correlations.find((c) => c.description.includes('glucose'));
      expect(mealCorrelation).toBeDefined();
    });

    it('generates correct action items based on context', () => {
      const ctx = makeContext({ steps: 2000 });
      const result = generateRuleBasedInsight(ctx);

      // Low steps should trigger walking recommendation
      expect(result.actionPlan.rightNow.some((a) => a.title.toLowerCase().includes('walk'))).toBe(true);
    });
  });
});

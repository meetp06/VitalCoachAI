/* ──────────────────────────────────────────────────
   VitalCoach — Insight Engine
   Correlation logic that combines multimodal inputs
   with structured health data to produce coaching.
   ────────────────────────────────────────────────── */

import type {
  HealthContext,
  InsightResult,
  ContributingFactor,
  Correlation,
  ActionPlan,
  ActionItem,
} from '../lib/types.js';
import { DISCLAIMER } from '../lib/safety.js';

// ─── Main Engine ──────────────────────────────────

/** Generate insights from health context using rule-based correlation engine */
export function generateRuleBasedInsight(ctx: HealthContext): InsightResult {
  const observations = generateObservations(ctx);
  const factors = identifyContributingFactors(ctx);
  const correlations = findCorrelations(ctx);
  const actionPlan = generateActionPlan(ctx, factors);

  return {
    observations,
    contributingFactors: factors,
    correlations,
    actionPlan,
    disclaimer: DISCLAIMER,
  };
}

// ─── Observation Generation ───────────────────────

function generateObservations(ctx: HealthContext): string[] {
  const obs: string[] = [];
  const s = ctx.summary;

  if (s.sleepHours !== null && s.sleepHours < 6) {
    obs.push(
      `Your sleep was significantly below target at ${s.sleepHours.toFixed(1)} hours — ` +
      `about ${(7.5 - s.sleepHours).toFixed(1)} hours short of the recommended 7-8 hours.`
    );
  } else if (s.sleepHours !== null && s.sleepHours < 7) {
    obs.push(`Your sleep was slightly below target at ${s.sleepHours.toFixed(1)} hours.`);
  }

  if (s.hrv !== null && s.hrv < 30) {
    obs.push(
      `Your HRV of ${Math.round(s.hrv)}ms is well below the healthy range (40-60ms), ` +
      `suggesting your body has not fully recovered.`
    );
  } else if (s.hrv !== null && s.hrv < 40) {
    obs.push(`Your HRV of ${Math.round(s.hrv)}ms is somewhat below optimal.`);
  }

  if (s.glucose !== null && s.glucose < 70) {
    obs.push(
      `Your glucose is at ${s.glucose} mg/dL, which is below the normal range and may be ` +
      `contributing to fatigue and difficulty concentrating.`
    );
  } else if (s.glucose !== null && s.glucose > 160) {
    obs.push(`Your glucose is elevated at ${s.glucose} mg/dL, above the optimal post-meal range.`);
  }

  if (s.steps !== null && s.steps < 4000) {
    obs.push(
      `With only ${s.steps.toLocaleString()} steps today, reduced movement may be ` +
      `compounding low energy levels.`
    );
  }

  if (s.heartRate !== null && s.heartRate > 75) {
    obs.push(
      `Your resting heart rate of ${s.heartRate} bpm is above your typical baseline, ` +
      `which may indicate stress or incomplete recovery.`
    );
  }

  if (s.dopamineDebt !== null && s.dopamineDebt > 50) {
    obs.push(
      `Your dopamine debt score of ${Math.round(s.dopamineDebt)}/100 suggests elevated ` +
      `screen/stimulation exposure, which can impact sleep quality and focus.`
    );
  }

  if (ctx.mood) {
    obs.push(
      `Your voice check-in indicates ${ctx.mood.detectedMood.toLowerCase()} mood with ` +
      `${ctx.mood.energyLevel} energy and ${ctx.mood.stressLevel} stress.`
    );
  }

  if (obs.length === 0) {
    obs.push('Your health metrics look generally balanced today. Keep up the good patterns!');
  }

  return obs;
}

// ─── Contributing Factor Identification ───────────

function identifyContributingFactors(ctx: HealthContext): ContributingFactor[] {
  const factors: ContributingFactor[] = [];
  const s = ctx.summary;

  if (s.sleepHours !== null && s.sleepHours < 6) {
    factors.push({
      name: 'Sleep debt',
      detail: `${s.sleepHours.toFixed(1)} hours — about ${(7.5 - s.sleepHours).toFixed(1)} hours below your target. Your body didn't get adequate recovery time.`,
      impact: 'high',
      icon: 'sleep',
    });
  }

  if (s.hrv !== null && s.hrv < 30) {
    factors.push({
      name: 'Low HRV',
      detail: `${Math.round(s.hrv)}ms is significantly below baseline — your nervous system is under-recovered.`,
      impact: 'high',
      icon: 'hrv',
    });
  }

  if (s.glucose !== null && s.glucose < 70) {
    factors.push({
      name: 'Low glucose',
      detail: `At ${s.glucose} mg/dL, your blood sugar is below the normal range, impacting energy and focus.`,
      impact: 'medium',
      icon: 'glucose',
    });
  } else if (s.glucose !== null && s.glucose > 160) {
    factors.push({
      name: 'Elevated glucose',
      detail: `At ${s.glucose} mg/dL, your blood sugar is above optimal range.`,
      impact: 'medium',
      icon: 'glucose',
    });
  }

  if (s.steps !== null && s.steps < 4000) {
    factors.push({
      name: 'Low activity',
      detail: `${s.steps.toLocaleString()} steps — below half your typical daily activity.`,
      impact: 'medium',
      icon: 'steps',
    });
  }

  if (s.heartRate !== null && s.heartRate > 75) {
    factors.push({
      name: 'Elevated resting HR',
      detail: `${s.heartRate} bpm is above your typical baseline — may indicate stress or under-recovery.`,
      impact: 'low',
      icon: 'hr',
    });
  }

  if (s.dopamineDebt !== null && s.dopamineDebt > 50) {
    factors.push({
      name: 'High screen stimulation',
      detail: `Dopamine debt at ${Math.round(s.dopamineDebt)}/100 — excess stimulation impacts recovery.`,
      impact: 'low',
      icon: 'screen',
    });
  }

  return factors;
}

// ─── Correlation Detection ────────────────────────

function findCorrelations(ctx: HealthContext): Correlation[] {
  const correlations: Correlation[] = [];
  const s = ctx.summary;

  // Sleep + HRV + Glucose compound effect
  if (s.sleepHours !== null && s.sleepHours < 6 && s.hrv !== null && s.hrv < 35) {
    const dataPoints = [`sleep: ${s.sleepHours.toFixed(1)}h`, `HRV: ${Math.round(s.hrv)}ms`];
    if (s.glucose !== null) dataPoints.push(`glucose: ${s.glucose} mg/dL`);

    correlations.push({
      description:
        `Poor sleep and low HRV are likely working together. Sleep under 6 hours reduces your ` +
        `nervous system's capacity to recover, which is reflected in the low HRV.` +
        (s.glucose !== null && s.glucose < 80
          ? ` The glucose dip adds a third stressor, creating a compound fatigue effect.`
          : ''),
      strength: 0.88,
      dataPoints,
    });
  }

  // Glucose + Meal correlation
  if (ctx.mealAnalysis && s.glucose !== null && s.glucose < 80) {
    correlations.push({
      description:
        `Your glucose dip may be related to the glycemic profile of your recent meal. ` +
        `A glycemic load of ~${ctx.mealAnalysis.glycemicLoadEstimate} without sufficient protein ` +
        `can cause a spike-and-crash pattern, especially when your body is already under-recovered.`,
      strength: 0.82,
      dataPoints: [
        `meal GL: ${ctx.mealAnalysis.glycemicLoadEstimate}`,
        `protein: ${ctx.mealAnalysis.macros.proteinG}g`,
        `current glucose: ${s.glucose} mg/dL`,
      ],
    });
  }

  // Mood + Physical data correlation
  if (ctx.mood && ctx.mood.energyLevel === 'low') {
    const supporting: string[] = [];
    if (s.sleepHours !== null && s.sleepHours < 6) supporting.push(`sleep: ${s.sleepHours.toFixed(1)}h`);
    if (s.hrv !== null && s.hrv < 35) supporting.push(`HRV: ${Math.round(s.hrv)}ms`);
    if (s.steps !== null && s.steps < 4000) supporting.push(`steps: ${s.steps.toLocaleString()}`);

    if (supporting.length >= 2) {
      correlations.push({
        description:
          `Your reported fatigue and low energy are consistent with your physiological data. ` +
          `The combination of ${supporting.join(' and ')} provides objective backing for how you're feeling.`,
        strength: 0.85,
        dataPoints: supporting,
      });
    }
  }

  return correlations;
}

// ─── Action Plan Generation ───────────────────────

function generateActionPlan(ctx: HealthContext, factors: ContributingFactor[]): ActionPlan {
  const rightNow: ActionItem[] = [];
  const nextMeal: ActionItem[] = [];
  const tonight: ActionItem[] = [];
  const s = ctx.summary;

  // Right Now recommendations
  rightNow.push({
    icon: '💧',
    title: 'Hydrate',
    description: 'Drink 2 glasses of water. Dehydration amplifies fatigue and glucose instability.',
  });

  if (s.steps !== null && s.steps < 4000) {
    rightNow.push({
      icon: '🚶',
      title: '10-minute gentle walk',
      description: 'Light movement stabilizes glucose and boosts circulation without taxing your tired body.',
    });
  }

  if (s.hrv !== null && s.hrv < 35) {
    rightNow.push({
      icon: '🧘',
      title: '5-minute breathing exercise',
      description: 'Box breathing (4-4-4-4) helps recover HRV and reduces stress signals.',
    });
  }

  // Next Meal recommendations
  if (s.glucose !== null && s.glucose < 80) {
    nextMeal.push({
      icon: '🥩',
      title: 'Prioritize protein',
      description: 'Aim for 30-40g protein to sustain energy and prevent another glucose crash.',
    });
  }

  nextMeal.push({
    icon: '🥑',
    title: 'Include healthy fats',
    description: 'Avocado, nuts, or olive oil slow glucose absorption and extend satiety.',
  });

  nextMeal.push({
    icon: '🥦',
    title: 'Fiber-rich vegetables',
    description: 'Spinach, broccoli, or kale — fiber blunts the glucose spike from carbohydrates.',
  });

  // Tonight recommendations
  if (s.sleepHours !== null && s.sleepHours < 7) {
    tonight.push({
      icon: '🌙',
      title: `Aim for ${Math.min(9, 7.5 + (7.5 - s.sleepHours)).toFixed(0)} hours in bed`,
      description: "You're carrying sleep debt. Start repaying with an early bedtime tonight.",
    });
  }

  if (s.dopamineDebt !== null && s.dopamineDebt > 40) {
    tonight.push({
      icon: '📵',
      title: 'Screens off by 9:30 PM',
      description: 'Give melatonin 90+ minutes to kick in before your target bedtime.',
    });
  }

  tonight.push({
    icon: '🫖',
    title: 'Wind-down routine',
    description: 'Herbal tea, dim lights, and light reading signal your body to prepare for sleep.',
  });

  return { rightNow, nextMeal, tonight };
}

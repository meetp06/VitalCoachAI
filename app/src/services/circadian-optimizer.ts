/* ──────────────────────────────────────────────────
   VitalCoach — Circadian Rhythm Optimizer
   Calculates personalized chronotype, optimal sleep
   window, peak performance zones, and melatonin onset
   using the two-process model of sleep regulation.
   ────────────────────────────────────────────────── */

import type { HealthContext, SleepData } from '../lib/types.js';

export type Chronotype = 'early-bird' | 'intermediate' | 'night-owl';

export interface CircadianProfile {
  chronotype: Chronotype;
  chronotypeConfidence: number;       // 0–1
  msbf: number;                       // Midpoint of Sleep on Free Days (minutes past midnight)
  socialJetlag: number;               // hours of misalignment
}

export interface DailySchedule {
  wakeTime: string;
  sleepTime: string;
  melatoninOnset: string;             // 2h before sleep
  peakAlertness: string;              // cortisol peak + 2h
  afternoonDip: string;               // post-lunch dip window
  peakPhysical: string;               // body temp peak ≈ early evening
  caffeineWindow: { start: string; cutoff: string };
  mealWindows: { breakfast: string; lunch: string; dinner: string };
}

export interface CircadianOptimization {
  profile: CircadianProfile;
  schedule: DailySchedule;
  recommendations: string[];
  sleepPressure: number;              // 0–100 (adenosine load)
  alertnessScore: number;             // 0–100 (current predicted alertness)
}

// ─── Chronotype Detection ─────────────────────────

export function detectChronotype(sleepHistory: SleepData[]): CircadianProfile {
  if (!sleepHistory.length) {
    return { chronotype: 'intermediate', chronotypeConfidence: 0.5, msbf: 210, socialJetlag: 1.0 };
  }

  // Calculate midpoints of sleep in minutes past midnight
  const midpoints = sleepHistory.map(s => {
    const bed = parseTimeToMinutes(s.bedtime);
    const wake = parseTimeToMinutes(s.waketime);
    const duration = wake < bed ? wake + 1440 - bed : wake - bed;
    return (bed + duration / 2) % 1440;
  });

  const msbf = Math.round(midpoints.reduce((a, b) => a + b, 0) / midpoints.length);

  // MEQ (Morningness-Eveningness Questionnaire) proxy from midpoint
  const chronotype: Chronotype =
    msbf < 180 ? 'early-bird' :   // sleep midpoint before 3 AM
    msbf > 270 ? 'night-owl' :    // sleep midpoint after 4:30 AM
    'intermediate';

  const variance = stddev(midpoints, msbf);
  const confidence = Math.max(0.3, Math.min(0.95, 1 - variance / 120));

  // Social jetlag: difference between free-day and work-day midpoints
  // Approximated as 1.5h for intermediate, more for extremes
  const socialJetlag = chronotype === 'intermediate' ? 1.2 :
                       chronotype === 'night-owl' ? 2.5 : 0.6;

  return { chronotype, chronotypeConfidence: confidence, msbf, socialJetlag };
}

// ─── Daily Schedule Generation ────────────────────

export function generateOptimalSchedule(
  profile: CircadianProfile,
  ctx: HealthContext
): DailySchedule {
  // Base wake time from chronotype
  const baseWakeMinutes =
    profile.chronotype === 'early-bird' ? 360 :   // 6:00 AM
    profile.chronotype === 'night-owl'  ? 480 :   // 8:00 AM
    420;                                           // 7:00 AM

  // Adjust for current HRV: if HRV is low, recommend 30 min extra sleep
  const hrvPenalty = (ctx.summary.hrv ?? 40) < 35 ? 30 : 0;
  const adjustedWake = baseWakeMinutes + hrvPenalty;

  const sleepMinutes = adjustedWake - (7.5 * 60); // target 7.5h sleep
  const melatoninMinutes = sleepMinutes - 120;     // melatonin onset 2h before bed

  // Cortisol awakening response peaks ~30-45 min after wake
  const peakAlertnessMinutes = adjustedWake + 120; // cortisol peak + 2h delay

  // Afternoon dip: circadian trough ~7h after wake
  const afternoonDipMinutes = adjustedWake + 420;

  // Peak physical performance: core body temp peak ~12h after wake midpoint
  const peakPhysicalMinutes = adjustedWake + 600;

  // Caffeine window: avoid first 90 min (cortisol spike) and last 8h before sleep
  const caffeineStart = adjustedWake + 90;
  const caffeineCutoff = sleepMinutes - 480;

  return {
    wakeTime: minutesToTime(adjustedWake),
    sleepTime: minutesToTime(sleepMinutes < 0 ? sleepMinutes + 1440 : sleepMinutes),
    melatoninOnset: minutesToTime(melatoninMinutes < 0 ? melatoninMinutes + 1440 : melatoninMinutes),
    peakAlertness: minutesToTime(peakAlertnessMinutes),
    afternoonDip: `${minutesToTime(afternoonDipMinutes)} – ${minutesToTime(afternoonDipMinutes + 30)}`,
    peakPhysical: minutesToTime(peakPhysicalMinutes),
    caffeineWindow: {
      start: minutesToTime(caffeineStart),
      cutoff: minutesToTime(caffeineCutoff),
    },
    mealWindows: {
      breakfast: minutesToTime(adjustedWake + 30),
      lunch:     minutesToTime(adjustedWake + 300),
      dinner:    minutesToTime(adjustedWake + 600),
    },
  };
}

// ─── Full Optimization ────────────────────────────

export function optimizeCircadian(
  ctx: HealthContext,
  sleepHistory: SleepData[] = []
): CircadianOptimization {
  const allSleep = ctx.sleep ? [ctx.sleep, ...sleepHistory] : sleepHistory;
  const profile = detectChronotype(allSleep);
  const schedule = generateOptimalSchedule(profile, ctx);

  // Sleep pressure (adenosine): rises with wakefulness, clears during sleep
  const hoursAwake = ctx.sleep
    ? 24 - parseFloat(ctx.sleep.duration)
    : 16;
  const sleepPressure = Math.min(100, Math.round((hoursAwake / 18) * 100));

  // Current alertness: modulated by circadian phase + sleep pressure
  const hourNow = new Date().getHours();
  const wakeHour = parseTimeToMinutes(schedule.wakeTime) / 60;
  const hoursAwakeNow = (hourNow - wakeHour + 24) % 24;
  const circadianBoost = Math.sin(((hoursAwakeNow - 2) / 16) * Math.PI) * 30;
  const alertnessScore = Math.round(
    Math.max(10, Math.min(100, 70 + circadianBoost - (ctx.summary.hrv ?? 35) < 30 ? 15 : 0))
  );

  const recommendations = buildRecommendations(profile, schedule, ctx);

  return { profile, schedule, recommendations, sleepPressure, alertnessScore };
}

// ─── Recommendations ──────────────────────────────

function buildRecommendations(
  profile: CircadianProfile,
  schedule: DailySchedule,
  ctx: HealthContext
): string[] {
  const recs: string[] = [];

  if (profile.socialJetlag > 2) {
    recs.push(`You have ${profile.socialJetlag.toFixed(1)}h of social jetlag. Gradually shift your weekend wake time 30 min earlier each week to align with your workday rhythm.`);
  }

  recs.push(`Avoid caffeine before ${schedule.caffeineWindow.start} (cortisol is naturally high) and after ${schedule.caffeineWindow.cutoff} to protect sleep onset.`);

  recs.push(`Your peak cognitive performance window is around ${schedule.peakAlertness}. Schedule deep work and important decisions then.`);

  recs.push(`Best time for intense physical training: ${schedule.peakPhysical} when your core body temperature is highest.`);

  if ((ctx.summary.hrv ?? 40) < 35) {
    recs.push(`Your low HRV suggests your circadian rhythm is disrupted. Aim for consistent ${schedule.wakeTime} wake times — even on weekends — to re-entrainment your biological clock.`);
  }

  recs.push(`Limit bright light exposure after ${schedule.melatoninOnset} to allow natural melatonin production. Use blue-light filters or dim amber lighting.`);

  return recs;
}

// ─── Utilities ────────────────────────────────────

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 420;
  const [h, m] = timeStr.replace(/[AP]M/i, '').trim().split(':').map(Number);
  const isPM = /PM/i.test(timeStr) && h !== 12;
  const isAMmidnight = /AM/i.test(timeStr) && h === 12;
  return ((isPM ? h + 12 : isAMmidnight ? 0 : h) * 60) + (m || 0);
}

function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / arr.length);
}

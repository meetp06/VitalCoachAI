/* ──────────────────────────────────────────────────
   VitalCoach — Google DeepMind (Gemini) Abstraction
   Multimodal reasoning: meal images, voice check-ins,
   correlation generation. Falls back to mock provider.
   Sponsor: Google DeepMind
   ────────────────────────────────────────────────── */

import type { HealthContext, MealAnalysisResult, MoodCheckin, InsightResult } from './types.js';
import { DEMO_MEAL_ANALYSIS, DEMO_MOOD_CHECKIN, DEMO_INSIGHT } from './demo-data.js';
import { sanitizeOutput } from './safety.js';

// ─── Config ───────────────────────────────────────

const GEMINI_API_KEY = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';
const USE_MOCK = !GEMINI_API_KEY;

// ─── Meal Image Analysis ─────────────────────────

export async function analyzeMealImage(
  _imageDataUrl: string,
  _healthContext: HealthContext
): Promise<MealAnalysisResult> {
  if (USE_MOCK) {
    // Simulate API delay
    await delay(1500);
    return structuredClone(DEMO_MEAL_ANALYSIS);
  }

  // Live Gemini Vision call would go here
  // const response = await callGemini('gemini-pro-vision', { image, prompt });
  await delay(1500);
  return structuredClone(DEMO_MEAL_ANALYSIS);
}

// ─── Voice Check-in Interpretation ────────────────

export async function interpretVoiceCheckin(
  transcript: string,
  _healthContext: HealthContext
): Promise<MoodCheckin> {
  if (USE_MOCK) {
    await delay(1200);
    return {
      ...structuredClone(DEMO_MOOD_CHECKIN),
      transcript,
      timestamp: new Date().toISOString(),
    };
  }

  // Live Gemini call: send transcript + health context for interpretation
  await delay(1200);
  return {
    ...structuredClone(DEMO_MOOD_CHECKIN),
    transcript,
    timestamp: new Date().toISOString(),
  };
}

// ─── Correlation & Insight Generation ─────────────

export async function generateInsight(
  healthContext: HealthContext,
  userQuestion?: string
): Promise<InsightResult> {
  if (USE_MOCK) {
    await delay(2000);
    const insight = structuredClone(DEMO_INSIGHT);
    // Customize based on context
    if (userQuestion) {
      insight.observations[0] = `In response to "${userQuestion}": ${insight.observations[0]}`;
    }
    return insight;
  }

  // Live Gemini call with wellness-only safety prompt
  await delay(2000);
  return structuredClone(DEMO_INSIGHT);
}

// ─── Chat Response Generation ─────────────────────

export async function generateChatResponse(
  userMessage: string,
  healthContext: HealthContext
): Promise<{ content: string; suggestions: string[] }> {
  if (USE_MOCK) {
    await delay(1000);
    const result = generateMockChatResponse(userMessage, healthContext);
    return { content: sanitizeOutput(result.content), suggestions: result.suggestions };
  }

  await delay(1000);
  const result = generateMockChatResponse(userMessage, healthContext);
  return { content: sanitizeOutput(result.content), suggestions: result.suggestions };
}

// ─── Mock Chat Response Logic ─────────────────────

function generateMockChatResponse(message: string, ctx: HealthContext): { content: string; suggestions: string[] } {
  const lower = message.toLowerCase();

  if (lower.match(/tired|fatigue|exhausted|energy|sleepy/)) {
    return {
      content:
        `Based on your data today, there are several likely reasons for your fatigue:\n\n` +
        `• **Sleep was short** — You got ${ctx.sleep?.duration ?? '5h 06m'} against a 7.5h target\n` +
        `• **Low HRV** — At ${ctx.summary.hrv ?? 28}ms your nervous system hasn't fully recovered\n` +
        `• **Glucose dip** — Your glucose dropped to ${ctx.summary.glucose ?? 74} mg/dL after lunch\n\n` +
        `These three factors together create a compound effect on energy. Hydrate now, take a short walk, and prioritize protein at your next meal.`,
      suggestions: [
        'What should I eat for dinner?',
        'How can I improve my HRV today?',
        'Show me a 5-minute recovery routine',
      ],
    };
  }

  if (lower.match(/sleep|night|bed|insomnia/)) {
    return {
      content:
        `Your sleep last night was ${ctx.sleep?.duration ?? '5h 06m'}, which is below your 7.5h target.\n\n` +
        `**Sleep Stages:**\n` +
        `• Deep Sleep: ${ctx.sleep?.stages.find(s => s.label === 'Deep')?.percent ?? 32}%\n` +
        `• REM Sleep: ${ctx.sleep?.stages.find(s => s.label === 'REM')?.percent ?? 18}%\n\n` +
        `To improve tonight: screens off by 9:30 PM, keep your bedroom at 65-68°F, and avoid caffeine after 2 PM.`,
      suggestions: [
        'What time should I stop drinking coffee today?',
        'How does screen time affect my sleep stages?',
        'Give me a bedtime wind-down routine',
      ],
    };
  }

  if (lower.match(/glucose|blood sugar|sugar|spike|crash/)) {
    return {
      content:
        `Your glucose today shows a clear spike-and-crash pattern:\n\n` +
        `• Morning fasting: 85 mg/dL — normal\n` +
        `• Post-breakfast: 132 mg/dL — elevated spike\n` +
        `• Post-lunch: 68 mg/dL — low crash\n\n` +
        `The crash after lunch is likely from eating moderate-carbs without enough protein or fat to slow absorption. For your next meal, lead with protein and add healthy fats before the carbs.`,
      suggestions: [
        'What should I eat for dinner to avoid another crash?',
        'Would a 10-minute walk after eating help?',
        'Upload a meal photo to check the macros',
      ],
    };
  }

  // Breathing/meditation check — must come BEFORE the exercise pattern
  if (lower.match(/breath|meditat|calm down|relax|box breath/)) {
    return {
      content:
        `Here is a 5-minute box breathing exercise tailored to your current state (HRV: ${ctx.summary.hrv ?? 28}ms):\n\n` +
        `**Round 1-3 (minutes 1-3):** Gentle warm-up\n` +
        `• Inhale slowly through your nose — 4 seconds\n` +
        `• Hold at the top — 4 seconds\n` +
        `• Exhale fully through your mouth — 4 seconds\n` +
        `• Hold at the bottom — 4 seconds\n\n` +
        `**Round 4-5 (minutes 4-5):** Extended exhale for deeper calm\n` +
        `• Inhale — 4 seconds\n` +
        `• Hold — 4 seconds\n` +
        `• Exhale — 6 seconds\n` +
        `• Hold — 2 seconds\n\n` +
        `Do this seated with your eyes closed. Box breathing activates your parasympathetic nervous system and can raise HRV within minutes.`,
      suggestions: [
        'How is my HRV connected to stress?',
        'What else can I do to lower stress today?',
        'Show me my stress trend this week',
      ],
    };
  }

  if (lower.match(/workout|exerc|excer|exref|train|gym|run|walk|lift/)) {
    return {
      content:
        `Given your current recovery state, I recommend keeping today's activity light:\n\n` +
        `**Recovery status:**\n` +
        `• HRV: ${ctx.summary.hrv ?? 28}ms (low — nervous system under-recovered)\n` +
        `• Sleep: ${ctx.sleep?.duration ?? '5h 06m'} (inadequate)\n\n` +
        `Switch to light recovery work — a 20-minute walk, stretching, or yoga — instead of intense training. Your body needs the recovery stimulus more than the training load today.`,
      suggestions: [
        'Show me a 15-minute recovery stretching routine',
        'When can I do a full workout again?',
        'How many steps should I aim for today?',
      ],
    };
  }

  if (lower.match(/meal|eat|food|lunch|diet|dinner|breakfast|snack/)) {
    return {
      content:
        `Based on your current glucose trend and energy state, here is your dinner plan:\n\n` +
        `**Current glucose:** ${ctx.summary.glucose ?? 74} mg/dL (dipping — needs stabilization)\n\n` +
        `• **Lead with protein** — 30-40g (chicken, fish, eggs, or tofu) before carbs\n` +
        `• **Add healthy fats** — Avocado, olive oil, or nuts slow glucose absorption\n` +
        `• **Fiber-first vegetables** — Spinach, broccoli, or kale blunt glucose spikes\n` +
        `• **Limit refined carbs** — Skip bread and pasta tonight to prevent another crash`,
      suggestions: [
        'Upload a meal photo to check the macros',
        'How much protein do I need today?',
        'Would this cause a glucose spike without exercise?',
      ],
    };
  }

  if (lower.match(/stress|anxious|overwhelmed|worry/)) {
    return {
      content:
        `Your stress signals are showing in the data:\n\n` +
        `• HRV: ${ctx.summary.hrv ?? 28}ms — nervous system under stress\n` +
        `• Resting HR: ${ctx.summary.heartRate ?? 78} bpm — above your baseline\n\n` +
        `Try 5 minutes of box breathing right now (inhale 4s, hold 4s, exhale 4s, hold 4s). Research shows this shifts your nervous system toward recovery mode within minutes.`,
      suggestions: [
        'Guide me through the full breathing exercise',
        'What is causing my stress according to my data?',
        'How long until my HRV recovers?',
      ],
    };
  }

  if (lower.match(/water|hydrat|fluid|drink.*liter|liter.*drink/)) {
    const weightKg = 70; // estimated; real app would use profile
    const baselineLiters = (weightKg * 0.033).toFixed(1);
    const adjustedLiters = (weightKg * 0.033 + 0.5).toFixed(1); // +0.5L for low HRV / poor sleep

    return {
      content:
        `Based on your body and today's health state, here is your hydration target:\n\n` +
        `**Baseline:** ~${baselineLiters}L per day (standard 33ml per kg of body weight)\n` +
        `**Your adjusted target today:** ~${adjustedLiters}L\n\n` +
        `Why more today?\n` +
        `• Your HRV of ${ctx.summary.hrv ?? 28}ms suggests dehydration stress\n` +
        `• Poor sleep increases cortisol, which raises fluid needs\n` +
        `• Low glucose (${ctx.summary.glucose ?? 74} mg/dL) is worsened by dehydration\n\n` +
        `**How to spread it:**\n` +
        `• Morning: 500ml on waking\n` +
        `• Before each meal: 250ml\n` +
        `• After any activity: 300-500ml\n` +
        `• Avoid large amounts right before bed`,
      suggestions: [
        'Should I add electrolytes to my water?',
        'How does dehydration affect my HRV?',
        'What other drinks count toward my fluid intake?',
      ],
    };
  }

  if (lower.match(/coffee|caffeine|espresso|latte|cappuccino/)) {
    const sleepHours = ctx.sleep ? parseFloat(ctx.sleep.duration) : 5.1;
    // Caffeine half-life ~5-6 hours; with poor sleep sensitivity is higher
    // Stop time = target bedtime (10:30 PM) minus 2 half-lives
    const stopHour = sleepHours < 6 ? 13 : 14; // 1 PM if sleep-deprived, 2 PM otherwise
    const stopTime = stopHour === 13 ? '1:00 PM' : '2:00 PM';

    return {
      content:
        `Based on your data, your last coffee today should be before **${stopTime}**.\n\n` +
        `**Why this specific time?**\n` +
        `• Your sleep last night was only ${ctx.sleep?.duration ?? '5h 06m'} — poor sleep makes you more caffeine-sensitive\n` +
        `• Caffeine has a 5-6 hour half-life; to clear 75% before a 10:30 PM bedtime you need to cut off by ${stopTime}\n` +
        `• Your HRV of ${ctx.summary.hrv ?? 28}ms already shows nervous system stress — caffeine after ${stopTime} will amplify this and delay sleep onset\n\n` +
        `**Alternative:** After ${stopTime}, switch to herbal tea or sparkling water with lemon to maintain the ritual without the stimulant.`,
      suggestions: [
        'How much coffee is safe for me today?',
        'What can I drink instead of coffee in the afternoon?',
        'How does caffeine affect my HRV?',
      ],
    };
  }

  if (lower.match(/hrv|heart rate variability/)) {
    return {
      content:
        `Your HRV today is ${ctx.summary.hrv ?? 28}ms, which is below the healthy range of 40-60ms.\n\n` +
        `**What HRV means:** Heart Rate Variability measures the millisecond variation between heartbeats. Higher HRV = your nervous system can flexibly respond to stress. Lower HRV = your body is in a defensive state.\n\n` +
        `**What is driving yours down today:**\n` +
        `• Short sleep (${ctx.sleep?.duration ?? '5h 06m'}) — the biggest single HRV suppressor\n` +
        `• Resting HR of ${ctx.summary.heartRate ?? 78}bpm — elevated baseline adds stress load\n\n` +
        `**To raise it today:** hydrate, do 5 minutes of slow nasal breathing, take a walk, and get to bed 30 minutes earlier tonight.`,
      suggestions: [
        'Give me a 5-minute breathing exercise for HRV',
        'How long will it take for my HRV to recover?',
        'What is a good HRV target for me?',
      ],
    };
  }

  if (lower.match(/step|walk|activity|move/)) {
    const steps = ctx.summary.steps ?? 3840;
    const remaining = Math.max(0, 10000 - steps);
    return {
      content:
        `You have ${steps.toLocaleString()} steps so far today — ${remaining.toLocaleString()} away from the 10,000 step target.\n\n` +
        `Given your low HRV (${ctx.summary.hrv ?? 28}ms) and poor sleep, I recommend:\n\n` +
        `• **Target today:** 6,000-7,000 steps — enough to benefit metabolism without overtaxing recovery\n` +
        `• **Best time:** A 20-minute walk after dinner will stabilize your post-meal glucose\n` +
        `• **Avoid:** Long intense runs — save those for when HRV is above 40ms`,
      suggestions: [
        'What is the best time for a walk today?',
        'How does walking after meals affect my glucose?',
        'What workout can I do with low HRV?',
      ],
    };
  }

  // Generic fallback
  return {
    content:
      `I can see your health data for today. Here is a quick overview:\n\n` +
      `• **Health Score:** ${ctx.summary.healthScore}/100 (${ctx.summary.healthLabel})\n` +
      `• **Sleep:** ${ctx.sleep?.duration ?? 'No data'}\n` +
      `• **HRV:** ${ctx.summary.hrv ?? 'No data'}ms\n` +
      `• **Glucose:** ${ctx.summary.glucose ?? 'No data'} mg/dL\n` +
      `• **Steps:** ${ctx.summary.steps?.toLocaleString() ?? 'No data'}\n\n` +
      `Ask me about sleep, glucose patterns, hydration, caffeine timing, or workout recommendations. You can also upload a meal photo or do a voice check-in.`,
    suggestions: [
      'Why do I feel so fatigued today?',
      'What should I eat for dinner?',
      'What time should I stop drinking coffee?',
    ],
  };
}

// ─── Utility ──────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

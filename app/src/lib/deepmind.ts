/* ──────────────────────────────────────────────────
   VitalCoach — Google DeepMind (Gemini) Abstraction
   Multimodal reasoning: meal images, voice check-ins,
   correlation generation. Falls back to mock provider.
   Sponsor: Google DeepMind
   ────────────────────────────────────────────────── */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { HealthContext, MealAnalysisResult, MoodCheckin, InsightResult } from './types.js';
import { DEMO_MEAL_ANALYSIS, DEMO_MOOD_CHECKIN, DEMO_INSIGHT } from './demo-data.js';
import { sanitizeOutput } from './safety.js';

// ─── Config ───────────────────────────────────────

const GEMINI_API_KEY = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';
const USE_MOCK = !GEMINI_API_KEY;

// ─── Helpers ──────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip markdown code fences from Gemini JSON responses */
function extractJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function getModel(modelName = 'gemini-1.5-flash') {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: modelName });
}

// ─── Meal Image Analysis ──────────────────────────

export async function analyzeMealImage(
  imageDataUrl: string,
  healthContext: HealthContext
): Promise<MealAnalysisResult> {
  if (USE_MOCK) {
    await delay(1500);
    return structuredClone(DEMO_MEAL_ANALYSIS);
  }

  try {
    const model = getModel();
    const base64 = imageDataUrl.split(',')[1] ?? imageDataUrl;
    const mimeType = imageDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const prompt = `You are a nutrition analyst for a health app. Analyze this meal photo in the context of the user's current health data:
- Current glucose: ${healthContext.summary.glucose ?? 'unknown'} mg/dL
- HRV: ${healthContext.summary.hrv ?? 'unknown'} ms
- Health score: ${healthContext.summary.healthScore}/100

Return ONLY valid JSON with this exact structure — no extra text:
{
  "foods": [{ "name": "food name", "portion": "estimated portion", "confidence": 0.9 }],
  "macros": { "calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0, "fiberG": 0 },
  "glycemicImpact": "low|moderate|high",
  "glycemicLoadEstimate": 0,
  "contextualNote": "one sentence personalized to the user's current health data",
  "disclaimer": "Nutritional estimates are approximate. Not medical advice."
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ]);

    const parsed = JSON.parse(extractJson(result.response.text()));
    return parsed as MealAnalysisResult;
  } catch {
    return structuredClone(DEMO_MEAL_ANALYSIS);
  }
}

// ─── Voice Check-in Interpretation ────────────────

export async function interpretVoiceCheckin(
  transcript: string,
  healthContext: HealthContext
): Promise<MoodCheckin> {
  if (USE_MOCK) {
    await delay(1200);
    return {
      ...structuredClone(DEMO_MOOD_CHECKIN),
      transcript,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const model = getModel();

    const prompt = `You are a wellness assistant analyzing a voice check-in from a health app user.

User's current health data:
- HRV: ${healthContext.summary.hrv ?? 'unknown'} ms
- Sleep: ${healthContext.summary.healthLabel}
- Health score: ${healthContext.summary.healthScore}/100

Voice transcript: "${transcript}"

Return ONLY valid JSON with this exact structure — no extra text:
{
  "transcript": "${transcript.replace(/"/g, "'")}",
  "detectedMood": "one word mood (e.g. tired, energetic, stressed, calm, anxious, good)",
  "detectedSymptoms": ["symptom1", "symptom2"],
  "energyLevel": "low|moderate|high",
  "stressLevel": "low|moderate|high",
  "timestamp": "${new Date().toISOString()}"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(extractJson(result.response.text()));
    return { ...parsed, transcript, timestamp: new Date().toISOString() } as MoodCheckin;
  } catch {
    return {
      ...structuredClone(DEMO_MOOD_CHECKIN),
      transcript,
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── Correlation & Insight Generation ─────────────

export async function generateInsight(
  healthContext: HealthContext,
  userQuestion?: string
): Promise<InsightResult> {
  if (USE_MOCK) {
    await delay(2000);
    const insight = structuredClone(DEMO_INSIGHT);
    if (userQuestion) {
      insight.observations[0] = `In response to "${userQuestion}": ${insight.observations[0]}`;
    }
    return insight;
  }

  try {
    const model = getModel();

    const prompt = `You are VitalCoach, a wellness assistant. Analyze this health data and generate actionable wellness insights. Do NOT diagnose disease. Use cautious, evidence-based language.

Health data:
- Health score: ${healthContext.summary.healthScore}/100 (${healthContext.summary.healthLabel})
- Sleep: ${healthContext.sleep?.duration ?? 'No data'}
- HRV: ${healthContext.summary.hrv ?? 'No data'} ms
- Glucose: ${healthContext.summary.glucose ?? 'No data'} mg/dL
- Heart rate: ${healthContext.summary.heartRate ?? 'No data'} bpm
- Steps: ${healthContext.summary.steps ?? 'No data'}
${userQuestion ? `User question: "${userQuestion}"` : ''}

Return ONLY valid JSON with this exact structure — no extra text:
{
  "observations": ["observation 1", "observation 2", "observation 3"],
  "contributingFactors": [
    { "name": "Factor Name", "detail": "explanation", "impact": "high|medium|low", "icon": "emoji" }
  ],
  "correlations": [
    { "description": "correlation description", "strength": 0.8, "dataPoints": ["data point 1", "data point 2"] }
  ],
  "actionPlan": {
    "rightNow": [{ "icon": "💧", "title": "Action title", "description": "Short description" }],
    "nextMeal": [{ "icon": "🥗", "title": "Action title", "description": "Short description" }],
    "tonight": [{ "icon": "😴", "title": "Action title", "description": "Short description" }]
  },
  "disclaimer": "These are wellness suggestions, not medical advice. Consult a healthcare professional for medical concerns."
}`;

    const result = await model.generateContent(prompt);
    return JSON.parse(extractJson(result.response.text())) as InsightResult;
  } catch {
    await delay(2000);
    const insight = structuredClone(DEMO_INSIGHT);
    if (userQuestion) {
      insight.observations[0] = `In response to "${userQuestion}": ${insight.observations[0]}`;
    }
    return insight;
  }
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

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are VitalCoach, a personal wellness assistant with access to the user\'s real-time health data. ' +
        'Give personalized, specific, evidence-based wellness advice using their actual numbers. ' +
        'Be conversational and empathetic. Keep responses under 200 words. ' +
        'Do NOT diagnose disease. Do NOT prescribe medication. ' +
        'Always end with exactly 3 specific follow-up questions as a JSON array on the last line: ["q1","q2","q3"]',
    });

    const healthSummary = `
User's current health data:
• Health Score: ${healthContext.summary.healthScore}/100 (${healthContext.summary.healthLabel})
• Sleep last night: ${healthContext.sleep?.duration ?? 'No data'} (target: 7.5h)
• HRV: ${healthContext.summary.hrv ?? 'No data'} ms (healthy range: 40-60ms)
• Fasting Glucose: ${healthContext.summary.glucose ?? 'No data'} mg/dL
• Resting Heart Rate: ${healthContext.summary.heartRate ?? 'No data'} bpm
• Steps today: ${healthContext.summary.steps?.toLocaleString() ?? 'No data'}
• Dopamine debt: ${healthContext.summary.dopamineDebt ?? 'No data'}%`.trim();

    const result = await model.generateContent(`${healthSummary}\n\nUser: ${userMessage}`);
    const raw = result.response.text();

    // Split off the suggestions JSON line if present
    const lines = raw.trim().split('\n');
    let suggestions: string[] = ['What should I eat for dinner?', 'How can I improve my HRV?', 'When should I stop drinking coffee?'];

    const lastLine = lines[lines.length - 1].trim();
    if (lastLine.startsWith('[')) {
      try {
        suggestions = JSON.parse(lastLine);
        lines.pop();
      } catch { /* keep defaults */ }
    }

    const content = sanitizeOutput(lines.join('\n').trim());
    return { content, suggestions };
  } catch {
    await delay(1000);
    const result = generateMockChatResponse(userMessage, healthContext);
    return { content: sanitizeOutput(result.content), suggestions: result.suggestions };
  }
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

  if (lower.match(/workout|exerc|excer|train|gym|run|walk|lift/)) {
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
    const weightKg = 70;
    const baselineLiters = (weightKg * 0.033).toFixed(1);
    const adjustedLiters = (weightKg * 0.033 + 0.5).toFixed(1);

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
    const stopHour = sleepHours < 6 ? 13 : 14;
    const stopTime = stopHour === 13 ? '1:00 PM' : '2:00 PM';

    return {
      content:
        `Based on your data, your last coffee today should be before **${stopTime}**.\n\n` +
        `**Why this specific time?**\n` +
        `• Your sleep last night was only ${ctx.sleep?.duration ?? '5h 06m'} — poor sleep makes you more caffeine-sensitive\n` +
        `• Caffeine has a 5-6 hour half-life; to clear 75% before a 10:30 PM bedtime you need to cut off by ${stopTime}\n` +
        `• Your HRV of ${ctx.summary.hrv ?? 28}ms already shows nervous system stress — caffeine after ${stopTime} will amplify this\n\n` +
        `**Alternative:** After ${stopTime}, switch to herbal tea or sparkling water with lemon.`,
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

/* ──────────────────────────────────────────────────
   VitalCoach — Demo Data Fixtures
   Deterministic demo scenario for hackathon judges.
   Persona: poor sleep, moderate stress, lunchtime
   glucose dip, insufficient protein, workout fatigue.
   ────────────────────────────────────────────────── */

import type {
  HealthSummary,
  GlucoseReading,
  VitalSample,
  SleepData,
  MealAnalysisResult,
  MoodCheckin,
  InsightResult,
  MetricCardData,
  ContributingFactor,
  ActionPlan,
  ChartData,
  DashboardData,
  HealthContext,
} from './types.js';

// ─── Demo Health Summary ──────────────────────────

export const DEMO_HEALTH_SUMMARY: HealthSummary = {
  healthScore: 52,
  healthLabel: 'Needs Attention',
  glucose: 74,
  hrv: 28,
  heartRate: 78,
  sleepHours: 5.1,
  steps: 3840,
  dopamineDebt: 62,
  skinScore: 58,
  topPatterns: [
    {
      pattern: 'Sleep under 5.5 hours drops HRV by 35% and raises resting HR by 8+ bpm next day',
      strength: 0.91,
    },
    {
      pattern: 'High-GL meals followed by inactivity correlate with 45-minute glucose crashes',
      strength: 0.84,
    },
    {
      pattern: 'Consecutive days with < 4000 steps reduce sleep quality by 20%',
      strength: 0.78,
    },
    {
      pattern: 'Screen time > 90 min after 10pm delays sleep onset by 40+ minutes',
      strength: 0.72,
    },
  ],
};

// ─── Demo Glucose Readings (24h) ──────────────────

function generateDemoGlucose(): GlucoseReading[] {
  const readings: GlucoseReading[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  const pattern = [
    { hour: 0, mg: 92, trend: 'stable' as const, energy: 'steady' as const },
    { hour: 1, mg: 88, trend: 'falling' as const, energy: 'steady' as const },
    { hour: 2, mg: 84, trend: 'falling' as const, energy: 'steady' as const },
    { hour: 3, mg: 82, trend: 'stable' as const, energy: 'steady' as const },
    { hour: 4, mg: 80, trend: 'stable' as const, energy: 'steady' as const },
    { hour: 5, mg: 79, trend: 'stable' as const, energy: 'steady' as const },
    { hour: 6, mg: 85, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 7, mg: 94, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 8, mg: 118, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 9, mg: 132, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 10, mg: 115, trend: 'falling' as const, energy: 'steady' as const },
    { hour: 11, mg: 98, trend: 'falling' as const, energy: 'steady' as const },
    { hour: 12, mg: 142, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 13, mg: 128, trend: 'falling' as const, energy: 'crashing' as const },
    { hour: 14, mg: 74, trend: 'falling' as const, energy: 'crashing' as const },
    { hour: 15, mg: 68, trend: 'falling' as const, energy: 'reactiveLow' as const },
    { hour: 16, mg: 78, trend: 'rising' as const, energy: 'rising' as const },
    { hour: 17, mg: 88, trend: 'rising' as const, energy: 'steady' as const },
    { hour: 18, mg: 95, trend: 'stable' as const, energy: 'steady' as const },
  ];

  for (const p of pattern) {
    const ts = new Date(baseDate);
    ts.setHours(p.hour);
    readings.push({
      timestamp: ts.toISOString(),
      glucoseMgDL: p.mg,
      trend: p.trend,
      energyState: p.energy,
    });
  }

  return readings;
}

export const DEMO_GLUCOSE: GlucoseReading[] = generateDemoGlucose();

// ─── Demo Vitals ──────────────────────────────────

export const DEMO_VITALS: VitalSample[] = [
  { timestamp: new Date().toISOString(), metricType: 'hrv_sdnn', value: 28, unit: 'ms' },
  { timestamp: new Date().toISOString(), metricType: 'heart_rate', value: 78, unit: 'bpm' },
  { timestamp: new Date().toISOString(), metricType: 'resting_hr', value: 72, unit: 'bpm' },
  { timestamp: new Date().toISOString(), metricType: 'blood_oxygen', value: 97, unit: '%' },
  { timestamp: new Date().toISOString(), metricType: 'step_count', value: 3840, unit: 'steps' },
  { timestamp: new Date().toISOString(), metricType: 'active_energy', value: 180, unit: 'kcal' },
];

// ─── Demo Sleep ───────────────────────────────────

export const DEMO_SLEEP: SleepData = {
  duration: '5h 06m',
  bedtime: '1:24 AM',
  waketime: '6:30 AM',
  stages: [
    { label: 'Awake', percent: 14 },
    { label: 'REM', percent: 18 },
    { label: 'Core', percent: 36 },
    { label: 'Deep', percent: 32 },
  ],
};

// ─── Demo Meal Analysis ───────────────────────────

export const DEMO_MEAL_ANALYSIS: MealAnalysisResult = {
  foods: [
    { name: 'Mixed greens salad', portion: '2 cups', confidence: 0.92 },
    { name: 'Grilled chicken breast', portion: '3 oz (small)', confidence: 0.88 },
    { name: 'Cherry tomatoes', portion: '6-8 pieces', confidence: 0.85 },
    { name: 'Croutons', portion: '¼ cup', confidence: 0.78 },
    { name: 'Caesar dressing', portion: '2 tbsp', confidence: 0.82 },
    { name: 'Parmesan cheese', portion: '1 tbsp', confidence: 0.75 },
  ],
  macros: {
    calories: 340,
    proteinG: 22,
    carbsG: 18,
    fatG: 20,
    fiberG: 4,
  },
  glycemicImpact: 'moderate',
  glycemicLoadEstimate: 12,
  contextualNote:
    'This meal looks nutritious but may be light on protein for someone experiencing workout fatigue. ' +
    'Based on your current glucose trend (falling toward a dip), the moderate carb content from croutons ' +
    'and dressing could cause a brief spike followed by another dip. Consider adding more protein ' +
    '(e.g., extra chicken or beans) and healthy fats to sustain energy.',
  disclaimer:
    'Nutritional estimates are approximate and based on visual analysis. ' +
    'Actual values may vary. This is not a substitute for professional dietary advice.',
};

// ─── Demo Voice Check-in ──────────────────────────

export const DEMO_MOOD_CHECKIN: MoodCheckin = {
  transcript:
    'I feel really tired today and kind of stressed. My workout this morning felt way harder than usual, ' +
    'and I just don\'t have the energy I normally do. I think I didn\'t sleep well last night.',
  detectedMood: 'Fatigued & Stressed',
  detectedSymptoms: ['fatigue', 'low energy', 'exercise intolerance', 'poor sleep quality', 'stress'],
  energyLevel: 'low',
  stressLevel: 'moderate',
  timestamp: new Date().toISOString(),
};

// ─── Demo Insight Result ──────────────────────────

export const DEMO_INSIGHT: InsightResult = {
  observations: [
    'Your sleep was significantly below your target at 5h 06m — about 2.5 hours short of the recommended 7.5 hours.',
    'Your HRV of 28ms is well below the healthy range (40-60ms), suggesting your body has not fully recovered.',
    'Your glucose shows a post-lunch dip to 68 mg/dL, which likely contributed to afternoon fatigue.',
    'With only 3,840 steps so far today, reduced movement may be compounding low energy levels.',
  ],
  contributingFactors: [
    {
      name: 'Sleep debt',
      detail: '5h 06m — about 2.4 hours below your target. Your body didn\'t get adequate recovery time.',
      impact: 'high',
      icon: '😴',
    },
    {
      name: 'Low HRV',
      detail: '28ms is 15+ below your baseline — your nervous system is under-recovered.',
      impact: 'high',
      icon: '📉',
    },
    {
      name: 'Post-lunch glucose dip',
      detail: 'Dropped to 68 mg/dL around 3 PM. Moderate-GL lunch without enough protein may be a factor.',
      impact: 'medium',
      icon: '📊',
    },
    {
      name: 'Low activity',
      detail: '3,840 steps today is about half your usual. Less movement = less natural energy cycling.',
      impact: 'medium',
      icon: '🚶',
    },
    {
      name: 'Elevated resting HR',
      detail: '78 bpm is 6 above your baseline — another sign your body is stressed.',
      impact: 'low',
      icon: '❤️',
    },
  ],
  correlations: [
    {
      description:
        'Poor sleep (5.1h) + low HRV (28ms) + glucose dip (68 mg/dL) are likely working together to create your fatigue and exercise intolerance.',
      strength: 0.91,
      dataPoints: ['sleep: 5h 06m', 'HRV: 28ms', 'glucose nadir: 68 mg/dL', 'steps: 3,840'],
    },
    {
      description:
        'Your post-lunch glucose crash (142 → 68 mg/dL) suggests the meal\'s glycemic load exceeded what your under-recovered body could handle smoothly.',
      strength: 0.84,
      dataPoints: ['pre-meal glucose: 98', 'peak: 142', 'nadir: 68', 'meal GL: ~12'],
    },
  ],
  actionPlan: {
    rightNow: [
      {
        icon: '💧',
        title: 'Hydrate immediately',
        description: 'Drink 2 glasses of water. Dehydration amplifies fatigue and glucose instability.',
      },
      {
        icon: '🚶',
        title: '10 min gentle walk',
        description: 'Light movement helps stabilize glucose and boosts circulation without taxing your tired body.',
      },
      {
        icon: '🧘',
        title: '5 min breathing exercise',
        description: 'Box breathing (4-4-4-4) can help recover HRV and reduce stress signals.',
      },
    ],
    nextMeal: [
      {
        icon: '🥩',
        title: 'Prioritize protein',
        description: 'Aim for 30-40g protein (chicken, fish, eggs) to sustain energy and prevent another glucose crash.',
      },
      {
        icon: '🥑',
        title: 'Add healthy fats',
        description: 'Avocado, nuts, or olive oil slow glucose absorption and extend satiety.',
      },
      {
        icon: '🥦',
        title: 'Fiber-rich vegetables',
        description: 'Spinach, broccoli, or kale — fiber blunts the glucose spike from carbs.',
      },
    ],
    tonight: [
      {
        icon: '📵',
        title: 'Screens off by 9:30 PM',
        description: 'Give your melatonin 90+ minutes to kick in before target bedtime.',
      },
      {
        icon: '🌙',
        title: 'Aim for 9 hours in bed',
        description: 'You\'re carrying sleep debt. Start repaying it with an early bedtime tonight.',
      },
      {
        icon: '🫖',
        title: 'Herbal tea instead of late snack',
        description: 'Chamomile or magnesium can support deeper sleep stages.',
      },
    ],
  },
  disclaimer:
    'These insights are based on your wellness data patterns and are not medical advice. ' +
    'If symptoms persist or are severe, please consult a healthcare professional.',
};

// ─── Demo Metrics (for dashboard cards) ───────────

export const DEMO_METRICS: MetricCardData[] = [
  {
    label: 'Sleep',
    value: '5h 06m',
    unit: '',
    icon: '🌙',
    delta: '↓ 2.4h',
    deltaStatus: 'bad',
    sparkline: [7.2, 7.5, 6.8, 7.1, 6.4, 5.8, 5.1],
    color: 'var(--accent-purple)',
    tint: 'var(--tint-purple)',
  },
  {
    label: 'HRV',
    value: '28',
    unit: 'ms',
    icon: '📈',
    delta: '↓ 16ms',
    deltaStatus: 'bad',
    sparkline: [44, 42, 40, 38, 35, 31, 28],
    color: 'var(--accent-teal)',
    tint: 'var(--tint-teal)',
  },
  {
    label: 'Glucose',
    value: '74',
    unit: 'mg/dL',
    icon: '🩸',
    delta: '↓ Dipping',
    deltaStatus: 'warn',
    sparkline: [95, 118, 132, 115, 98, 142, 74],
    color: 'var(--accent-blue)',
    tint: 'var(--tint-blue)',
  },
  {
    label: 'Heart Rate',
    value: '78',
    unit: 'bpm',
    icon: '❤️',
    delta: '↑ 6 bpm',
    deltaStatus: 'warn',
    sparkline: [68, 70, 71, 72, 74, 76, 78],
    color: 'var(--accent-red)',
    tint: 'var(--tint-red)',
  },
  {
    label: 'Steps',
    value: '3,840',
    unit: '',
    icon: '🚶',
    delta: '↓ 4,160 to goal',
    deltaStatus: 'bad',
    sparkline: [8400, 9200, 7800, 8100, 6500, 5200, 3840],
    color: 'var(--accent-green)',
    tint: 'var(--tint-green)',
  },
  {
    label: 'Stress',
    value: '62',
    unit: '/100',
    icon: '🧠',
    delta: '↑ Elevated',
    deltaStatus: 'warn',
    sparkline: [35, 38, 42, 45, 50, 55, 62],
    color: 'var(--accent-orange)',
    tint: 'var(--tint-orange)',
  },
];

// ─── Demo Charts ──────────────────────────────────

export const DEMO_CHARTS: ChartData[] = [
  {
    type: 'line',
    title: 'Glucose (Today)',
    data: DEMO_GLUCOSE.map((r) => ({
      label: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: r.glucoseMgDL,
    })),
    unit: 'mg/dL',
    color: '#6C8EFF',
  },
  {
    type: 'bar',
    title: 'Steps This Week',
    data: [
      { label: 'Mon', value: 8400 },
      { label: 'Tue', value: 9200 },
      { label: 'Wed', value: 7800 },
      { label: 'Thu', value: 8100 },
      { label: 'Fri', value: 6500 },
      { label: 'Sat', value: 5200 },
      { label: 'Sun', value: 3840 },
    ],
    unit: 'steps',
    color: '#34D399',
  },
];

// ─── Full Demo Dashboard Data ─────────────────────

export const DEMO_DASHBOARD: DashboardData = {
  question: 'Why do I feel so fatigued and stressed today?',
  summary:
    'Your fatigue today is driven by a <b>perfect storm</b> of three factors working against you: ' +
    '<b>significant sleep debt</b> (5h 06m vs. your 7.5h target), a <b>post-lunch glucose crash</b> ' +
    '(142 → 68 mg/dL), and <b>under-recovery</b> shown by your low HRV of 28ms. ' +
    'Your workout felt harder because your nervous system never fully shifted into recovery mode overnight. ' +
    'The good news: every one of these triggers is addressable starting right now.',
  factors: DEMO_INSIGHT.contributingFactors,
  metrics: DEMO_METRICS,
  charts: DEMO_CHARTS,
  sleep: DEMO_SLEEP,
  recommendations: [
    ...DEMO_INSIGHT.actionPlan.rightNow,
    ...DEMO_INSIGHT.actionPlan.nextMeal.slice(0, 1),
    ...DEMO_INSIGHT.actionPlan.tonight.slice(0, 1),
  ],
  disclaimer: DEMO_INSIGHT.disclaimer,
};

// ─── Full Demo Health Context ─────────────────────

export const DEMO_HEALTH_CONTEXT: HealthContext = {
  summary: DEMO_HEALTH_SUMMARY,
  glucose: DEMO_GLUCOSE,
  vitals: DEMO_VITALS,
  meals: [],
  sleep: DEMO_SLEEP,
  mood: DEMO_MOOD_CHECKIN,
  mealAnalysis: DEMO_MEAL_ANALYSIS,
  timestamp: new Date().toISOString(),
};

// ─── Intro Chat Messages ──────────────────────────

export const DEMO_WELCOME_MESSAGE =
  'Welcome to VitalCoach! 👋 I can see your health data, analyze your meals, ' +
  'and listen to how you\'re feeling. Here\'s what I\'m noticing today:\n\n' +
  '• Your sleep was short at **5h 06m** — well below your target\n' +
  '• HRV is low at **28ms**, suggesting under-recovery\n' +
  '• You had a glucose dip to **68 mg/dL** after lunch\n' +
  '• Only **3,840 steps** so far today\n\n' +
  'Would you like me to explain why you might be feeling fatigued? ' +
  'You can also:\n' +
  '📸 **Upload a meal photo** for nutritional analysis\n' +
  '🎤 **Record a voice check-in** to tell me how you\'re feeling\n' +
  '💬 **Ask me anything** about your health patterns';

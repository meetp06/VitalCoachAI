/* ──────────────────────────────────────────────────
   VitalCoach — AI Meal Planner
   Generates personalized daily meal plans using
   health context: glucose patterns, HRV, activity
   level, and dietary preferences.
   ────────────────────────────────────────────────── */

import type { HealthContext } from '../lib/types.js';

export interface Ingredient {
  name: string;
  amount: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  glycemicIndex: number;
}

export interface Meal {
  name: string;
  time: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  glycemicLoad: number;
  ingredients: Ingredient[];
  prepMinutes: number;
  instructions: string[];
  glucoseImpact: 'minimal' | 'moderate' | 'significant';
  whyThisMeal: string;
}

export interface DailyMealPlan {
  date: string;
  targetCalories: number;
  targetMacros: { protein: number; carbs: number; fat: number; fiber: number };
  meals: Meal[];
  totalNutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  glucoseStrategy: string;
  hydrationTarget: number;    // ml
  supplementSuggestions: string[];
  notes: string[];
}

// ─── Meal Database ────────────────────────────────

const MEAL_LIBRARY: Record<string, Omit<Meal, 'time' | 'whyThisMeal'>> = {
  'greek-yogurt-bowl': {
    name: 'Greek Yogurt Protein Bowl',
    calories: 380,
    macros: { protein: 28, carbs: 32, fat: 12, fiber: 6 },
    glycemicLoad: 8,
    prepMinutes: 5,
    glucoseImpact: 'minimal',
    ingredients: [
      { name: 'Full-fat Greek yogurt', amount: '200g', calories: 190, proteinG: 18, carbsG: 8, fatG: 10, glycemicIndex: 11 },
      { name: 'Mixed berries', amount: '80g', calories: 40, proteinG: 0.5, carbsG: 10, fatG: 0.3, glycemicIndex: 25 },
      { name: 'Chia seeds', amount: '15g', calories: 73, proteinG: 2.5, carbsG: 5, fatG: 4.5, glycemicIndex: 1 },
      { name: 'Almonds', amount: '20g', calories: 116, proteinG: 4, carbsG: 4, fatG: 10, glycemicIndex: 0 },
      { name: 'Cinnamon', amount: '1 tsp', calories: 6, proteinG: 0.1, carbsG: 2, fatG: 0, glycemicIndex: 0 },
    ],
    instructions: [
      'Spoon yogurt into a bowl',
      'Add berries on top',
      'Sprinkle chia seeds and almonds',
      'Dust with cinnamon — it helps regulate blood sugar',
    ],
  },

  'egg-avocado-toast': {
    name: 'Scrambled Eggs & Avocado Toast',
    calories: 450,
    macros: { protein: 24, carbs: 30, fat: 26, fiber: 8 },
    glycemicLoad: 12,
    prepMinutes: 10,
    glucoseImpact: 'moderate',
    ingredients: [
      { name: 'Whole eggs', amount: '3 large', calories: 210, proteinG: 18, carbsG: 1.5, fatG: 15, glycemicIndex: 0 },
      { name: 'Sourdough bread', amount: '2 slices', calories: 160, proteinG: 6, carbsG: 30, fatG: 1, glycemicIndex: 54 },
      { name: 'Avocado', amount: '½ medium', calories: 120, proteinG: 1.5, carbsG: 6, fatG: 11, glycemicIndex: 10 },
      { name: 'Spinach', amount: '30g', calories: 7, proteinG: 0.9, carbsG: 1, fatG: 0.1, glycemicIndex: 15 },
    ],
    instructions: [
      'Scramble eggs over medium heat until just set',
      'Toast sourdough (lower GI than standard bread)',
      'Mash avocado with lemon juice and salt',
      'Layer spinach, then avocado, then eggs',
    ],
  },

  'salmon-quinoa-bowl': {
    name: 'Grilled Salmon & Quinoa Bowl',
    calories: 520,
    macros: { protein: 42, carbs: 38, fat: 18, fiber: 7 },
    glycemicLoad: 14,
    prepMinutes: 20,
    glucoseImpact: 'minimal',
    ingredients: [
      { name: 'Salmon fillet', amount: '150g', calories: 280, proteinG: 35, carbsG: 0, fatG: 15, glycemicIndex: 0 },
      { name: 'Quinoa (cooked)', amount: '150g', calories: 180, proteinG: 6.5, carbsG: 32, fatG: 2.5, glycemicIndex: 53 },
      { name: 'Broccoli', amount: '100g', calories: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4, glycemicIndex: 10 },
      { name: 'Olive oil', amount: '1 tbsp', calories: 120, proteinG: 0, carbsG: 0, fatG: 14, glycemicIndex: 0 },
      { name: 'Lemon', amount: '½', calories: 12, proteinG: 0.2, carbsG: 4, fatG: 0.1, glycemicIndex: 20 },
    ],
    instructions: [
      'Season salmon with salt, pepper, lemon zest',
      'Grill or pan-sear 4 min per side',
      'Steam broccoli 5 minutes until bright green',
      'Serve salmon over quinoa with broccoli and olive oil drizzle',
    ],
  },

  'chicken-stir-fry': {
    name: 'High-Protein Chicken Stir-Fry',
    calories: 480,
    macros: { protein: 45, carbs: 35, fat: 14, fiber: 8 },
    glycemicLoad: 11,
    prepMinutes: 15,
    glucoseImpact: 'minimal',
    ingredients: [
      { name: 'Chicken breast', amount: '180g', calories: 270, proteinG: 40, carbsG: 0, fatG: 8, glycemicIndex: 0 },
      { name: 'Mixed vegetables', amount: '200g', calories: 70, proteinG: 4, carbsG: 14, fatG: 0.5, glycemicIndex: 15 },
      { name: 'Brown rice (cooked)', amount: '120g', calories: 155, proteinG: 3, carbsG: 33, fatG: 1, glycemicIndex: 50 },
      { name: 'Soy sauce (low sodium)', amount: '2 tbsp', calories: 18, proteinG: 2, carbsG: 2, fatG: 0, glycemicIndex: 0 },
      { name: 'Garlic & ginger', amount: '1 tsp each', calories: 10, proteinG: 0.3, carbsG: 2, fatG: 0, glycemicIndex: 10 },
    ],
    instructions: [
      'Slice chicken into thin strips',
      'Stir-fry on high heat with garlic and ginger, 5-7 minutes',
      'Add vegetables, stir-fry 3 minutes until tender-crisp',
      'Add soy sauce and toss — serve over brown rice',
    ],
  },

  'lentil-soup': {
    name: 'Red Lentil & Vegetable Soup',
    calories: 320,
    macros: { protein: 18, carbs: 42, fat: 8, fiber: 14 },
    glycemicLoad: 10,
    prepMinutes: 25,
    glucoseImpact: 'minimal',
    ingredients: [
      { name: 'Red lentils', amount: '100g dry', calories: 352, proteinG: 24, carbsG: 60, fatG: 1, glycemicIndex: 21 },
      { name: 'Tomatoes (canned)', amount: '200g', calories: 40, proteinG: 2, carbsG: 8, fatG: 0.5, glycemicIndex: 15 },
      { name: 'Carrots', amount: '80g', calories: 33, proteinG: 0.7, carbsG: 8, fatG: 0.2, glycemicIndex: 39 },
      { name: 'Spinach', amount: '50g', calories: 11, proteinG: 1.4, carbsG: 1.8, fatG: 0.2, glycemicIndex: 15 },
      { name: 'Olive oil', amount: '1 tbsp', calories: 120, proteinG: 0, carbsG: 0, fatG: 14, glycemicIndex: 0 },
    ],
    instructions: [
      'Sauté onion, garlic, and carrots in olive oil',
      'Add lentils, tomatoes, and 600ml water',
      'Simmer 20 minutes until lentils are soft',
      'Stir in spinach until wilted, season and serve',
    ],
  },

  'protein-smoothie': {
    name: 'Recovery Protein Smoothie',
    calories: 340,
    macros: { protein: 30, carbs: 35, fat: 8, fiber: 6 },
    glycemicLoad: 9,
    prepMinutes: 3,
    glucoseImpact: 'moderate',
    ingredients: [
      { name: 'Whey protein', amount: '30g', calories: 120, proteinG: 24, carbsG: 3, fatG: 1.5, glycemicIndex: 0 },
      { name: 'Banana', amount: '1 medium', calories: 89, proteinG: 1, carbsG: 23, fatG: 0.3, glycemicIndex: 51 },
      { name: 'Almond milk (unsweetened)', amount: '250ml', calories: 30, proteinG: 1, carbsG: 1.5, fatG: 2.5, glycemicIndex: 0 },
      { name: 'Spinach', amount: '30g', calories: 7, proteinG: 0.9, carbsG: 1, fatG: 0.1, glycemicIndex: 15 },
      { name: 'Almond butter', amount: '1 tbsp', calories: 98, proteinG: 3.4, carbsG: 3, fatG: 9, glycemicIndex: 0 },
    ],
    instructions: [
      'Add all ingredients to blender',
      'Blend on high for 30 seconds',
      'Consume within 30 minutes post-workout for optimal muscle protein synthesis',
    ],
  },
};

// ─── Plan Generator ───────────────────────────────

export function generateDailyMealPlan(ctx: HealthContext): DailyMealPlan {
  const targetCalories = estimateCalorieTarget(ctx);
  const targetMacros = computeMacroTargets(targetCalories, ctx);
  const glucoseRisk = assessGlucoseRisk(ctx);
  const hydration = estimateHydrationTarget(ctx);

  // Select meals based on glucose profile
  const meals = selectMeals(glucoseRisk, ctx);

  const totalNutrition = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat,
      fiber: acc.fiber + m.macros.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    date: new Date().toISOString().split('T')[0],
    targetCalories,
    targetMacros,
    meals,
    totalNutrition,
    glucoseStrategy: buildGlucoseStrategy(glucoseRisk, ctx),
    hydrationTarget: hydration,
    supplementSuggestions: buildSupplementSuggestions(ctx),
    notes: buildPlanNotes(ctx),
  };
}

// ─── Internal Selectors ───────────────────────────

function selectMeals(glucoseRisk: 'low' | 'moderate' | 'high', ctx: HealthContext): Meal[] {
  const wakeHour = 7;

  if (glucoseRisk === 'high') {
    return [
      { ...MEAL_LIBRARY['greek-yogurt-bowl'], time: formatMealTime(wakeHour + 0.5), whyThisMeal: `Low glycemic load (GL=8) breakfast to prevent the morning glucose spike your data shows tendency toward.` },
      { ...MEAL_LIBRARY['salmon-quinoa-bowl'], time: formatMealTime(wakeHour + 5.5), whyThisMeal: `High omega-3 salmon improves insulin sensitivity. Protein-first approach blunts post-lunch glucose rise.` },
      { ...MEAL_LIBRARY['lentil-soup'], time: formatMealTime(wakeHour + 11), whyThisMeal: `Lentil fiber (14g) creates a slow-digestion glucose response — ideal for your elevated evening glucose readings.` },
      { ...MEAL_LIBRARY['protein-smoothie'], time: formatMealTime(wakeHour + 8), whyThisMeal: `Mid-afternoon protein prevents the 3 PM energy crash and glucose dip your data suggests.` },
    ];
  }

  if (glucoseRisk === 'moderate') {
    return [
      { ...MEAL_LIBRARY['egg-avocado-toast'], time: formatMealTime(wakeHour + 0.5), whyThisMeal: `Healthy fats and protein slow carbohydrate absorption for a steady morning glucose curve.` },
      { ...MEAL_LIBRARY['chicken-stir-fry'], time: formatMealTime(wakeHour + 5.5), whyThisMeal: `45g protein maintains satiety and muscle synthesis. Brown rice provides steady glucose without spiking.` },
      { ...MEAL_LIBRARY['salmon-quinoa-bowl'], time: formatMealTime(wakeHour + 11), whyThisMeal: `Omega-3s support HRV recovery overnight. Quinoa is a complete protein with lower GI than white rice.` },
    ];
  }

  return [
    { ...MEAL_LIBRARY['greek-yogurt-bowl'], time: formatMealTime(wakeHour + 0.5), whyThisMeal: `High-protein start to keep you satiated and maintain your strong morning glucose readings.` },
    { ...MEAL_LIBRARY['chicken-stir-fry'], time: formatMealTime(wakeHour + 5.5), whyThisMeal: `Lean protein and vegetables — matched to your active metabolism today.` },
    { ...MEAL_LIBRARY['salmon-quinoa-bowl'], time: formatMealTime(wakeHour + 11), whyThisMeal: `Salmon omega-3s and magnesium in quinoa support sleep quality and HRV recovery.` },
  ];
}

function estimateCalorieTarget(ctx: HealthContext): number {
  const base = 2000;
  const steps = ctx.summary.steps ?? 5000;
  const stepBonus = Math.round((steps - 5000) * 0.04);
  const hrv = ctx.summary.hrv ?? 40;
  const recoveryAdjust = hrv < 30 ? -200 : hrv > 50 ? 100 : 0;
  return Math.round(base + stepBonus + recoveryAdjust);
}

function computeMacroTargets(calories: number, _ctx: HealthContext) {
  return {
    protein: Math.round(calories * 0.30 / 4),
    carbs: Math.round(calories * 0.40 / 4),
    fat: Math.round(calories * 0.30 / 9),
    fiber: 30,
  };
}

function assessGlucoseRisk(ctx: HealthContext): 'low' | 'moderate' | 'high' {
  const glucose = ctx.summary.glucose ?? 85;
  if (glucose > 140 || glucose < 70) return 'high';
  if (glucose > 110 || glucose < 80) return 'moderate';
  return 'low';
}

function estimateHydrationTarget(ctx: HealthContext): number {
  const base = 2300;
  const steps = ctx.summary.steps ?? 5000;
  return Math.round(base + steps * 0.05 + ((ctx.summary.hrv ?? 40) < 35 ? 400 : 0));
}

function buildGlucoseStrategy(risk: 'low' | 'moderate' | 'high', ctx: HealthContext): string {
  const glucose = ctx.summary.glucose ?? 85;
  if (risk === 'high') {
    return `Your glucose is ${glucose} mg/dL — ${glucose > 110 ? 'elevated' : 'low'}. All meals are optimized with protein-first sequencing (eat protein and fat before carbs), low glycemic index ingredients, and high fiber to flatten the glucose response curve.`;
  }
  if (risk === 'moderate') {
    return `Your glucose of ${glucose} mg/dL shows mild variability. Meals are structured around whole foods with moderate carbs and high protein to maintain stable energy throughout the day.`;
  }
  return `Your fasting glucose of ${glucose} mg/dL is in the optimal range. Today's plan maintains your excellent glucose stability with balanced macros.`;
}

function buildSupplementSuggestions(ctx: HealthContext): string[] {
  const suggestions: string[] = [];
  const hrv = ctx.summary.hrv ?? 40;
  const sleep = ctx.sleep ? parseFloat(ctx.sleep.duration) : 7;

  if (hrv < 35) suggestions.push('Magnesium glycinate 400mg before bed — clinically shown to raise HRV and improve sleep quality');
  if (sleep < 6.5) suggestions.push('L-Theanine 200mg with morning coffee — reduces cortisol spike and caffeine jitteriness');
  if ((ctx.summary.steps ?? 5000) > 8000) suggestions.push('Electrolytes post-exercise (sodium 500mg, potassium 200mg, magnesium 100mg)');
  suggestions.push('Vitamin D3 2000 IU with breakfast — deficiency is linked to poor HRV and impaired glucose metabolism');
  suggestions.push('Omega-3 (EPA+DHA 2g daily) — reduces systemic inflammation and supports HRV');

  return suggestions;
}

function buildPlanNotes(ctx: HealthContext): string[] {
  const notes: string[] = [];
  const hrv = ctx.summary.hrv ?? 40;
  if (hrv < 35) notes.push('Your low HRV suggests higher protein needs today for tissue repair.');
  notes.push('Space meals 4–5 hours apart to allow full insulin clearance between meals.');
  notes.push('A 10-minute walk after each meal reduces post-meal glucose by 15–25%.');
  return notes;
}

function formatMealTime(hourDecimal: number): string {
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

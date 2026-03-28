/* ──────────────────────────────────────────────────
   VitalCoach — Type Definitions
   ────────────────────────────────────────────────── */

// ─── Health Data ──────────────────────────────────

export interface HealthSummary {
  healthScore: number;
  healthLabel: string;
  glucose: number | null;
  hrv: number | null;
  heartRate: number | null;
  sleepHours: number | null;
  steps: number | null;
  dopamineDebt: number | null;
  skinScore: number | null;
  topPatterns: CausalPattern[];
}

export interface CausalPattern {
  pattern: string;
  strength: number;
  observationCount?: number;
  updatedAt?: string;
}

export interface GlucoseReading {
  timestamp: string;
  glucoseMgDL: number;
  trend: 'rising' | 'stable' | 'falling';
  energyState: 'steady' | 'rising' | 'crashing' | 'reactiveLow';
}

export interface VitalSample {
  timestamp: string;
  metricType: string;
  value: number;
  unit: string;
}

export interface MealEvent {
  timestamp: string;
  source: string;
  eventType: string;
  ingredients: string;
  cookingMethod?: string;
  estimatedGlycemicLoad?: number;
}

export interface SleepData {
  duration: string;
  bedtime: string;
  waketime: string;
  stages: SleepStage[];
}

export interface SleepStage {
  label: string;
  percent: number;
}

// ─── Normalized Health Context (Nexla output) ─────

export interface HealthContext {
  summary: HealthSummary;
  glucose: GlucoseReading[];
  vitals: VitalSample[];
  meals: MealEvent[];
  sleep: SleepData | null;
  mood: MoodCheckin | null;
  mealAnalysis: MealAnalysisResult | null;
  timestamp: string;
}

// ─── Meal Analysis ────────────────────────────────

export interface DetectedFood {
  name: string;
  portion: string;
  confidence: number;
}

export interface MacroEstimate {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface MealAnalysisResult {
  foods: DetectedFood[];
  macros: MacroEstimate;
  glycemicImpact: 'low' | 'moderate' | 'high';
  glycemicLoadEstimate: number;
  contextualNote: string;
  disclaimer: string;
}

// ─── Voice / Mood Check-in ────────────────────────

export interface MoodCheckin {
  transcript: string;
  detectedMood: string;
  detectedSymptoms: string[];
  energyLevel: 'low' | 'moderate' | 'high';
  stressLevel: 'low' | 'moderate' | 'high';
  timestamp: string;
}

// ─── Insight Engine ───────────────────────────────

export interface InsightResult {
  observations: string[];
  contributingFactors: ContributingFactor[];
  correlations: Correlation[];
  actionPlan: ActionPlan;
  disclaimer: string;
}

export interface ContributingFactor {
  name: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
  icon: string;
}

export interface Correlation {
  description: string;
  strength: number;
  dataPoints: string[];
}

export interface ActionPlan {
  rightNow: ActionItem[];
  nextMeal: ActionItem[];
  tonight: ActionItem[];
}

export interface ActionItem {
  icon: string;
  title: string;
  description: string;
}

// ─── Chat ─────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

export type MessageContentType = 'text' | 'meal-analysis' | 'voice-checkin' | 'action-plan' | 'correlation' | 'health-summary';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  contentType: MessageContentType;
  data?: MealAnalysisResult | MoodCheckin | InsightResult | ActionPlan | null;
  timestamp: string;
  imageUrl?: string;
  suggestions?: string[];
}

// ─── Metric Card (UI) ─────────────────────────────

export interface MetricCardData {
  label: string;
  value: string;
  unit: string;
  icon: string;
  delta: string;
  deltaStatus: 'good' | 'warn' | 'bad';
  sparkline: number[];
  color: string;
  tint: string;
}

// ─── Dashboard Render Data ────────────────────────

export interface DashboardData {
  question: string;
  summary: string;
  factors: ContributingFactor[];
  metrics: MetricCardData[];
  charts: ChartData[];
  sleep: SleepData | null;
  recommendations: ActionItem[];
  disclaimer: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'sparkline' | 'gauge' | 'ring';
  title: string;
  data: { label: string; value: number }[];
  unit?: string;
  color?: string;
}

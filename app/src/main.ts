/* ──────────────────────────────────────────────────
   VitalCoach — Main Entry Point
   Initializes the app shell, loads health data,
   runs Nexla pipeline, renders dashboard + chat.
   ────────────────────────────────────────────────── */

import './style.css';

import { renderDashboard } from './components/dashboard.js';
import { initChat, updateChatContext } from './components/chat.js';
import { getHealthSummary, getGlucoseReadings, getVitals } from './services/health-data.js';
import { runNexlaPipeline } from './lib/nexla.js';
import { DEMO_DASHBOARD, DEMO_HEALTH_CONTEXT, DEMO_SLEEP } from './lib/demo-data.js';
import type { HealthContext } from './lib/types.js';

// ─── App Shell ────────────────────────────────────

function renderAppShell(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <header class="header">
      <div class="header-brand">
        <div class="header-logo">V</div>
        <div>
          <div class="header-title">VitalCoach</div>
          <div class="header-tagline">Your multimodal health copilot</div>
        </div>
      </div>
      <div class="header-right">
        <div class="header-badge">
          <span class="dot"></span>
          Demo Mode
        </div>
        <div class="header-avatar" title="Demo User">DU</div>
      </div>
    </header>

    <div class="main-layout">
      <div class="dashboard-panel" id="dashboard-panel">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading your health data…</div>
        </div>
      </div>
      <div class="chat-panel" id="chat-panel"></div>
    </div>

    <div class="sponsor-bar">
      <div class="sponsor-item">Google DeepMind</div>
      <div class="sponsor-item">Nexla</div>
      <div class="sponsor-item">Assistant UI</div>
      <div class="sponsor-item">DigitalOcean</div>
    </div>
  `;
}

// ─── Data Loading ─────────────────────────────────

async function loadHealthData(): Promise<HealthContext> {
  try {
    const [summary, glucose, vitals] = await Promise.all([
      getHealthSummary(),
      getGlucoseReadings(),
      getVitals(),
    ]);

    // Run Nexla normalization pipeline
    const result = runNexlaPipeline({
      healthSummary: summary,
      glucose,
      vitals,
      sleep: DEMO_SLEEP, // Use demo sleep (no live sleep API)
      mood: null,
      mealAnalysis: null,
    });

    console.log(
      `[Nexla Pipeline] Completed in ${result.totalDuration.toFixed(1)}ms`,
      result.stages.map((s) => `${s.name}: ${s.duration?.toFixed(1)}ms`)
    );

    return result.context;
  } catch (err) {
    console.warn('[VitalCoach] Failed to load live data, using demo fixtures:', err);
    return structuredClone(DEMO_HEALTH_CONTEXT);
  }
}

// ─── Boot ─────────────────────────────────────────

async function boot(): Promise<void> {
  renderAppShell();

  const dashboardPanel = document.getElementById('dashboard-panel');
  const chatPanel = document.getElementById('chat-panel');

  if (!dashboardPanel || !chatPanel) return;

  // Load data and render
  const healthContext = await loadHealthData();

  // Build dashboard data from context (use demo dashboard as base, enrich with live data)
  const dashboardData = {
    ...DEMO_DASHBOARD,
    // Override with any live data that came through
  };

  // Render dashboard
  renderDashboard(dashboardPanel, dashboardData);

  // Initialize chat
  initChat(chatPanel, healthContext);

  // Track mouse for ambient glow effect
  document.addEventListener('mousemove', (e) => {
    const app = document.getElementById('app');
    if (app) {
      app.style.setProperty('--mouse-x', `${e.clientX}px`);
      app.style.setProperty('--mouse-y', `${e.clientY}px`);
    }
  });
}

// ─── Start ────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* ──────────────────────────────────────────────────
   VitalCoach — Dashboard Component
   Health summary cards, charts, factors, sleep,
   and recommendations in a glassmorphic grid.
   ────────────────────────────────────────────────── */

import type { DashboardData, ChartData } from '../lib/types.js';
import { escapeHtml } from '../lib/safety.js';
import { sparklineSVG, barChartSVG, lineChartSVG, gaugeSVG } from './health-charts.js';

// ─── Sleep Stage Colors ───────────────────────────

const SLEEP_COLORS = ['rgba(167,139,250,0.4)', '#A78BFA', '#8B5CF6', '#6C8EFF', '#2DD4BF', '#FB923C'];

const IMPACT_BG: Record<string, string> = {
  high: 'var(--tint-red)',
  medium: 'var(--tint-orange)',
  low: 'var(--tint-green)',
};

// ─── Render Dashboard ─────────────────────────────

export function renderDashboard(container: HTMLElement, data: DashboardData): void {
  const greeting = getGreeting();
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  container.innerHTML = `
    <div class="dashboard-greeting fade-up">
      <span style="font-size:13px;color:var(--text-muted);font-weight:500">${greeting}</span>
      <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.6px;margin:2px 0">${escapeHtml('Health Dashboard')}</h1>
      <span style="font-size:13px;color:var(--text-muted)">${dateStr}</span>
    </div>

    ${renderInsightBanner(data)}

    <div class="dashboard-grid">
      <div class="full-width fade-up">
        <div class="section-header">Key Metrics</div>
        ${renderMetricGrid(data)}
      </div>

      <div class="fade-up">
        ${data.factors.length > 0 ? renderFactors(data) : ''}
      </div>

      <div class="fade-up">
        ${data.sleep ? renderSleepCard(data) : ''}
        ${data.charts.map(renderChart).join('')}
      </div>

      ${data.recommendations.length > 0 ? `
        <div class="full-width fade-up">
          <div class="section-header">Recommendations</div>
          ${renderRecommendations(data)}
        </div>
      ` : ''}

      <div class="full-width fade-up">
        <div class="disclaimer">${escapeHtml(data.disclaimer)}</div>
      </div>
    </div>
  `;
}

// ─── Sub-renderers ────────────────────────────────

function renderInsightBanner(data: DashboardData): string {
  return `
    <div class="insight-banner fade-up">
      <div class="insight-pill">✦ VitalCoach AI</div>
      <div class="insight-title">${escapeHtml(data.question)}</div>
      <div class="insight-text">${data.summary}</div>
    </div>
  `;
}

function renderMetricGrid(data: DashboardData): string {
  if (data.metrics.length === 0) return '';

  return `<div class="metric-grid">
    ${data.metrics.map((m, i) => {
      const color = m.color || `var(--accent-blue)`;
      const tint = m.tint || `var(--tint-blue)`;
      return `
        <div class="metric-card" style="animation-delay:${i * 0.05}s">
          <div class="accent-bar" style="background:${color}"></div>
          <div class="mc-icon" style="background:${tint}">${m.icon}</div>
          <div class="mc-label">${escapeHtml(m.label)}</div>
          <div>
            <span class="mc-value" style="color:${color}">${escapeHtml(m.value)}</span>
            ${m.unit ? `<span class="mc-unit">${escapeHtml(m.unit)}</span>` : ''}
          </div>
          ${m.sparkline.length > 0 ? `
            <div class="spark-container">
              ${sparklineSVG(m.sparkline, color)}
              <div class="spark-labels">
                <span>7d ago</span>
                <span>today</span>
              </div>
            </div>
          ` : ''}
          ${m.delta ? `<span class="mc-delta ${m.deltaStatus}">${escapeHtml(m.delta)}</span>` : ''}
        </div>
      `;
    }).join('')}
  </div>`;
}

function renderFactors(data: DashboardData): string {
  return `
    <div class="section-header">Contributing Factors</div>
    <div class="glass-card">
      <div class="factor-list">
        ${data.factors.map((f, i) => {
          const bg = IMPACT_BG[f.impact] ?? 'var(--tint-orange)';
          return `
            ${i > 0 ? '<div class="factor-divider"></div>' : ''}
            <div class="factor-item">
              <div class="factor-icon" style="background:${bg}">${f.icon}</div>
              <div class="factor-body">
                <div class="factor-name">${escapeHtml(f.name)}</div>
                <div class="factor-detail">${escapeHtml(f.detail)}</div>
              </div>
              <span class="factor-badge ${f.impact}">${f.impact}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderSleepCard(data: DashboardData): string {
  const s = data.sleep!;
  return `
    <div class="section-header">Sleep</div>
    <div class="glass-card">
      <div class="sleep-card">
        <div class="sleep-header">
          <div class="sleep-header-left">
            <div class="sleep-icon">🌙</div>
            <span class="sleep-label">Time Asleep</span>
          </div>
          <span class="sleep-badge">Last Night</span>
        </div>
        <div class="sleep-duration">${escapeHtml(s.duration)}</div>
        <div class="sleep-sub">${escapeHtml(s.bedtime)} → ${escapeHtml(s.waketime)}</div>
        <div class="sleep-bar">
          ${s.stages.map((stage, i) => `
            <div class="sleep-segment" style="flex:${stage.percent / 100};background:${SLEEP_COLORS[i % SLEEP_COLORS.length]}"></div>
          `).join('')}
        </div>
        <div class="sleep-times">
          <span>${escapeHtml(s.bedtime)}</span>
          <span>${escapeHtml(s.waketime)}</span>
        </div>
        <div class="sleep-legend">
          ${s.stages.map((stage, i) => `
            <div class="sleep-legend-item">
              <div class="sleep-legend-dot" style="background:${SLEEP_COLORS[i % SLEEP_COLORS.length]}"></div>
              ${escapeHtml(stage.label)} ${stage.percent}%
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderChart(chart: ChartData): string {
  const c = chart.color || '#6C8EFF';
  let svgContent = '';

  if (chart.type === 'bar') {
    svgContent = barChartSVG(chart.data, c);
  } else if (chart.type === 'line' || chart.type === 'sparkline') {
    svgContent = lineChartSVG(chart.data, c);
  } else if (chart.type === 'gauge' && chart.data.length > 0) {
    const last = chart.data[chart.data.length - 1];
    svgContent = gaugeSVG(last.value, 100, c);
  } else {
    svgContent = lineChartSVG(chart.data, c);
  }

  return `
    <div class="glass-card" style="margin-top:var(--space-md)">
      <div class="chart-card">
        <div class="chart-title">${escapeHtml(chart.title)}${chart.unit ? ` (${escapeHtml(chart.unit)})` : ''}</div>
        ${svgContent}
      </div>
    </div>
  `;
}

function renderRecommendations(data: DashboardData): string {
  return `
    <div class="glass-card">
      <div class="factor-list">
        ${data.recommendations.map((r, i) => `
          ${i > 0 ? '<div class="factor-divider"></div>' : ''}
          <div class="factor-item">
            <div class="factor-icon" style="background:var(--tint-blue)">${r.icon}</div>
            <div class="factor-body">
              <div class="factor-name">${escapeHtml(r.title)}</div>
              <div class="factor-detail">${escapeHtml(r.description)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ──────────────────────────────────────────────────
   VitalCoach — SVG Chart Utilities
   Sparklines, bar charts, line charts, gauges.
   Ported from widget.html's proven chart functions.
   ────────────────────────────────────────────────── */

import { escapeHtml } from '../lib/safety.js';

// ─── Sparkline ────────────────────────────────────

export function sparklineSVG(pts: number[], color: string): string {
  if (!pts || pts.length < 2) return '';
  const W = 100, H = 36, P = 2;
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 1;

  const coords = pts.map((v, i) => {
    const x = P + (i / (pts.length - 1)) * (W - P * 2);
    const y = H - P - ((v - mn) / rng) * (H - P * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = coords.join(' ');
  const fillPoly = `${coords[0].split(',')[0]},${H - P} ${line} ${coords[coords.length - 1].split(',')[0]},${H - P}`;
  const gid = 'sg' + color.replace(/[^a-z0-9]/gi, '').slice(0, 12) + Math.random().toString(36).slice(2, 6);
  const lastCoord = coords[coords.length - 1].split(',');

  return `<svg class="spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".2"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${fillPoly}" fill="url(#${gid})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastCoord[0]}" cy="${lastCoord[1]}" r="2.5" fill="${color}"/>
  </svg>`;
}

// ─── Bar Chart ────────────────────────────────────

export function barChartSVG(
  dataPoints: { label: string; value: number }[],
  color: string
): string {
  const W = 280, H = 110, PL = 4, PR = 36, PT = 8, PB = 22;
  const values = dataPoints.map((d) => d.value);
  const labels = dataPoints.map((d) => d.label);
  const mx = Math.max(...values);
  const topVal = Math.ceil(mx / 1000) * 1000 || 1;
  const midVal = Math.round(topVal / 2);
  const cW = W - PL - PR, cH = H - PT - PB, bw = cW / values.length;

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient></defs>`;

  // Grid lines
  for (const v of [topVal, midVal]) {
    const y = (PT + cH - (v / topVal) * cH).toFixed(1);
    const label = v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);
    svg += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3,3"/>`;
    svg += `<text x="${W - PR + 5}" y="${(parseFloat(y) + 3.5).toFixed(1)}" font-size="8" fill="rgba(255,255,255,0.3)" font-family="Inter,sans-serif" font-weight="600">${label}</text>`;
  }

  // Zero line
  const y0 = (PT + cH).toFixed(1);
  svg += `<line x1="${PL}" y1="${y0}" x2="${W - PR}" y2="${y0}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;

  // Bars
  const lastIdx = values.length - 1;
  values.forEach((v, i) => {
    const bh = Math.max(3, (v / topVal) * cH);
    const x = (PL + i * bw + bw * 0.12).toFixed(1);
    const bww = (bw * 0.76).toFixed(1);
    const y = (PT + cH - bh).toFixed(1);
    const isLast = i === lastIdx;
    const fill = isLast ? 'url(#bg)' : 'rgba(108,142,255,0.2)';
    const tc = isLast ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
    svg += `<rect x="${x}" y="${y}" width="${bww}" height="${bh.toFixed(1)}" rx="4" fill="${fill}"/>`;
    svg += `<text x="${(parseFloat(x) + parseFloat(bww) / 2).toFixed(1)}" y="${H - 3}" font-size="8.5" fill="${tc}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="600">${escapeHtml(labels[i])}</text>`;
  });

  svg += '</svg>';
  return svg;
}

// ─── Line Chart ───────────────────────────────────

export function lineChartSVG(
  dataPoints: { label: string; value: number }[],
  color: string
): string {
  const W = 280, H = 110, P = 14;
  const values = dataPoints.map((d) => d.value);
  const labels = dataPoints.map((d) => d.label);
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  const gid = 'lcg' + Math.random().toString(36).slice(2, 8);

  const coords = values.map((v, i) => {
    const x = P + (i / (values.length - 1)) * (W - P * 2);
    const y = H - P - ((v - mn) / rng) * (H - P * 2 - 14);
    return [x.toFixed(1), y.toFixed(1)];
  });

  const line = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const fillPoly = `${coords[0][0]},${H - P} ${line} ${coords[coords.length - 1][0]},${H - P}`;

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".15"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${fillPoly}" fill="url(#${gid})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  // Data points
  coords.forEach(([x, y]) => {
    svg += `<circle cx="${x}" cy="${y}" r="2.5" fill="${color}"/>`;
  });

  // X labels (if <= 10 items)
  if (labels.length <= 10) {
    labels.forEach((l, i) => {
      svg += `<text x="${coords[i][0]}" y="${H - 1}" font-size="8" fill="rgba(255,255,255,0.3)" text-anchor="middle" font-family="Inter,sans-serif">${escapeHtml(l)}</text>`;
    });
  }

  svg += '</svg>';
  return svg;
}

// ─── Gauge Arc ────────────────────────────────────

export function gaugeSVG(value: number, maxValue: number, color: string): string {
  const pct = Math.min(1, Math.max(0, value / maxValue));
  const r = 40, cx = 50, cy = 50, sw = 8;
  const halfC = Math.PI * r;
  const d = halfC * pct;

  return `<svg viewBox="0 0 100 60" style="width:100%;height:auto">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${sw}" stroke-dasharray="${halfC.toFixed(2)} ${halfC.toFixed(2)}" transform="rotate(180 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${halfC.toFixed(2)} ${halfC.toFixed(2)}" stroke-dashoffset="${(halfC - d).toFixed(2)}" transform="rotate(180 ${cx} ${cy})"/>
  </svg>
  <div style="text-align:center;margin-top:-8px">
    <span style="font-size:28px;font-weight:800;color:${color}">${value}</span>
    <span style="font-size:12px;color:var(--text-muted)">/100</span>
  </div>`;
}

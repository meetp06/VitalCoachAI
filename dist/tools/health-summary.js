import { z } from 'zod';
import { fetchFromWorker } from '../server.js';
export function register(server, ctx) {
    server.tool('get_health_summary', 'Get health score, latest vitals, and active causal patterns. Best starting point for understanding a user\'s current health state.', {
        window_hours: z.number().default(6).describe('Hours of data to consider'),
    }, { readOnlyHint: true }, async ({ window_hours }) => {
        const data = await fetchFromWorker(ctx.workerUrl, '/api/v1/query/health-summary', {
            window_hours: String(window_hours),
        });
        const lines = [
            `## Health Score: ${data.healthScore}/100 (${data.healthLabel})`,
            '',
            '### Current Vitals',
            data.glucose != null ? `- **Glucose**: ${data.glucose} mg/dL` : '- **Glucose**: No data',
            data.hrv != null ? `- **HRV**: ${Math.round(data.hrv)} ms` : '- **HRV**: No data',
            data.heartRate != null ? `- **Heart Rate**: ${data.heartRate} bpm` : '- **Heart Rate**: No data',
            data.sleepHours != null ? `- **Sleep**: ${data.sleepHours.toFixed(1)} hours` : '- **Sleep**: No data',
            data.steps != null ? `- **Steps**: ${data.steps.toLocaleString()}` : '- **Steps**: No data',
            data.dopamineDebt != null ? `- **Dopamine Debt**: ${Math.round(data.dopamineDebt)}/100` : '',
            data.skinScore != null ? `- **Skin Score**: ${data.skinScore}/100` : '',
        ];
        if (data.topPatterns?.length > 0) {
            lines.push('', '### Active Causal Patterns');
            for (const p of data.topPatterns) {
                lines.push(`- ${p.pattern} (strength: ${(p.strength * 100).toFixed(0)}%)`);
            }
        }
        return {
            structuredContent: data,
            content: [{ type: 'text', text: lines.filter(Boolean).join('\n') }],
        };
    });
}

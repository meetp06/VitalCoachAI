import { z } from 'zod';
import { fetchFromWorker } from '../server.js';
export function register(server, ctx) {
    server.registerTool('query_glucose', {
        description: 'Get CGM glucose readings with trend (rising/stable/falling) and energy state. Use for glucose analysis, meal impact, and energy patterns.',
        inputSchema: {
            start_date: z.string().describe('ISO datetime start'),
            end_date: z.string().describe('ISO datetime end'),
            limit: z.number().default(100).describe('Max readings to return'),
        },
        annotations: { readOnlyHint: true },
        _meta: { ui: { visibility: ['model', 'app'] } },
    }, async ({ start_date, end_date, limit }) => {
        const data = await fetchFromWorker(ctx.workerUrl, '/api/v1/query/glucose', {
            start_date, end_date, limit: String(limit),
        });
        const readings = data.readings;
        if (readings.length === 0) {
            return { content: [{ type: 'text', text: 'No glucose readings found for this period.' }] };
        }
        const values = readings.map((r) => r.glucoseMgDL);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const lines = [
            `## Glucose Readings (${readings.length} samples)`,
            `- **Average**: ${avg.toFixed(0)} mg/dL`,
            `- **Range**: ${min}\u2013${max} mg/dL`,
            '',
            '### Recent Readings',
            ...readings.slice(0, 20).map((r) => `- ${r.timestamp}: **${r.glucoseMgDL}** mg/dL (${r.trend}, ${r.energyState})`),
        ];
        return {
            structuredContent: data,
            content: [{ type: 'text', text: lines.join('\n') }],
        };
    });
}

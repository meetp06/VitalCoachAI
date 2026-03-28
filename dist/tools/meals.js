import { z } from 'zod';
import { fetchFromWorker } from '../server.js';
export function register(server, ctx) {
    server.tool('query_meals', 'Get meal events with ingredients, glycemic load, and cooking method. Use for nutrition analysis and glucose-meal correlations.', {
        start_date: z.string().describe('ISO datetime start'),
        end_date: z.string().describe('ISO datetime end'),
    }, { readOnlyHint: true }, async ({ start_date, end_date }) => {
        const data = await fetchFromWorker(ctx.workerUrl, '/api/v1/query/meals', { start_date, end_date });
        const meals = data.meals;
        if (meals.length === 0) {
            return { content: [{ type: 'text', text: 'No meals found for this period.' }] };
        }
        const lines = [`## Meals (${meals.length} events)`, ''];
        for (const m of meals) {
            let ingredients = [];
            try {
                ingredients = JSON.parse(m.ingredients);
            }
            catch { }
            const ingredientList = ingredients.map((i) => i.name).join(', ');
            lines.push(`### ${m.timestamp}`);
            lines.push(`- **Source**: ${m.source} (${m.eventType})`);
            lines.push(`- **Ingredients**: ${ingredientList || 'N/A'}`);
            if (m.cookingMethod)
                lines.push(`- **Cooking**: ${m.cookingMethod}`);
            if (m.estimatedGlycemicLoad != null)
                lines.push(`- **Glycemic Load**: ${m.estimatedGlycemicLoad.toFixed(1)}`);
            lines.push('');
        }
        return {
            structuredContent: data,
            content: [{ type: 'text', text: lines.join('\n') }],
        };
    });
}

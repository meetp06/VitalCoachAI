import { GoogleGenerativeAI } from '@google/generative-ai';
const SYSTEM_INSTRUCTION = 'You are a wellness assistant. Answer questions using the provided health summary JSON. ' +
    'Be simple, helpful, and cautious. Do not diagnose disease. If data is limited, say so.';
export async function askGemini(question, healthData) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY environment variable is not set');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
    });
    const prompt = `Health summary:\n${JSON.stringify(healthData, null, 2)}\n\nQuestion: ${question}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

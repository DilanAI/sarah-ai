import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set in Vercel settings');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, mode, model = 'gemini-2.5-flash', codeLanguage } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    const ai = getAIClient();

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const systemInstruction =
      mode === 'code'
        ? `You are Sarah, an elite senior software architect and coding assistant. Preferred language: ${codeLanguage || 'TypeScript'}. Provide clean, modern, fully functional code.`
        : 'You are Sarah, a warm, highly intelligent, friendly AI voice and conversational assistant.';

    // Format chat contents
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Choose valid gemini model
    const actualModel = model.includes('3.8') || model.includes('3.6') ? 'gemini-2.5-flash' : model;

    const stream = await ai.models.generateContentStream({
      model: actualModel,
      contents,
      config: {
        systemInstruction,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}
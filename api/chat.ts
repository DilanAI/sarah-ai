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

// Active and stable models on Google GenAI API
const ACTIVE_MODELS = [
  'gemini-2.0-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, mode, model, codeLanguage } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    const ai = getAIClient();

    // Set streaming headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const systemInstruction =
      mode === 'code'
        ? `You are Sarah, an elite senior software architect and coding assistant. Preferred language: ${codeLanguage || 'TypeScript'}. Provide clean, modern, fully functional code.`
        : 'You are Sarah, a warm, highly intelligent, friendly AI voice and conversational assistant.';

    // Map messages to Gemini SDK contents format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Prioritize models that are active
    const candidateList = [
      ...ACTIVE_MODELS
    ];

    let stream = null;
    let lastError: any = null;

    for (const targetModel of candidateList) {
      try {
        stream = await ai.models.generateContentStream({
          model: targetModel,
          contents,
          config: {
            systemInstruction,
          },
        });
        // Succeeded connecting to stream
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${targetModel} attempt failed: ${err.message}. Trying next candidate...`);
        continue;
      }
    }

    if (!stream) {
      throw lastError || new Error('All model attempts failed or are temporarily unavailable.');
    }

    // Stream chunks back to client
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
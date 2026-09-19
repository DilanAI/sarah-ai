import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please add your Gemini API Key in your .env file.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Check configuration status
app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    configured: hasKey,
    defaultModel: 'gemini-3.6-flash',
    supportedModels: [
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Official high-quota model, fast & reliable for coding and conversation' },
      { id: 'gemini-3.6-pro', name: 'Gemini 3.6 Pro', description: 'Advanced reasoning and complex architecture' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Next-gen experimental flash model' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Advanced reasoning, deep architectural code analysis' }
    ]
  });
});

// Chat completion stream endpoint via SSE
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, mode = 'general', model = 'gemini-3.6-flash', codeLanguage } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'A list of messages is required.' });
      return;
    }

    const ai = getAIClient();

    // Setup system instructions based on mode
    let systemInstruction = '';
    if (mode === 'code') {
      systemInstruction = `You are an expert full-stack software engineer and code architect.
Your answers should be direct, high-quality, and production-ready.
- When generating code, format it in clean markdown code blocks with the precise language identifier (e.g. \`\`\`typescript, \`\`\`python, \`\`\`jsx).
- Emphasize best practices, modularity, type-safety, and performance.
- When requested in ${codeLanguage || 'general programming'}, tailor all idioms and examples accordingly.
- Keep explanatory commentary crisp, concise, and focused on implementation specifics.`;
    } else {
      systemInstruction = `You are an intelligent, thoughtful, and articulate AI assistant.
- Provide clear, direct, and well-structured responses.
- If answering questions spoken via voice, keep paragraphs readable and concise.
- Use markdown formatting with bullet points and bold key terms to ensure scannability.`;
    }

    // Prepare contents history for Google Gen AI
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const validModels = ['gemini-3.6-flash', 'gemini-3.6-pro', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];
    const targetModel = validModels.includes(model) ? model : 'gemini-3.6-flash';

    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents,
        config: {
          systemInstruction,
          temperature: mode === 'code' ? 0.2 : 0.7,
        },
      });
    } catch (modelErr: any) {
      // If 429 quota reached on an experimental model, attempt fallback to stable gemini-3.6-flash
      if (targetModel !== 'gemini-3.6-flash' && modelErr?.message?.includes('429')) {
        console.warn(`429 on ${targetModel}. Retrying with high-quota gemini-3.6-flash fallback...`);
        res.write(`data: ${JSON.stringify({ text: `*[Notice: ${targetModel} reached rate-limit. Switching to Gemini 3.6 Flash]*\n\n` })}\n\n`);
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.6-flash',
          contents,
          config: {
            systemInstruction,
            temperature: mode === 'code' ? 0.2 : 0.7,
          },
        });
      } else {
        throw modelErr;
      }
    }

    if (!responseStream) throw new Error('Could not establish generation stream.');

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    let friendlyMessage = error.message || 'An error occurred while generating the AI response.';
    if (friendlyMessage.includes('429') || friendlyMessage.includes('quota')) {
      friendlyMessage = 'Rate limit reached on this model. Please wait ~30 seconds, or select "Gemini 3.6 Flash" from the top model dropdown.';
    }

    if (!res.headersSent) {
      res.status(500).json({ error: friendlyMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Voice & Code Studio running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
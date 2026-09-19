import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    status: 'ok',
    mode: 'vercel-serverless',
  });
}
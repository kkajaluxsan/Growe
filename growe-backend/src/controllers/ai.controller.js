import { generateReply } from '../services/ai.service.js';

export const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    const reply = await generateReply(message);
    res.json({ reply });
  } catch (err) {
    const status = err.statusCode || (err.message?.includes('not configured') ? 503 : 500);
    if (status === 503 || err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'AI assistant is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY on the server.',
        code: err.code || 'AI_NOT_CONFIGURED',
      });
    }
    if (status === 502 || err.code === 'AI_UPSTREAM_ERROR') {
      return res.status(502).json({
        error: err.message || 'The AI service could not complete your request. Try again shortly.',
        code: 'AI_UPSTREAM_ERROR',
      });
    }
    next(err);
  }
};

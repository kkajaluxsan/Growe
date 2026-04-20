import { getAiProviderOrder, getConfiguredAiProviders } from '../config/aiEnv.js';
import { generateReply } from '../services/ai.service.js';

/** Whether the server has any AI provider key (no secrets returned). */
export const status = (req, res) => {
  const p = getConfiguredAiProviders();
  const order = getAiProviderOrder();
  res.json({
    configured: p.gemini || p.groq || p.xai || p.openai,
    providers: [
      ...(p.gemini ? ['gemini'] : []),
      ...(p.groq ? ['groq'] : []),
      ...(p.xai ? ['xai'] : []),
      ...(p.openai ? ['openai'] : []),
    ],
    order,
  });
};

export const chat = async (req, res, next) => {
  try {
    const { message } = req.body;
    const reply = await generateReply(message);
    res.json({ reply });
  } catch (err) {
    const status = err.statusCode || (err.message?.includes('not configured') ? 503 : 500);
    if (status === 503 || err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'AI assistant is not configured. Set GROQ_API_KEY (free tier), XAI_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY on the server.',
        code: err.code || 'AI_NOT_CONFIGURED',
      });
    }
    if (err.code === 'AI_QUOTA_EXCEEDED' || status === 429) {
      return res.status(429).json({
        error:
          err.message ||
          'AI quota or rate limit reached. Check Google AI Studio billing or set GROQ_API_KEY (free) or OPENAI_API_KEY on the server.',
        code: 'AI_QUOTA_EXCEEDED',
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

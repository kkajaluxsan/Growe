/**
 * Server-side AI chat using Gemini (preferred) or OpenAI. Keys only in env — never exposed to clients.
 */

const SYSTEM_PROMPT = `You are a helpful academic assistant for students and tutors using GROWE, a study collaboration platform.
Help with study tips, time management, explaining concepts at a high level, and using the app (groups, messages, bookings, meetings).
Keep answers concise (under about 500 words unless the user asks for detail). Do not invent features the app may not have.
If asked for medical, legal, or professional advice beyond general study help, suggest consulting a qualified professional.`;

const MAX_REPLY_CHARS = 8000;

async function chatWithGemini(userMessage) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage.trim() }] }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || data?.error || res.statusText;
    throw new Error(err || 'Gemini request failed');
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return text.trim() || null;
}

async function chatWithOpenAI(userMessage) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage.trim() },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || data?.error || res.statusText;
    throw new Error(err || 'OpenAI request failed');
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return text.trim() || null;
}

/**
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateReply(message) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Message is required');
  }

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGemini && !hasOpenAI) {
    const err = new Error('AI service is not configured');
    err.statusCode = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  let reply = null;
  let lastErr = null;

  if (hasGemini) {
    try {
      reply = await chatWithGemini(message);
    } catch (e) {
      lastErr = e;
    }
  }

  if (!reply && hasOpenAI) {
    try {
      reply = await chatWithOpenAI(message);
    } catch (e) {
      lastErr = e;
    }
  }

  if (!reply) {
    const err = new Error(lastErr?.message || 'Could not generate a reply');
    err.statusCode = 502;
    err.code = 'AI_UPSTREAM_ERROR';
    throw err;
  }

  if (reply.length > MAX_REPLY_CHARS) {
    return `${reply.slice(0, MAX_REPLY_CHARS)}…`;
  }
  return reply;
}

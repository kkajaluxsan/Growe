/**
 * Server-side AI chat: configurable provider order (default Gemini → Groq → xAI → OpenAI).
 * Keys only in env — never exposed to clients.
 */

import { envKey, getAiProviderOrder, getConfiguredAiProviders } from '../config/aiEnv.js';

const SYSTEM_PROMPT = `You are a helpful academic assistant for students and tutors using GROWE, a study collaboration platform.
Help with study tips, time management, explaining concepts at a high level, and using the app (groups, messages, bookings, meetings).
Keep answers concise (under about 500 words unless the user asks for detail). Do not invent features the app may not have.
If asked for medical, legal, or professional advice beyond general study help, suggest consulting a qualified professional.`;

const MAX_REPLY_CHARS = 8000;

function geminiQuotaError(message) {
  const err = new Error(message);
  err.code = 'AI_QUOTA_EXCEEDED';
  err.statusCode = 429;
  return err;
}

async function chatWithGemini(userMessage) {
  const key = envKey('GEMINI_API_KEY');
  if (!key) return null;

  const model = envKey('GEMINI_MODEL') || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userMessage.trim() }] }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  };

  const postOnce = () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  let res = await postOnce();
  let data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg0 = String(data?.error?.message || data?.error || '');
    const quotaZero = /limit:\s*0/i.test(msg0);
    const retryMs = msg0.match(/retry in ([\d.]+)\s*ms/i);
    if (res.status === 429 && !quotaZero && retryMs) {
      const wait = Math.min(10000, Math.max(100, parseFloat(retryMs[1]) + 100));
      await new Promise((r) => setTimeout(r, wait));
      res = await postOnce();
      data = await res.json().catch(() => ({}));
    }
  }

  if (!res.ok) {
    const raw = data?.error?.message || data?.error || res.statusText;
    const msgStr = String(raw || 'Gemini request failed');

    if (
      res.status === 429 ||
      /quota exceeded|RESOURCE_EXHAUSTED|rate limit|generativelanguage\.googleapis\.com/i.test(msgStr)
    ) {
      const short =
        'Gemini quota or rate limit reached. If you see "limit: 0", enable billing or use a paid plan in Google AI Studio / Cloud Console, or set GROQ_API_KEY (free tier at console.groq.com) or OPENAI_API_KEY in the server .env as a fallback. Details: https://ai.google.dev/gemini-api/docs/rate-limits';
      throw geminiQuotaError(short);
    }

    throw new Error(msgStr);
  }

  if (data?.promptFeedback?.blockReason) {
    return null;
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

async function chatWithOpenAI(userMessage) {
  const key = envKey('OPENAI_API_KEY');
  if (!key) return null;

  const model = envKey('OPENAI_MODEL') || 'gpt-4o-mini';
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

async function chatWithGroq(userMessage) {
  const key = envKey('GROQ_API_KEY');
  if (!key) return null;

  const model = envKey('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    throw new Error(err || 'Groq request failed');
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return text.trim() || null;
}

function extractXaiResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (!Array.isArray(data?.output)) return null;

  const chunks = [];
  for (const item of data.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      const t = part?.type;
      if ((t === 'output_text' || t === 'text') && typeof part?.text === 'string') {
        chunks.push(part.text);
      }
    }
  }
  const joined = chunks.join('\n').trim();
  return joined || null;
}

async function chatWithXai(userMessage) {
  const key = envKey('XAI_API_KEY');
  if (!key) return null;

  const model = envKey('XAI_MODEL') || 'grok-4.20-reasoning';
  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage.trim() },
      ],
      max_output_tokens: 2048,
      temperature: 0.7,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || data?.error || res.statusText;
    throw new Error(err || 'xAI request failed');
  }

  return extractXaiResponseText(data);
}

const callers = {
  gemini: chatWithGemini,
  groq: chatWithGroq,
  xai: chatWithXai,
  openai: chatWithOpenAI,
};

/**
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function generateReply(message) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Message is required');
  }

  const configured = getConfiguredAiProviders();
  const order = getAiProviderOrder();

  if (order.length === 0) {
    const err = new Error('AI service is not configured');
    err.statusCode = 503;
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  let reply = null;
  let lastErr = null;

  for (const name of order) {
    const fn = callers[name];
    if (!fn) continue;
    try {
      reply = await fn(message);
      if (reply) break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!reply) {
    if (lastErr?.code === 'AI_QUOTA_EXCEEDED') {
      if (!configured.groq && !configured.xai && !configured.openai) {
        lastErr.message = `${lastErr.message} This server has no GROQ_API_KEY (free at console.groq.com), XAI_API_KEY (console.x.ai), or OPENAI_API_KEY — add one to growe-backend/.env and restart when Gemini is unavailable.`;
      }
      throw lastErr;
    }
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

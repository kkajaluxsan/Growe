import { getAiProviderOrder, getConfiguredAiProviders } from '../config/aiEnv.js';
import { generateReply } from '../services/ai.service.js';
import * as userModel from '../models/user.model.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

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

export const generateFlashcards = async (req, res, next) => {
  try {
    const topic = req.body.topic || '';
    const file = req.file;
    const count = parseInt(req.body.count, 10) || 10;
    
    if (!topic.trim() && !file) {
      return res.status(400).json({ error: 'Topic or document is required' });
    }

    let documentContext = '';
    if (file) {
      if (file.mimetype === 'application/pdf') {
        try {
          const { PDFParse } = require('pdf-parse');
          const parser = new PDFParse({ data: file.buffer });
          await parser.load();
          const result = await parser.getText();
          const rawText = result && result.text ? result.text : '';
          documentContext = rawText.slice(0, 15000);
        } catch (pdfErr) {
          console.error('PDF parse error:', pdfErr.message);
          return res.status(400).json({ error: 'Could not read the PDF. Please try a different file.' });
        }
      } else {
        documentContext = file.buffer.toString('utf8').slice(0, 15000);
      }
    }

    let prompt = `Generate exactly ${count} study flashcards`;
    if (documentContext) {
      prompt += ` based on the following document context: "[Document Start] ${documentContext} [Document End]". `;
      if (topic.trim()) prompt += ` Focus specifically on the topic: "${topic.trim()}". `;
    } else {
      prompt += ` about "${topic.trim()}". `;
    }
    
    prompt += `Respond ONLY with a valid JSON array of objects.
Each object must have:
- "q": The question or concept
- "a": The answer or definition

Example format:
[
  {"q": "What is 2+2?", "a": "4"},
  {"q": "What is the capital of France?", "a": "Paris"}
]

Do not include any introductory text, markdown formatting, or explanations. Just the JSON array.`;
    
    let reply = await generateReply(prompt);
    
    let flashcards = [];
    try {
      // Robust JSON extraction: Find the first occurrence of '[' and the last ']'
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : reply.replace(/```json/gi, '').replace(/```/g, '').trim();
      flashcards = JSON.parse(cleanedJson);
      
      // Safety: Ensure it's an array
      if (!Array.isArray(flashcards)) {
        if (typeof flashcards === 'object' && flashcards !== null) {
          // If the AI returned an object with a key like 'flashcards'
          const possibleArray = flashcards.flashcards || Object.values(flashcards).find(v => Array.isArray(v));
          if (Array.isArray(possibleArray)) {
            flashcards = possibleArray;
          } else {
            throw new Error('AI returned an object but no flashcard array found inside.');
          }
        } else {
          throw new Error('AI did not return an array.');
        }
      }
      
      // Give the user +10 XP for studying
      if (req.user && req.user.id) {
        await userModel.addXp(req.user.id, 10);
      }
    } catch (e) {
      console.error('AI Flashcard Parse Error:', e.message, 'Raw Reply:', reply);
      throw new Error('AI failed to return valid study cards. Try a different topic or document.');
    }
    
    res.json({ flashcards });
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
    if (err.message && err.message.includes('valid JSON')) {
      return res.status(500).json({ error: err.message });
    }
    next(err);
  }
};

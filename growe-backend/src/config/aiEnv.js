/**
 * Trimmed API keys — empty or whitespace-only values count as unset.
 */
export function envKey(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

export function getConfiguredAiProviders() {
  return {
    gemini: !!envKey('GEMINI_API_KEY'),
    groq: !!envKey('GROQ_API_KEY'),
    xai: !!envKey('XAI_API_KEY'),
    openai: !!envKey('OPENAI_API_KEY'),
  };
}

export function hasAnyAiProvider() {
  const p = getConfiguredAiProviders();
  return p.gemini || p.groq || p.xai || p.openai;
}

/**
 * Provider order: optional AI_PROVIDER_ORDER=groq,xai,gemini,openai
 * Or AI_PREFER_GROQ=1 to try Groq before Gemini (useful when Gemini quota is exhausted).
 */
export function getAiProviderOrder() {
  const p = getConfiguredAiProviders();
  const custom = envKey('AI_PROVIDER_ORDER');
  if (custom) {
    const parsed = custom
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((name) => name === 'gemini' || name === 'groq' || name === 'xai' || name === 'openai')
      .filter((name) => p[name]);
    if (parsed.length > 0) return parsed;
  }
  const preferGroq = process.env.AI_PREFER_GROQ === '1' || /^true$/i.test(process.env.AI_PREFER_GROQ || '');
  if (preferGroq) {
    return ['groq', 'xai', 'openai', 'gemini'].filter((name) => p[name]);
  }
  return ['gemini', 'groq', 'xai', 'openai'].filter((name) => p[name]);
}

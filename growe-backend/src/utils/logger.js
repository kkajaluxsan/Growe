const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > currentLevel) return;
  const timestamp = new Date().toISOString();
  const payload = { timestamp, level, message, ...meta };
  const out = level === 'error' ? console.error : console.log;
  out(JSON.stringify(payload));
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};

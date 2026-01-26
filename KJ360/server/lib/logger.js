/**
 * Structured Logger
 *
 * Simple structured logging utility for KJ360.
 * Provides consistent log format with timestamps, levels, and context.
 *
 * For production, consider upgrading to pino:
 *   npm install pino pino-pretty
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const LEVEL_COLORS = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[90m', // gray
  trace: '\x1b[90m'  // gray
};

const RESET = '\x1b[0m';

class Logger {
  constructor(options = {}) {
    this.name = options.name || 'kj360';
    this.level = LOG_LEVELS[options.level || process.env.LOG_LEVEL || 'info'];
    this.colorize = options.colorize !== false && process.stdout.isTTY;
  }

  /**
   * Format log message
   */
  _format(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    // Build context string
    let contextStr = '';
    if (Object.keys(context).length > 0) {
      contextStr = ' ' + JSON.stringify(context);
    }

    if (this.colorize) {
      const color = LEVEL_COLORS[level] || '';
      return `${color}[${timestamp}] ${levelStr}${RESET} [${this.name}] ${message}${contextStr}`;
    }

    return `[${timestamp}] ${levelStr} [${this.name}] ${message}${contextStr}`;
  }

  /**
   * Log at specified level
   */
  _log(level, messageOrContext, context = {}) {
    if (LOG_LEVELS[level] > this.level) return;

    let message;
    let ctx;

    // Handle (context, message) or (message, context) signatures
    if (typeof messageOrContext === 'object' && !context.message) {
      ctx = messageOrContext;
      message = ctx.msg || ctx.message || '';
      delete ctx.msg;
      delete ctx.message;
    } else {
      message = messageOrContext;
      ctx = context;
    }

    const formatted = this._format(level, message, ctx);

    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  error(messageOrContext, context) {
    this._log('error', messageOrContext, context);
  }

  warn(messageOrContext, context) {
    this._log('warn', messageOrContext, context);
  }

  info(messageOrContext, context) {
    this._log('info', messageOrContext, context);
  }

  debug(messageOrContext, context) {
    this._log('debug', messageOrContext, context);
  }

  trace(messageOrContext, context) {
    this._log('trace', messageOrContext, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    const childName = context.name || context.module || this.name;
    const child = new Logger({ ...this, name: `${this.name}:${childName}` });
    child.defaultContext = { ...this.defaultContext, ...context };
    return child;
  }
}

// Create default logger instance
const logger = new Logger({ name: 'kj360' });

// Create specialized loggers for different modules
export const agentLogger = new Logger({ name: 'kj360:agent' });
export const taskLogger = new Logger({ name: 'kj360:tasks' });
export const cacheLogger = new Logger({ name: 'kj360:cache' });
export const skillLogger = new Logger({ name: 'kj360:skill' });

export { logger, Logger };
export default logger;

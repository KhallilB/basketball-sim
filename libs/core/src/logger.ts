/**
 * Professional logging system to replace console.log statements
 * Provides structured logging with levels, formatting, and filtering
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  playerId?: string;
  gameId?: string;
  possession?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  formatJson: boolean;
  categories: string[];
  maxEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      formatJson: false,
      categories: [],
      maxEntries: 1000,
      ...config
    };
  }

  private shouldLog(level: LogLevel, category: string): boolean {
    if (level > this.config.level) return false;
    if (this.config.categories.length > 0 && !this.config.categories.includes(category)) return false;
    return true;
  }

  private formatMessage(entry: LogEntry): string {
    if (this.config.formatJson) {
      return JSON.stringify(entry);
    }

    const timestamp = entry.timestamp.toISOString().substr(11, 12);
    const level = LogLevel[entry.level].padEnd(5);
    const category = entry.category.padEnd(12);
    const context = entry.gameId ? `[${entry.gameId}${entry.possession ? `:${entry.possession}` : ''}]` : '';
    const player = entry.playerId ? `{${entry.playerId}}` : '';

    let message = `${timestamp} ${level} ${category} ${context}${player} ${entry.message}`;

    if (entry.data) {
      message += ` | ${JSON.stringify(entry.data)}`;
    }

    return message;
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    if (!this.shouldLog(level, category)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      ...context
    };

    // Store entry
    this.entries.push(entry);
    if (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatMessage(entry);
      switch (level) {
        case LogLevel.ERROR:
          console.error(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.DEBUG:
        case LogLevel.TRACE:
          console.debug(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  error(
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    this.log(LogLevel.ERROR, category, message, data, context);
  }

  warn(
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    this.log(LogLevel.WARN, category, message, data, context);
  }

  info(
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    this.log(LogLevel.INFO, category, message, data, context);
  }

  debug(
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    this.log(LogLevel.DEBUG, category, message, data, context);
  }

  trace(
    category: string,
    message: string,
    data?: unknown,
    context?: { playerId?: string; gameId?: string; possession?: number }
  ): void {
    this.log(LogLevel.TRACE, category, message, data, context);
  }

  // Convenience methods for common categories
  game(message: string, data?: unknown, context?: { gameId?: string; possession?: number }): void {
    this.info('GAME', message, data, context);
  }

  player(message: string, playerId: string, data?: unknown, context?: { gameId?: string; possession?: number }): void {
    this.info('PLAYER', message, data, { ...context, playerId });
  }

  simulation(message: string, data?: unknown, context?: { gameId?: string; possession?: number }): void {
    this.info('SIMULATION', message, data, context);
  }

  performance(message: string, data?: unknown): void {
    this.debug('PERFORMANCE', message, data);
  }

  validation(message: string, data?: unknown): void {
    this.warn('VALIDATION', message, data);
  }

  // Utility methods
  getEntries(filter?: { level?: LogLevel; category?: string; gameId?: string }): LogEntry[] {
    return this.entries.filter(entry => {
      if (filter?.level !== undefined && entry.level !== filter.level) return false;
      if (filter?.category && entry.category !== filter.category) return false;
      if (filter?.gameId && entry.gameId !== filter.gameId) return false;
      return true;
    });
  }

  clear(): void {
    this.entries = [];
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setCategories(categories: string[]): void {
    this.config.categories = categories;
  }
}

// Create default logger instance
export const logger = new Logger();

// Category-specific loggers for convenience
export const gameLogger = {
  start: (gameId: string, homeTeam: string, awayTeam: string) =>
    logger.game(`Game started: ${homeTeam} vs ${awayTeam}`, { homeTeam, awayTeam }, { gameId }),

  end: (gameId: string, finalScore: { home: number; away: number }, duration: number) =>
    logger.game(`Game ended: ${finalScore.home}-${finalScore.away}`, { finalScore, duration }, { gameId }),

  possession: (gameId: string, possession: number, offense: string, score: { off: number; def: number }) =>
    logger.debug('POSSESSION', `Possession ${possession}: ${offense}`, { score }, { gameId, possession }),

  score: (gameId: string, possession: number, player: string, points: number, newScore: { off: number; def: number }) =>
    logger.player(`${player} scores ${points} points`, player, { points, newScore }, { gameId, possession }),

  substitution: (gameId: string, playerIn: string, playerOut: string, minutes: number) =>
    logger.player(`SUB: ${playerIn} in for ${playerOut}`, playerIn, { minutes }, { gameId })
};

export const performanceLogger = {
  timing: (operation: string, duration: number, details?: unknown) =>
    logger.performance(`${operation} took ${duration}ms`, {
      duration,
      ...(details && typeof details === 'object' && !Array.isArray(details) ? details : {})
    }),

  cache: (operation: string, hit: boolean, size?: number) =>
    logger.performance(`Cache ${hit ? 'HIT' : 'MISS'}: ${operation}`, { hit, size }),

  memory: (operation: string, usage: number) =>
    logger.performance(`Memory usage: ${usage}MB after ${operation}`, { usage })
};

export const validationLogger = {
  error: (field: string, value: unknown, expected: string) =>
    logger.validation(`Invalid ${field}: ${value} (expected: ${expected})`, { field, value, expected }),

  warning: (field: string, value: unknown, corrected: unknown) =>
    logger.validation(`Corrected ${field}: ${value} -> ${corrected}`, { field, original: value, corrected })
};

// Export logger instance and types
export { Logger };
export default logger;

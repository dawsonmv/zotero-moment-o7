/**
 * Structured Logger for Zotero Moment-o7
 * Provides consistent logging with categories, levels, and context
 */

import { LogLevel, LogEntry } from "./types";

declare const Zotero: any;

export interface LoggerConfig {
  minLevel: LogLevel;
  maxEntries: number;
  enableConsole: boolean;
  enablePersistence: boolean;
  category: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  maxEntries: 1000,
  enableConsole: true,
  enablePersistence: true,
  category: "MomentO7",
};

/**
 * Singleton Logger with structured logging support
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private currentTraceId?: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Set trace ID for correlating log entries
   */
  setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  clearTraceId(): void {
    this.currentTraceId = undefined;
  }

  /**
   * Create a child logger with a specific category
   */
  child(category: string): CategoryLogger {
    return new CategoryLogger(this, category);
  }

  /**
   * Log with full control
   */
  log(
    level: LogLevel,
    category: string,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (level > this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category: `${this.config.category}:${category}`,
      message,
      context,
      traceId: this.currentTraceId,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    this.addEntry(entry);

    if (this.config.enableConsole) {
      this.outputToZotero(entry);
    }
  }

  // Convenience methods
  debug(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  info(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  notice(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.NOTICE, category, message, context);
  }

  warning(
    category: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.WARNING, category, message, context);
  }

  error(
    category: string,
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.ERROR, category, message, context, error);
  }

  critical(
    category: string,
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.CRITICAL, category, message, context, error);
  }

  /**
   * Add entry and maintain max size
   */
  private addEntry(entry: LogEntry): void {
    this.entries.push(entry);

    // Trim if over limit
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }
  }

  /**
   * Output to Zotero debug console
   */
  private outputToZotero(entry: LogEntry): void {
    const levelNames: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: "DEBUG",
      [LogLevel.INFO]: "INFO",
      [LogLevel.NOTICE]: "NOTICE",
      [LogLevel.WARNING]: "WARN",
      [LogLevel.ERROR]: "ERROR",
      [LogLevel.CRITICAL]: "CRIT",
      [LogLevel.ALERT]: "ALERT",
      [LogLevel.EMERGENCY]: "EMERG",
    };

    const prefix = entry.traceId ? `[${entry.traceId.slice(0, 8)}] ` : "";
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const errorStr = entry.error ? ` | Error: ${entry.error.message}` : "";

    const formatted = `[${entry.category}] ${levelNames[entry.level]}: ${prefix}${entry.message}${contextStr}${errorStr}`;

    Zotero.debug(formatted);
  }

  /**
   * Get log entries for a time range
   */
  getEntries(
    options: {
      since?: number;
      until?: number;
      level?: LogLevel;
      category?: string;
      traceId?: string;
      limit?: number;
    } = {},
  ): LogEntry[] {
    let filtered = this.entries;

    if (options.since) {
      filtered = filtered.filter((e) => e.timestamp >= options.since!);
    }
    if (options.until) {
      filtered = filtered.filter((e) => e.timestamp <= options.until!);
    }
    if (options.level !== undefined) {
      filtered = filtered.filter((e) => e.level <= options.level!);
    }
    if (options.category) {
      filtered = filtered.filter((e) => e.category.includes(options.category!));
    }
    if (options.traceId) {
      filtered = filtered.filter((e) => e.traceId === options.traceId);
    }
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get error summary
   */
  getErrorSummary(since?: number): Record<string, number> {
    const errors = this.getEntries({
      since,
      level: LogLevel.ERROR,
    });

    const summary: Record<string, number> = {};
    for (const entry of errors) {
      const key = entry.error?.name || entry.category;
      summary[key] = (summary[key] || 0) + 1;
    }

    return summary;
  }

  /**
   * Export logs to JSON
   */
  export(options: { since?: number; pretty?: boolean } = {}): string {
    const entries = this.getEntries({ since: options.since });
    return JSON.stringify(entries, null, options.pretty ? 2 : undefined);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Category-scoped logger for modules
 */
export class CategoryLogger {
  constructor(
    private parent: Logger,
    private category: string,
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(this.category, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(this.category, message, context);
  }

  notice(message: string, context?: Record<string, unknown>): void {
    this.parent.notice(this.category, message, context);
  }

  warning(message: string, context?: Record<string, unknown>): void {
    this.parent.warning(this.category, message, context);
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.parent.error(this.category, message, error, context);
  }

  critical(
    message: string,
    error?: Error,
    context?: Record<string, unknown>,
  ): void {
    this.parent.critical(this.category, message, error, context);
  }

  child(subcategory: string): CategoryLogger {
    return new CategoryLogger(this.parent, `${this.category}:${subcategory}`);
  }
}

// Pre-configured loggers for common modules
export const createServiceLogger = (serviceId: string): CategoryLogger =>
  Logger.getInstance().child(`Service:${serviceId}`);

export const createArchiveLogger = (): CategoryLogger =>
  Logger.getInstance().child("Archive");

export const createMementoLogger = (): CategoryLogger =>
  Logger.getInstance().child("Memento");

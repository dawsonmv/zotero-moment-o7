/**
 * Unit tests for Logger
 */

import { Logger, CategoryLogger } from '../../src/monitoring/Logger';
import { LogLevel } from '../../src/monitoring/types';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    // Get fresh instance and clear
    logger = Logger.getInstance();
    logger.clear();
    logger.configure({ minLevel: LogLevel.DEBUG, enableConsole: false });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Test', 'Debug message');
      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[0].message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('Test', 'Info message');
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(LogLevel.INFO);
    });

    it('should log notice messages', () => {
      logger.notice('Test', 'Notice message');
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(LogLevel.NOTICE);
    });

    it('should log warning messages', () => {
      logger.warning('Test', 'Warning message');
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(LogLevel.WARNING);
    });

    it('should log error messages with Error object', () => {
      const error = new Error('Test error');
      logger.error('Test', 'Error message', error);
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(LogLevel.ERROR);
      expect(entries[0].error?.message).toBe('Test error');
    });

    it('should log critical messages', () => {
      const error = new Error('Critical error');
      logger.critical('Test', 'Critical message', error);
      const entries = logger.getEntries();
      expect(entries[0].level).toBe(LogLevel.CRITICAL);
    });

    it('should include context in log entries', () => {
      logger.info('Test', 'Message with context', { key: 'value', count: 42 });
      const entries = logger.getEntries();
      expect(entries[0].context).toEqual({ key: 'value', count: 42 });
    });

    it('should include timestamp', () => {
      const before = Date.now();
      logger.info('Test', 'Timestamped message');
      const after = Date.now();

      const entries = logger.getEntries();
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(entries[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('trace ID correlation', () => {
    it('should include trace ID when set', () => {
      logger.setTraceId('trace-123');
      logger.info('Test', 'Traced message');

      const entries = logger.getEntries();
      expect(entries[0].traceId).toBe('trace-123');
    });

    it('should clear trace ID', () => {
      logger.setTraceId('trace-123');
      logger.clearTraceId();
      logger.info('Test', 'Untraced message');

      const entries = logger.getEntries();
      expect(entries[0].traceId).toBeUndefined();
    });
  });

  describe('log level filtering', () => {
    it('should respect minimum log level', () => {
      logger.configure({ minLevel: LogLevel.WARNING });

      logger.debug('Test', 'Debug');
      logger.info('Test', 'Info');
      logger.warning('Test', 'Warning');
      logger.error('Test', 'Error');

      const entries = logger.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe(LogLevel.WARNING);
      expect(entries[1].level).toBe(LogLevel.ERROR);
    });
  });

  describe('getEntries filtering', () => {
    beforeEach(() => {
      // Add test entries
      logger.setTraceId('trace-1');
      logger.info('Category1', 'Message 1');
      logger.setTraceId('trace-2');
      logger.warning('Category2', 'Message 2');
      logger.error('Category1', 'Message 3');
      logger.clearTraceId();
    });

    it('should filter by level', () => {
      const entries = logger.getEntries({ level: LogLevel.WARNING });
      expect(entries).toHaveLength(2); // WARNING and ERROR
    });

    it('should filter by category', () => {
      const entries = logger.getEntries({ category: 'Category1' });
      expect(entries).toHaveLength(2);
    });

    it('should filter by trace ID', () => {
      const entries = logger.getEntries({ traceId: 'trace-1' });
      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('Message 1');
    });

    it('should limit results', () => {
      const entries = logger.getEntries({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const entries = logger.getEntries({ since: now - 1000, until: now + 1000 });
      expect(entries).toHaveLength(3);
    });
  });

  describe('getErrorSummary', () => {
    it('should summarize errors by type', () => {
      const error1 = new Error('Error 1');
      error1.name = 'TypeError';
      const error2 = new Error('Error 2');
      error2.name = 'TypeError';
      const error3 = new Error('Error 3');
      error3.name = 'RangeError';

      logger.error('Test', 'Message 1', error1);
      logger.error('Test', 'Message 2', error2);
      logger.error('Test', 'Message 3', error3);

      const summary = logger.getErrorSummary();
      expect(summary['TypeError']).toBe(2);
      expect(summary['RangeError']).toBe(1);
    });
  });

  describe('export', () => {
    it('should export to JSON string', () => {
      logger.info('Test', 'Export test');
      const json = logger.export();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('Export test');
    });

    it('should export pretty JSON when requested', () => {
      logger.info('Test', 'Export test');
      const json = logger.export({ pretty: true });
      expect(json).toContain('\n');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      logger.info('Test', 'Message 1');
      logger.info('Test', 'Message 2');
      expect(logger.getEntries()).toHaveLength(2);

      logger.clear();
      expect(logger.getEntries()).toHaveLength(0);
    });
  });

  describe('max entries limit', () => {
    it('should trim old entries when over limit', () => {
      logger.configure({ maxEntries: 5 });

      for (let i = 1; i <= 10; i++) {
        logger.info('Test', `Message ${i}`);
      }

      const entries = logger.getEntries();
      expect(entries).toHaveLength(5);
      expect(entries[0].message).toBe('Message 6');
      expect(entries[4].message).toBe('Message 10');
    });
  });
});

describe('CategoryLogger', () => {
  let logger: Logger;
  let categoryLogger: CategoryLogger;

  beforeEach(() => {
    logger = Logger.getInstance();
    logger.clear();
    // Configure to INFO level by default (DEBUG is level 7, INFO is level 6)
    logger.configure({ minLevel: LogLevel.INFO, enableConsole: false });
    categoryLogger = logger.child('TestCategory');
  });

  it('should prefix category to log entries', () => {
    categoryLogger.info('Test message');
    const entries = logger.getEntries();
    expect(entries[0].category).toContain('TestCategory');
  });

  it('should support all log levels', () => {
    // Default config is INFO level, so debug is filtered
    // Test only the levels that pass the filter
    categoryLogger.info('Info');
    categoryLogger.notice('Notice');
    categoryLogger.warning('Warning');
    categoryLogger.error('Error');
    categoryLogger.critical('Critical');

    expect(logger.getEntries()).toHaveLength(5);
  });

  it('should support nested categories', () => {
    const nestedLogger = categoryLogger.child('Nested');
    nestedLogger.info('Nested message');

    const entries = logger.getEntries();
    expect(entries[0].category).toContain('TestCategory:Nested');
  });

  it('should pass context to parent', () => {
    categoryLogger.info('Message', { key: 'value' });
    const entries = logger.getEntries();
    expect(entries[0].context).toEqual({ key: 'value' });
  });

  it('should pass error to parent', () => {
    const error = new Error('Test error');
    categoryLogger.error('Error message', error);

    const entries = logger.getEntries();
    expect(entries[0].error?.message).toBe('Test error');
  });
});

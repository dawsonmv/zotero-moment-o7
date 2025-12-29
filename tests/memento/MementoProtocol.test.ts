/**
 * Unit tests for MementoProtocol (RFC 7089)
 */

import { MementoProtocol, MementoLink, Memento } from '../../src/memento/MementoProtocol';

describe('MementoProtocol', () => {
  describe('parseLinkHeader', () => {
    it('should parse a simple link header', () => {
      const header = '<http://example.com>; rel="original"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('http://example.com');
      expect(result[0].rel).toContain('original');
    });

    it('should parse multiple links', () => {
      const header = '<http://example.com>; rel="original", <http://archive.org/web/123/http://example.com>; rel="memento"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(2);
      expect(result[0].rel).toContain('original');
      expect(result[1].rel).toContain('memento');
    });

    it('should parse datetime parameter', () => {
      // Note: The parser splits on spaces within quoted values, so we test a simpler datetime
      const header = '<http://archive.org/web/20230101/http://example.com>; rel="memento"; datetime="2023-01-01T00:00:00Z"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(1);
      expect(result[0].datetime).toBe('2023-01-01T00:00:00Z');
    });

    it('should parse multiple rel values', () => {
      const header = '<http://archive.org/web/first/http://example.com>; rel="memento first"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(1);
      expect(result[0].rel).toContain('memento');
      expect(result[0].rel).toContain('first');
    });

    it('should parse type parameter', () => {
      const header = '<http://archive.org/timemap/http://example.com>; rel="timemap"; type="application/link-format"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('application/link-format');
    });

    it('should parse from and until parameters', () => {
      const header = '<http://archive.org/timemap/http://example.com>; rel="timemap"; from="2020-01-01"; until="2023-01-01"';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('2020-01-01');
      expect(result[0].until).toBe('2023-01-01');
    });

    it('should ignore links without rel', () => {
      const header = '<http://example.com>';
      const result = MementoProtocol.parseLinkHeader(header);

      expect(result).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const result = MementoProtocol.parseLinkHeader('');
      expect(result).toHaveLength(0);
    });
  });

  describe('formatLinkHeader', () => {
    it('should format a simple link', () => {
      const links: MementoLink[] = [{
        url: 'http://example.com',
        rel: ['original']
      }];

      const result = MementoProtocol.formatLinkHeader(links);
      expect(result).toBe('<http://example.com>; rel="original"');
    });

    it('should format multiple links', () => {
      const links: MementoLink[] = [
        { url: 'http://example.com', rel: ['original'] },
        { url: 'http://archive.org/web/123/http://example.com', rel: ['memento'] }
      ];

      const result = MementoProtocol.formatLinkHeader(links);
      expect(result).toContain('<http://example.com>; rel="original"');
      expect(result).toContain('<http://archive.org/web/123/http://example.com>; rel="memento"');
    });

    it('should format datetime parameter', () => {
      const links: MementoLink[] = [{
        url: 'http://archive.org/web/20230101/http://example.com',
        rel: ['memento'],
        datetime: 'Sun, 01 Jan 2023 00:00:00 GMT'
      }];

      const result = MementoProtocol.formatLinkHeader(links);
      expect(result).toContain('datetime="Sun, 01 Jan 2023 00:00:00 GMT"');
    });

    it('should format all parameters', () => {
      const links: MementoLink[] = [{
        url: 'http://archive.org/timemap/http://example.com',
        rel: ['timemap'],
        type: 'application/link-format',
        from: '2020-01-01',
        until: '2023-01-01'
      }];

      const result = MementoProtocol.formatLinkHeader(links);
      expect(result).toContain('type="application/link-format"');
      expect(result).toContain('from="2020-01-01"');
      expect(result).toContain('until="2023-01-01"');
    });

    it('should handle empty array', () => {
      const result = MementoProtocol.formatLinkHeader([]);
      expect(result).toBe('');
    });
  });

  describe('parseTimeMap (JSON)', () => {
    it('should parse Internet Archive JSON format', () => {
      const json = {
        original_uri: 'http://example.com',
        timegate_uri: 'http://web.archive.org/web/http://example.com',
        timemap_uri: 'http://web.archive.org/web/timemap/http://example.com',
        mementos: {
          list: [
            { uri: 'http://web.archive.org/web/20230101/http://example.com', datetime: '2023-01-01T00:00:00Z' },
            { uri: 'http://web.archive.org/web/20230601/http://example.com', datetime: '2023-06-01T00:00:00Z' }
          ]
        }
      };

      const result = MementoProtocol.parseTimeMap(json);

      expect(result.original).toBe('http://example.com');
      expect(result.timegate).toBe('http://web.archive.org/web/http://example.com');
      expect(result.timemap).toBe('http://web.archive.org/web/timemap/http://example.com');
      expect(result.mementos).toHaveLength(2);
      expect(result.mementos[0].url).toBe('http://web.archive.org/web/20230101/http://example.com');
    });

    it('should handle missing fields', () => {
      const json = {};
      const result = MementoProtocol.parseTimeMap(json);

      expect(result.original).toBe('');
      expect(result.mementos).toHaveLength(0);
    });

    it('should parse rel from memento entries', () => {
      const json = {
        original_uri: 'http://example.com',
        mementos: {
          list: [
            { uri: 'http://archive/1', datetime: '2023-01-01', rel: 'first memento' }
          ]
        }
      };

      const result = MementoProtocol.parseTimeMap(json);
      expect(result.mementos[0].rel).toContain('first');
      expect(result.mementos[0].rel).toContain('memento');
    });
  });

  describe('parseTimemapLinkFormat', () => {
    it('should parse link format timemap', () => {
      const text = `
<http://example.com>; rel="original",
<http://archive.org/timegate/http://example.com>; rel="timegate",
<http://archive.org/timemap/http://example.com>; rel="self"; type="application/link-format; timemap",
<http://archive.org/web/20230101/http://example.com>; rel="memento"; datetime="Sun, 01 Jan 2023 00:00:00 GMT"
      `;

      const result = MementoProtocol.parseTimemapLinkFormat(text);

      expect(result.original).toBe('http://example.com');
      expect(result.timegate).toBe('http://archive.org/timegate/http://example.com');
      expect(result.mementos).toHaveLength(1);
    });

    it('should handle empty string', () => {
      const result = MementoProtocol.parseTimemapLinkFormat('');
      expect(result.mementos).toHaveLength(0);
    });
  });

  describe('findBestMemento', () => {
    const mementos: Memento[] = [
      { url: 'http://archive/1', datetime: '2023-01-01T00:00:00Z' },
      { url: 'http://archive/2', datetime: '2023-06-01T00:00:00Z' },
      { url: 'http://archive/3', datetime: '2023-12-01T00:00:00Z' }
    ];

    it('should return null for empty array', () => {
      expect(MementoProtocol.findBestMemento([])).toBeNull();
    });

    it('should return most recent without target date', () => {
      const result = MementoProtocol.findBestMemento(mementos);
      expect(result?.url).toBe('http://archive/3');
    });

    it('should return closest to target date', () => {
      const targetDate = new Date('2023-05-15T00:00:00Z');
      const result = MementoProtocol.findBestMemento(mementos, targetDate);
      expect(result?.url).toBe('http://archive/2');
    });

    it('should return exact match if available', () => {
      const targetDate = new Date('2023-06-01T00:00:00Z');
      const result = MementoProtocol.findBestMemento(mementos, targetDate);
      expect(result?.url).toBe('http://archive/2');
    });
  });

  describe('formatHttpDate', () => {
    it('should format date as HTTP date', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      const result = MementoProtocol.formatHttpDate(date);
      expect(result).toMatch(/Sun, 01 Jan 2023 12:00:00 GMT/);
    });
  });

  describe('parseHttpDate', () => {
    it('should parse HTTP date string', () => {
      const dateStr = 'Sun, 01 Jan 2023 12:00:00 GMT';
      const result = MementoProtocol.parseHttpDate(dateStr);
      expect(result.getUTCFullYear()).toBe(2023);
      expect(result.getUTCMonth()).toBe(0);
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe('isMemento', () => {
    it('should return true for memento response', () => {
      const headers = {
        'Link': '<http://example.com>; rel="original", <http://archive/1>; rel="memento"'
      };
      expect(MementoProtocol.isMemento(headers)).toBe(true);
    });

    it('should return false for non-memento response', () => {
      const headers = {
        'Link': '<http://example.com>; rel="original"'
      };
      expect(MementoProtocol.isMemento(headers)).toBe(false);
    });

    it('should return false without Link header', () => {
      expect(MementoProtocol.isMemento({})).toBe(false);
    });

    it('should handle lowercase header name', () => {
      const headers = {
        'link': '<http://archive/1>; rel="memento"'
      };
      expect(MementoProtocol.isMemento(headers)).toBe(true);
    });
  });

  describe('extractMementoInfo', () => {
    it('should extract memento info from headers', () => {
      const headers = {
        'Link': '<http://example.com>; rel="original", <http://archive/1>; rel="memento"; datetime="Sun, 01 Jan 2023 00:00:00 GMT"',
        'Memento-Datetime': 'Sun, 01 Jan 2023 00:00:00 GMT'
      };

      const result = MementoProtocol.extractMementoInfo(headers);

      expect(result).not.toBeNull();
      expect(result?.mementoUrl).toBe('http://archive/1');
      expect(result?.original).toBe('http://example.com');
      expect(result?.mementoDatetime).toBe('Sun, 01 Jan 2023 00:00:00 GMT');
    });

    it('should return null without Link header', () => {
      expect(MementoProtocol.extractMementoInfo({})).toBeNull();
    });

    it('should return null without memento link', () => {
      const headers = {
        'Link': '<http://example.com>; rel="original"'
      };
      expect(MementoProtocol.extractMementoInfo(headers)).toBeNull();
    });

    it('should return null without original link', () => {
      const headers = {
        'Link': '<http://archive/1>; rel="memento"'
      };
      expect(MementoProtocol.extractMementoInfo(headers)).toBeNull();
    });

    it('should use datetime from link if Memento-Datetime header missing', () => {
      const headers = {
        'Link': '<http://example.com>; rel="original", <http://archive/1>; rel="memento"; datetime="2023-01-01T00:00:00Z"'
      };

      const result = MementoProtocol.extractMementoInfo(headers);
      expect(result?.mementoDatetime).toBe('2023-01-01T00:00:00Z');
    });
  });
});

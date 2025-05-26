/**
 * Unit tests for HtmlUtils
 */

import { HtmlUtils } from '../../src/utils/HtmlUtils';

describe('HtmlUtils', () => {
  describe('escape', () => {
    it('should escape HTML special characters', () => {
      expect(HtmlUtils.escape('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(HtmlUtils.escape("O'Neill")).toBe("O&#039;Neill");
      expect(HtmlUtils.escape('A & B')).toBe('A &amp; B');
    });

    it('should handle empty strings', () => {
      expect(HtmlUtils.escape('')).toBe('');
      expect(HtmlUtils.escape(null as any)).toBe('');
      expect(HtmlUtils.escape(undefined as any)).toBe('');
    });

    it('should not escape already safe text', () => {
      expect(HtmlUtils.escape('Hello World')).toBe('Hello World');
      expect(HtmlUtils.escape('user@example.com')).toBe('user@example.com');
    });
  });

  describe('unescape', () => {
    it('should unescape HTML entities', () => {
      expect(HtmlUtils.unescape('&lt;div&gt;')).toBe('<div>');
      expect(HtmlUtils.unescape('&amp;nbsp;')).toBe('&nbsp;');
      expect(HtmlUtils.unescape('&quot;Hello&quot;')).toBe('"Hello"');
    });
  });

  describe('stripTags', () => {
    it('should remove HTML tags', () => {
      expect(HtmlUtils.stripTags('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
      expect(HtmlUtils.stripTags('<script>alert("XSS")</script>Text')).toBe('alert("XSS")Text');
    });

    it('should handle nested tags', () => {
      expect(HtmlUtils.stripTags('<div><p>Nested <span>tags</span></p></div>')).toBe('Nested tags');
    });
  });

  describe('createSafeElement', () => {
    it('should create safe HTML elements', () => {
      const result = HtmlUtils.createSafeElement('a', 'Click here', {
        href: 'https://example.com',
        target: '_blank'
      });
      expect(result).toBe(
        '<a href="https:&#x2F;&#x2F;example.com" target="_blank">Click here</a>'
      );
    });

    it('should escape dangerous content', () => {
      const result = HtmlUtils.createSafeElement('div', '<script>alert("XSS")</script>');
      expect(result).toBe('<div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;</div>');
    });
  });

  describe('createRobustLink', () => {
    it('should create a robust link with data attributes', () => {
      const result = HtmlUtils.createRobustLink(
        'https://example.com',
        'https://archive.org/example',
        'Example Site',
        '2024-01-01T00:00:00Z'
      );

      expect(result).toContain('href="https:&#x2F;&#x2F;example.com"');
      expect(result).toContain('data-originalurl="https:&#x2F;&#x2F;example.com"');
      expect(result).toContain('data-versionurl="https:&#x2F;&#x2F;archive.org&#x2F;example"');
      expect(result).toContain('data-versiondate="2024-01-01T00:00:00Z"');
      expect(result).toContain('>Example Site</a>');
    });

    it('should handle special characters in URLs', () => {
      const result = HtmlUtils.createRobustLink(
        'https://example.com?q=test&p=1',
        'https://archive.org/example?q=test&p=1',
        'Test & Example'
      );

      expect(result).toContain('Test &amp; Example</a>');
      expect(result).toContain('data-originalurl="https:&#x2F;&#x2F;example.com?q=test&amp;p=1"');
    });
  });

  describe('extractUrls', () => {
    it('should extract URLs from HTML', () => {
      const html = `
        <div>
          <a href="https://example.com">Link 1</a>
          <a href="https://test.com">Link 2</a>
          <img src="https://cdn.example.com/image.jpg" />
          <a href="/relative">Relative</a>
          <a href="mailto:test@example.com">Email</a>
        </div>
      `;

      const urls = HtmlUtils.extractUrls(html);
      expect(urls).toEqual([
        'https://example.com',
        'https://test.com',
        'https://cdn.example.com/image.jpg'
      ]);
    });

    it('should handle duplicate URLs', () => {
      const html = `
        <a href="https://example.com">Link 1</a>
        <a href="https://example.com">Link 2</a>
      `;

      const urls = HtmlUtils.extractUrls(html);
      expect(urls).toEqual(['https://example.com']);
    });
  });

  describe('sanitize', () => {
    it('should remove script tags', () => {
      const html = '<div>Hello <script>alert("XSS")</script>World</div>';
      const result = HtmlUtils.sanitize(html);
      expect(result).toBe('<div>Hello World</div>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = HtmlUtils.sanitize(html);
      expect(result).toBe('<div>Click me</div>');
    });

    it('should remove disallowed tags', () => {
      const html = '<p>Allowed</p><iframe>Not allowed</iframe><span>Also allowed</span>';
      const result = HtmlUtils.sanitize(html);
      expect(result).toBe('<p>Allowed</p>Not allowed<span>Also allowed</span>');
    });

    it('should keep allowed tags', () => {
      const html = '<p>Paragraph</p><a href="https://example.com">Link</a>';
      const result = HtmlUtils.sanitize(html, ['p', 'a']);
      expect(result).toBe('<p>Paragraph</p><a href="https://example.com">Link</a>');
    });
  });

  describe('parseAttributes', () => {
    it('should parse attributes from HTML', () => {
      const html = '<a href="https://example.com" target="_blank" data-id="123">Link</a>';
      const attrs = HtmlUtils.parseAttributes(html);
      
      expect(attrs).toEqual({
        href: 'https://example.com',
        target: '_blank',
        'data-id': '123'
      });
    });

    it('should handle empty HTML', () => {
      expect(HtmlUtils.parseAttributes('')).toEqual({});
      expect(HtmlUtils.parseAttributes('Plain text')).toEqual({});
    });
  });
});
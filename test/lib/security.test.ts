import { describe, it, expect } from 'vitest';
import { XSSProtection, InputSanitizer } from '@/lib/security';

describe('XSS Protection', () => {
  describe('encodeHtml', () => {
    it('should encode HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const output = XSSProtection.encodeHtml(input);
      expect(output).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(output).not.toContain('<script>');
    });

    it('should encode all dangerous characters', () => {
      expect(XSSProtection.encodeHtml('&')).toBe('&amp;');
      expect(XSSProtection.encodeHtml('<')).toBe('&lt;');
      expect(XSSProtection.encodeHtml('>')).toBe('&gt;');
      expect(XSSProtection.encodeHtml('"')).toBe('&quot;');
      expect(XSSProtection.encodeHtml("'")).toBe('&#39;');
      expect(XSSProtection.encodeHtml('/')).toBe('&#x2F;');
    });

    it('should handle mixed content', () => {
      const input = 'Hello <b>World</b> & "Friends"';
      const output = XSSProtection.encodeHtml(input);
      expect(output).not.toContain('<b>');
      expect(output).not.toContain('&');
      expect(output).toContain('&amp;');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid https URLs', () => {
      const url = 'https://example.com/path';
      const sanitized = XSSProtection.sanitizeUrl(url);
      expect(sanitized).toBe(url);
    });

    it('should block javascript: URLs', () => {
      const url = 'javascript:alert("xss")';
      const sanitized = XSSProtection.sanitizeUrl(url);
      expect(sanitized).toBe('');
    });

    it('should block data: URLs', () => {
      const url = 'data:text/html,<script>alert("xss")</script>';
      const sanitized = XSSProtection.sanitizeUrl(url);
      expect(sanitized).toBe('');
    });
  });
});

describe('Input Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const output = InputSanitizer.sanitizeHtml(input);
      expect(output).toBe('Hello');
      expect(output).not.toContain('<');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const output = InputSanitizer.sanitizeHtml(input);
      expect(output).not.toContain('onclick');
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize dangerous file names', () => {
      expect(InputSanitizer.sanitizeFileName('../../../etc/passwd')).not.toContain('..');
      expect(InputSanitizer.sanitizeFileName('file name.txt')).not.toContain(' ');
      expect(InputSanitizer.sanitizeFileName('.htaccess')).not.toMatch(/^\./);
    });

    it('should limit file name length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = InputSanitizer.sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize email addresses', () => {
      expect(InputSanitizer.sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
      expect(InputSanitizer.sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should remove invalid characters', () => {
      const input = 'test<script>@example.com';
      const output = InputSanitizer.sanitizeEmail(input);
      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
    });
  });
});

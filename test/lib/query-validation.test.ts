import { describe, it, expect } from 'vitest';
import {
  validatePagination,
  sanitizeSearchQuery,
  validateString,
  validateNumber,
  validateBoolean,
} from '@/lib/query-validation';

describe('Query Validation', () => {
  describe('validatePagination', () => {
    it('should return default values for invalid input', () => {
      const result = validatePagination(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should validate and parse valid pagination', () => {
      const result = validatePagination('2', '20');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });

    it('should enforce max limit', () => {
      const result = validatePagination('1', '1000', {
        maxLimit: 100,
      });
      expect(result.limit).toBe(100);
    });

    it('should handle negative numbers', () => {
      const result = validatePagination('-1', '-10');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize malicious input', () => {
      const result = sanitizeSearchQuery('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });

    it('should trim whitespace', () => {
      const result = sanitizeSearchQuery('  test  ');
      expect(result).toBe('test');
    });

    it('should return empty string for undefined', () => {
      const result = sanitizeSearchQuery(undefined);
      expect(result).toBe('');
    });
  });

  describe('validateString', () => {
    it('should validate string with constraints', () => {
      const result = validateString('test', {
        minLength: 2,
        maxLength: 10,
      });
      expect(result).toBe('test');
    });

    it('should return default for invalid input', () => {
      const result = validateString('a', {
        minLength: 2,
        defaultValue: 'default',
      });
      expect(result).toBe('default');
    });
  });

  describe('validateNumber', () => {
    it('should parse valid numbers', () => {
      const result = validateNumber('42');
      expect(result).toBe(42);
    });

    it('should return default for invalid input', () => {
      const result = validateNumber('invalid', { defaultValue: 0 });
      expect(result).toBe(0);
    });

    it('should enforce min and max', () => {
      const resultMin = validateNumber('5', { min: 10, defaultValue: 10 });
      expect(resultMin).toBe(10);

      const resultMax = validateNumber('100', { max: 50, defaultValue: 50 });
      expect(resultMax).toBe(50);
    });
  });

  describe('validateBoolean', () => {
    it('should parse boolean strings', () => {
      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('false')).toBe(false);
      expect(validateBoolean('1')).toBe(true);
      expect(validateBoolean('0')).toBe(false);
    });

    it('should return default for invalid input', () => {
      const result = validateBoolean('invalid', { defaultValue: false });
      expect(result).toBe(false);
    });
  });
});

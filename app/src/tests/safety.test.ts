/* ──────────────────────────────────────────────────
   VitalCoach — Safety & Validation Tests
   ────────────────────────────────────────────────── */

import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  collapseWhitespace,
  sanitizeTextInput,
  containsDiagnosticLanguage,
  sanitizeOutput,
  wrapWithDisclaimer,
  escapeHtml,
  validateImageFile,
  validateAudioFile,
  generateId,
} from '../lib/safety.js';

describe('Safety Utilities', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<b>bold</b>')).toBe('bold');
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(stripHtml('no tags here')).toBe('no tags here');
    });

    it('handles nested tags', () => {
      expect(stripHtml('<div><p><a href="x">link</a></p></div>')).toBe('link');
    });
  });

  describe('collapseWhitespace', () => {
    it('collapses multiple spaces', () => {
      expect(collapseWhitespace('too   many   spaces')).toBe('too many spaces');
    });

    it('trims leading/trailing whitespace', () => {
      expect(collapseWhitespace('  hello  ')).toBe('hello');
    });

    it('collapses newlines and tabs', () => {
      expect(collapseWhitespace('line1\n\n\tline2')).toBe('line1 line2');
    });
  });

  describe('sanitizeTextInput', () => {
    it('strips HTML and collapses whitespace', () => {
      expect(sanitizeTextInput('<b>hello</b>   world')).toBe('hello world');
    });

    it('truncates to max length', () => {
      const longText = 'a'.repeat(3000);
      expect(sanitizeTextInput(longText).length).toBe(2000);
    });

    it('handles non-string input', () => {
      expect(sanitizeTextInput(null as any)).toBe('');
      expect(sanitizeTextInput(undefined as any)).toBe('');
      expect(sanitizeTextInput(123 as any)).toBe('');
    });
  });

  describe('containsDiagnosticLanguage', () => {
    it('detects banned phrases', () => {
      expect(containsDiagnosticLanguage('You have diabetes')).toBe(true);
      expect(containsDiagnosticLanguage('You are diagnosed with anxiety')).toBe(true);
      expect(containsDiagnosticLanguage('This confirms heart disease')).toBe(true);
      expect(containsDiagnosticLanguage('You need medication')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(containsDiagnosticLanguage('YOU HAVE a condition')).toBe(true);
    });

    it('passes safe language', () => {
      expect(containsDiagnosticLanguage('Your data suggests low energy')).toBe(false);
      expect(containsDiagnosticLanguage('Patterns may indicate poor sleep')).toBe(false);
    });
  });

  describe('sanitizeOutput', () => {
    it('replaces diagnostic phrases with safe alternatives', () => {
      const result = sanitizeOutput('You have low HRV');
      expect(result).toContain('your data suggests');
      expect(result).not.toContain('You have');
    });

    it('passes clean text through unchanged', () => {
      const text = 'Your sleep patterns look interesting';
      expect(sanitizeOutput(text)).toBe(text);
    });
  });

  describe('wrapWithDisclaimer', () => {
    it('appends disclaimer', () => {
      const result = wrapWithDisclaimer('Some insight');
      expect(result).toContain('Some insight');
      expect(result).toContain('not medical advice');
    });

    it('accepts custom disclaimer', () => {
      const result = wrapWithDisclaimer('Insight', 'Custom disclaimer');
      expect(result).toContain('Custom disclaimer');
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(escapeHtml('<script>"test"</script>')).toBe('&lt;script&gt;&quot;test&quot;&lt;/script&gt;');
    });

    it('handles null/undefined', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });
  });

  describe('validateImageFile', () => {
    it('accepts valid image types', () => {
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      expect(validateImageFile(file).valid).toBe(true);
    });

    it('rejects invalid types', () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('rejects null', () => {
      const result = validateImageFile(null as any);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAudioFile', () => {
    it('accepts valid audio types', () => {
      const file = new File(['data'], 'voice.webm', { type: 'audio/webm' });
      expect(validateAudioFile(file).valid).toBe(true);
    });

    it('rejects invalid types', () => {
      const file = new File(['data'], 'video.mp4', { type: 'video/mp4' });
      expect(validateAudioFile(file).valid).toBe(false);
    });
  });

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('returns non-empty string', () => {
      expect(generateId().length).toBeGreaterThan(0);
    });
  });
});

/* ──────────────────────────────────────────────────
   VitalCoach — Safety & Validation Utilities
   Security-first: sanitize inputs, validate files,
   wrap outputs with disclaimers, detect banned phrases.
   ────────────────────────────────────────────────── */

// ─── Constants ────────────────────────────────────

export const DISCLAIMER =
  'These insights are based on your wellness data patterns and are not medical advice. ' +
  'If symptoms persist or are severe, please consult a healthcare professional.';

export const FALLBACK_ERROR_MESSAGE =
  'I\'m unable to process that request right now. Please try again or rephrase your question.';

const BANNED_DIAGNOSTIC_PHRASES = [
  'you have',
  'you are diagnosed',
  'this confirms',
  'you suffer from',
  'you\'re suffering from',
  'clinical diagnosis',
  'medical diagnosis',
  'disease detected',
  'condition detected',
  'you need medication',
  'prescribe',
  'prescription',
];

const MAX_TEXT_INPUT_LENGTH = 2000;
const MAX_FILE_SIZE_BYTES   = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES   = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];

// ─── Text Sanitization ───────────────────────────

/** Strip HTML tags to prevent XSS */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Collapse excess whitespace */
export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** Full sanitization pipeline for user text input */
export function sanitizeTextInput(input: string): string {
  if (typeof input !== 'string') return '';
  let sanitized = stripHtml(input);
  sanitized = collapseWhitespace(sanitized);
  if (sanitized.length > MAX_TEXT_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_TEXT_INPUT_LENGTH);
  }
  return sanitized;
}

// ─── Output Safety ────────────────────────────────

/** Check if output contains banned diagnostic phrases */
export function containsDiagnosticLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_DIAGNOSTIC_PHRASES.some((phrase) => lower.includes(phrase));
}

/** Wrap AI output with safety disclaimer */
export function wrapWithDisclaimer(text: string, disclaimer?: string): string {
  const disc = disclaimer ?? DISCLAIMER;
  return `${text}\n\n---\n_${disc}_`;
}

/** Clean AI output — remove diagnostic language if detected */
export function sanitizeOutput(text: string): string {
  if (containsDiagnosticLanguage(text)) {
    // Replace problematic phrases with safe alternatives
    let cleaned = text;
    const replacements: Record<string, string> = {
      'you have': 'your data suggests',
      'you are diagnosed': 'patterns may indicate',
      'this confirms': 'this is consistent with',
      'you suffer from': 'you may be experiencing',
      'you\'re suffering from': 'you may be experiencing',
      'disease detected': 'pattern observed',
      'condition detected': 'pattern observed',
    };
    for (const [phrase, replacement] of Object.entries(replacements)) {
      cleaned = cleaned.replace(new RegExp(phrase, 'gi'), replacement);
    }
    return cleaned;
  }
  return text;
}

// ─── File Validation ──────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/** Validate an uploaded image file */
export function validateImageFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP.` };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB.` };
  }
  return { valid: true };
}

/** Validate an uploaded audio file */
export function validateAudioFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed: WAV, MP3, WebM, OGG.` };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB.` };
  }
  return { valid: true };
}

// ─── HTML Escaping ────────────────────────────────

/** Escape HTML entities for safe rendering */
export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── ID Generation ────────────────────────────────

/** Generate unique ID for messages etc. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

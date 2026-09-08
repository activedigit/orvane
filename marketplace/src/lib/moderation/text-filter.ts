/**
 * Server-side anti-circumvention filter.
 *
 * Detects and masks contact information (phones incl. Arabic-Indic digits,
 * spaced/dashed digits and number words, emails, URLs, social handles) so
 * customers and suppliers cannot exchange contact details before the lead
 * is unlocked. Pure and dependency-free so it can be unit-tested and reused
 * by the image (OCR) pipeline.
 */

export type DetectionType = 'phone' | 'phone_words' | 'email' | 'url' | 'social' | 'keyword';

export interface Detection {
  type: DetectionType;
  match: string;
  start: number;
  end: number;
}

export interface FilterResult {
  text: string;
  wasFiltered: boolean;
  detections: Detection[];
  /** true when the message is basically only contact info (candidate for blocking) */
  isMostlyContact: boolean;
}

export const MASK_TEXT = 'تم إخفاء معلومات التواصل لحماية عملية التعاقد.';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/** Map Arabic-Indic / Persian digits to ASCII while preserving string length (1:1 code units). */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const a = ARABIC_INDIC.indexOf(ch);
    const p = PERSIAN.indexOf(ch);
    out += a >= 0 ? String(a) : p >= 0 ? String(p) : ch;
  }
  return out;
}

const NUMBER_WORDS = [
  'صفر', 'زيرو', 'واحد', 'واحده', 'واحدة', 'اثنين', 'اثنان', 'إثنين', 'ثنين', 'ثلاثة', 'ثلاثه', 'ثلاث', 'أربعة', 'اربعة', 'اربعه', 'أربعه', 'اربع',
  'خمسة', 'خمسه', 'خمس', 'ستة', 'سته', 'ست', 'سبعة', 'سبعه', 'سبع', 'ثمانية', 'ثمانيه', 'ثمان', 'تسعة', 'تسعه', 'تسع',
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
];

const SEP = '[\\s\\-.,،_()\\[\\]/\\\\]*';
const DIGIT_OR_WORD = `(?:\\d|${NUMBER_WORDS.join('|')})`;

const PATTERNS: { type: DetectionType; re: RegExp }[] = [
  // emails (also spelled "at"/"dot" variants)
  { type: 'email', re: /[\w.+\-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[\w\-]+\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}(?:\.[a-z]{2,})?/gi },
  // URLs and domains
  { type: 'url', re: /(?:https?:\/\/|www\.)[^\s]+/gi },
  { type: 'url', re: /\b[\w\-]+(?:\.[\w\-]+)*\.(?:com|net|org|sa|io|co|me|info|biz|shop|store|site|online|app|ai|xyz|link|ly|gl|sa\.com|com\.sa)(?:\/[^\s]*)?/gi },
  // Platform + username (instagram.com/x, t.me/x, wa.me/x, snap: x, انستقرام: x)
  {
    type: 'social',
    re: /(?:instagram|insta|ig|snapchat|snap|telegram|tiktok|twitter|x\.com|t\.me|wa\.me|whatsapp|انستقرام|انستغرام|انستا|إنستا|سناب\s*شات|سناب|تيليجرام|تلقرام|تلغرام|تيك\s*توك|تويتر|واتس\s*اب|واتساب|وتساب)\s*[:：\-]?\s*@?[A-Za-z0-9_.]{3,}/gi,
  },
  // @handles
  { type: 'social', re: /(?:^|[\s(])@[A-Za-z0-9_.]{3,}/g },
  // phones: 8+ digits with optional separators (covers 05xxxxxxxx, +966 5x xxx xxxx, 00966...)
  { type: 'phone', re: new RegExp(`(?:\\+|00)?\\d(?:${SEP}\\d){7,}`, 'g') },
  // phones written as words / mixed words and digits (7+ tokens)
  { type: 'phone_words', re: new RegExp(`(?:${DIGIT_OR_WORD}${SEP}){6,}${DIGIT_OR_WORD}`, 'gi') },
];

/** Intent keywords: flagged (logged) but not masked. */
const KEYWORD_RE = /(?:رقمي|رقم\s*جوالي|جوالي|تواصل\s*معي\s*على|كلمني\s*على|ارسل\s*لي\s*رقمك|أرسل\s*لي\s*رقمك|ابعث\s*رقمك|ايميلي|إيميلي|بريدي|حسابي\s*في|call\s*me|my\s*number|whats\s*app)/gi;

function overlaps(a: Detection, b: Detection) {
  return a.start < b.end && b.start < a.end;
}

export function detectContactInfo(input: string): Detection[] {
  const normalized = normalizeDigits(input);
  const found: Detection[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized))) {
      let text = m[0];
      let start = m.index;
      // trim leading whitespace/paren captured by handle pattern
      const lead = text.match(/^[\s(]+/);
      if (lead) {
        start += lead[0].length;
        text = text.slice(lead[0].length);
      }
      if (type === 'phone_words') {
        // require at least 7 numeric tokens (digits or words) to avoid "5 أيام" false positives
        const tokens = text.match(new RegExp(DIGIT_OR_WORD, 'gi')) || [];
        if (tokens.length < 7) continue;
        // skip pure-digit sequences already covered by phone pattern
        if (!/[^\d\s\-.,،_()\[\]/\\]/.test(text)) continue;
      }
      if (type === 'phone') {
        const digits = text.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15) continue;
        // ignore obvious non-phone numerics: long amounts without separators > 12 digits handled above;
        // ignore year ranges like 2024-2025
        if (/^\d{4}[\s\-.]+\d{4}$/.test(text) && digits.length === 8 && /^(19|20)\d{2}/.test(digits)) continue;
      }
      const det: Detection = { type, match: input.slice(start, start + text.length), start, end: start + text.length };
      if (!found.some((f) => overlaps(f, det))) found.push(det);
    }
  }
  KEYWORD_RE.lastIndex = 0;
  let k: RegExpExecArray | null;
  while ((k = KEYWORD_RE.exec(normalized))) {
    found.push({ type: 'keyword', match: k[0], start: k.index, end: k.index + k[0].length });
  }
  return found.sort((a, b) => a.start - b.start);
}

/** Masks all masking-type detections and returns sanitized text. */
export function filterContactInfo(input: string): FilterResult {
  const detections = detectContactInfo(input);
  const maskable = detections.filter((d) => d.type !== 'keyword');
  if (!maskable.length) return { text: input, wasFiltered: false, detections, isMostlyContact: false };

  // merge overlapping/adjacent spans
  const spans: { start: number; end: number }[] = [];
  for (const d of maskable) {
    const last = spans[spans.length - 1];
    if (last && d.start <= last.end + 1) last.end = Math.max(last.end, d.end);
    else spans.push({ start: d.start, end: d.end });
  }
  let out = '';
  let cursor = 0;
  let removed = 0;
  for (const s of spans) {
    out += input.slice(cursor, s.start) + `[${MASK_TEXT}]`;
    removed += s.end - s.start;
    cursor = s.end;
  }
  out += input.slice(cursor);
  const remaining = input.length - removed;
  return {
    text: out.replace(/\s{2,}/g, ' ').trim(),
    wasFiltered: true,
    detections,
    isMostlyContact: remaining <= Math.max(12, input.length * 0.25),
  };
}

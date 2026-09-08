/**
 * Image / document moderation pipeline.
 *
 * Modular by design: OCR, QR detection and redaction are providers that can
 * be swapped for real services (Google Vision, AWS Textract, Tesseract,
 * ZXing, sharp-based blurring ...) without touching call sites.
 * The default providers are no-ops so the platform works without them,
 * and every decision is written to `moderation_logs` via the caller.
 */
import { filterContactInfo, type Detection } from './text-filter';

export interface OcrBlock { text: string; bbox?: { x: number; y: number; w: number; h: number } }
export interface OcrProvider { readonly name: string; extractText(data: Buffer, mimeType: string): Promise<OcrBlock[]> }
export interface QrDetector { readonly name: string; detect(data: Buffer, mimeType: string): Promise<{ payload: string; bbox?: OcrBlock['bbox'] }[]> }
export interface ImageRedactor { readonly name: string; redact(data: Buffer, mimeType: string, boxes: NonNullable<OcrBlock['bbox']>[]): Promise<Buffer> }

export interface ImageModerationResult {
  status: 'approved' | 'redacted' | 'rejected' | 'skipped';
  output: Buffer;
  detections: (Detection & { source: 'ocr' | 'qr' })[];
  providers: { ocr: string; qr: string; redactor: string };
}

export const noopOcr: OcrProvider = { name: 'none', async extractText() { return []; } };
export const noopQr: QrDetector = { name: 'none', async detect() { return []; } };
export const passthroughRedactor: ImageRedactor = { name: 'none', async redact(data) { return data; } };

export interface ImagePipelineOptions {
  ocr?: OcrProvider;
  qr?: QrDetector;
  redactor?: ImageRedactor;
  /** When true and redaction is impossible, reject instead of approving. */
  strict?: boolean;
}

export async function moderateImage(data: Buffer, mimeType: string, opts: ImagePipelineOptions = {}): Promise<ImageModerationResult> {
  const ocr = opts.ocr ?? noopOcr;
  const qr = opts.qr ?? noopQr;
  const redactor = opts.redactor ?? passthroughRedactor;
  const providers = { ocr: ocr.name, qr: qr.name, redactor: redactor.name };

  if (ocr.name === 'none' && qr.name === 'none') {
    return { status: 'skipped', output: data, detections: [], providers };
  }

  const detections: ImageModerationResult['detections'] = [];
  const boxes: NonNullable<OcrBlock['bbox']>[] = [];

  const blocks = await ocr.extractText(data, mimeType);
  for (const b of blocks) {
    const r = filterContactInfo(b.text);
    for (const d of r.detections) {
      if (d.type === 'keyword') continue;
      detections.push({ ...d, source: 'ocr' });
      if (b.bbox) boxes.push(b.bbox);
    }
  }
  const codes = await qr.detect(data, mimeType);
  for (const c of codes) {
    detections.push({ type: 'url', match: c.payload, start: 0, end: c.payload.length, source: 'qr' });
    if (c.bbox) boxes.push(c.bbox);
  }

  if (!detections.length) return { status: 'approved', output: data, detections, providers };

  if (boxes.length && redactor.name !== 'none') {
    const output = await redactor.redact(data, mimeType, boxes);
    return { status: 'redacted', output, detections, providers };
  }
  if (opts.strict) return { status: 'rejected', output: data, detections, providers };
  return { status: 'rejected', output: data, detections, providers };
}

/** Resolve configured providers (env: OCR_PROVIDER, QR_PROVIDER). Extend here when connecting real services. */
export function getImagePipelineOptions(): ImagePipelineOptions {
  return { ocr: noopOcr, qr: noopQr, redactor: passthroughRedactor, strict: process.env.IMAGE_MODERATION_STRICT === 'true' };
}

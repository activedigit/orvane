import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** 12500 -> "12,500 ر.س" */
export function formatSAR(value: number | string | null | undefined, opts: { withCurrency?: boolean } = {}) {
  if (value == null || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  const s = nf.format(n);
  return opts.withCurrency === false ? s : `${s} ر.س`;
}

export function formatNumber(value: number | string | null | undefined) {
  if (value == null) return '0';
  return nf.format(Number(value));
}

const dateFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' });

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return dateFmt.format(new Date(d));
}
export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return '—';
  return dateTimeFmt.format(new Date(d));
}
export function formatTime(d: string | Date | null | undefined) {
  if (!d) return '';
  return timeFmt.format(new Date(d));
}

/** Arabic relative time: "قبل 5 دقائق" */
export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'الآن';
  const m = Math.floor(diff / 60);
  if (m < 60) return `قبل ${m} ${m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? 'دقائق' : 'دقيقة'}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ${h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? 'ساعات' : 'ساعة'}`;
  const days = Math.floor(h / 24);
  if (days < 30) return `قبل ${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومين' : days <= 10 ? 'أيام' : 'يوم'}`;
  return formatDate(d);
}

export function pluralDays(n: number) {
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومين';
  if (n <= 10) return `${n} أيام`;
  return `${n} يوم`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'supplier';
}

export function truncate(s: string | null | undefined, n = 80) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('');
}

/** Normalizes Saudi mobile formats (+966 5x, 966 5x, 5x) to 05xxxxxxxx. */
export function normalizePhone(p: string) {
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('966')) return '0' + digits.slice(3);
  if (digits.startsWith('5') && digits.length === 9) return '0' + digits;
  return digits;
}

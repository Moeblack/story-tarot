import type { Language, Localized } from '../shared/types';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}

export function otherLanguage(lang: Language): Language {
  return lang === 'zh' ? 'ja' : 'zh';
}

/** Resolve a localized value against the primary language with a graceful fallback. */
export function loc(value: Localized | undefined, lang: Language): string {
  if (!value) return '';
  return value[lang] || value[otherLanguage(lang)] || '';
}

/** The secondary language text, only when it differs from the primary one. */
export function locAlt(value: Localized | undefined, lang: Language): string {
  if (!value) return '';
  const primary = loc(value, lang);
  const alt = value[otherLanguage(lang)] || '';
  return alt && alt !== primary ? alt : '';
}

export function formatDateTime(iso: string, lang: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

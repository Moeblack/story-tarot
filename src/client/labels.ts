import type { Copy } from '../shared/types';

/**
 * Resolve a copy label. `copy` is the whole Copy object shipped as data/copy.json;
 * every UI string in this client goes through here, so a new language or wording
 * never needs a code change. Missing keys degrade to the key itself (visible, never fatal).
 */
export function label(copy: Copy | null | undefined, key: string, lang: 'zh' | 'ja'): string {
  const entry = copy?.labels[key];
  if (!entry) return key;
  return entry[lang] || entry.zh || entry.ja || key;
}

import type { Language, ReversedProbability } from '../shared/types';

export interface UrlState {
  deck?: string;
  layout?: string;
  theme?: string;
  seed?: string;
  reversed?: ReversedProbability;
  lang?: Language;
  bilingual?: boolean;
}

const REVERSED_VALUES: ReversedProbability[] = [0, 25, 50];

export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const state: UrlState = {};

  for (const key of ['deck', 'layout', 'theme', 'seed'] as const) {
    const value = params.get(key);
    if (value) state[key] = value;
  }

  const reversed = params.get('reversed');
  if (reversed) {
    const numeric = Number(reversed);
    if ((REVERSED_VALUES as number[]).includes(numeric)) {
      state.reversed = numeric as ReversedProbability;
    }
  }

  const lang = params.get('lang');
  if (lang === 'zh' || lang === 'ja') state.lang = lang;

  const bilingual = params.get('bilingual');
  if (bilingual === '1') state.bilingual = true;
  else if (bilingual === '0') state.bilingual = false;

  return state;
}

export function buildUrl(state: UrlState, href: string): string {
  const url = new URL(href);
  const params = url.searchParams;
  const put = (key: string, value: string | undefined): void => {
    if (value) params.set(key, value);
    else params.delete(key);
  };

  put('deck', state.deck);
  put('layout', state.layout);
  put('theme', state.theme);
  put('seed', state.seed);
  put('reversed', state.reversed === undefined ? undefined : String(state.reversed));
  put('lang', state.lang);
  put('bilingual', state.bilingual === undefined ? undefined : state.bilingual ? '1' : '0');

  return url.toString();
}

/** Keep the address bar copy-pasteable without polluting browser history. */
export function writeUrlState(state: UrlState): void {
  if (typeof window === 'undefined') return;
  const next = buildUrl(state, window.location.href);
  if (next !== window.location.href) window.history.replaceState(null, '', next);
}

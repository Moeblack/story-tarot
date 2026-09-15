import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Copy, Language, Localized } from '../shared/types';
import { label } from './labels';
import { loc, locAlt } from './util';

export interface I18n {
  lang: Language;
  bilingual: boolean;
  setLang(lang: Language): void;
  setBilingual(value: boolean): void;
  /** Copy label by dotted key, e.g. `toolbar.draw`. */
  t(key: string): string;
  /** Primary-language text of a domain Localized value. */
  tx(value: Localized | undefined): string;
  /** Secondary-language text, empty when identical to the primary one. */
  ty(value: Localized | undefined): string;
}

const I18nContext = createContext<I18n | null>(null);

export interface I18nProviderProps {
  copy: Copy | null | undefined;
  lang: Language;
  bilingual: boolean;
  setLang(lang: Language): void;
  setBilingual(value: boolean): void;
  children: ReactNode;
}

export function I18nProvider({
  copy,
  lang,
  bilingual,
  setLang,
  setBilingual,
  children,
}: I18nProviderProps) {
  const value = useMemo<I18n>(
    () => ({
      lang,
      bilingual,
      setLang,
      setBilingual,
      t: (key: string) => label(copy, key, lang),
      tx: (localized) => loc(localized, lang),
      ty: (localized) => locAlt(localized, lang),
    }),
    [copy, lang, bilingual, setLang, setBilingual],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}

export interface BiProps {
  value: Localized | undefined;
  block?: boolean;
  className?: string;
}

/** Bilingual rendering: primary language always, secondary when 对照 mode is on. */
export function Bi({ value, block, className }: BiProps) {
  const { tx, ty, bilingual, lang } = useI18n();
  const primary = tx(value);
  const secondary = bilingual ? ty(value) : '';
  const secondaryLang = lang === 'zh' ? 'ja' : 'zh';
  if (!secondary) return <span className={className}>{primary}</span>;
  return (
    <span className={className}>
      {primary}
      <span className={block ? 'bi-alt bi-alt-block' : 'bi-alt'} lang={secondaryLang} data-lang={secondaryLang}>
        {block ? secondary : ` · ${secondary}`}
      </span>
    </span>
  );
}

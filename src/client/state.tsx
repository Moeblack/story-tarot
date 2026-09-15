import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, errorMessage } from './api';
import {
  downloadBlob,
  downloadText,
  resultToJson,
  resultToMarkdown,
  resultToPngBlob,
} from './export';
import { I18nProvider } from './i18n';
import { label } from './labels';
import { randomSeed } from './random';
import { applyTheme, resolvedColors } from './theme';
import { buildUrl, readUrlState, writeUrlState, type UrlState } from './url';
import type {
  Catalog,
  Deck,
  DrawResult,
  HistoryEntry,
  Language,
  Layout,
  ReversedProbability,
  Theme,
} from '../shared/types';

export type CatalogStatus = 'loading' | 'ready' | 'error';
export type ConceptKind = 'decks' | 'layouts' | 'themes';

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

export interface DrawOverride {
  seed?: string;
  deckId?: string;
  layoutId?: string;
}

export interface AppValue {
  status: CatalogStatus;
  catalog: Catalog | null;
  error: string | null;
  reload(): void;
  applyCatalog(next: Catalog): void;

  deckId: string;
  layoutId: string;
  themeId: string;
  setDeckId(id: string): void;
  setLayoutId(id: string): void;
  setThemeId(id: string): void;

  seed: string;
  setSeed(value: string): void;
  rerollSeed(): void;
  reversed: ReversedProbability;
  setReversed(value: ReversedProbability): void;

  result: DrawResult | null;
  drawing: boolean;
  drawError: string | null;
  draw(): void;
  clearDrawError(): void;
  reviewHistory(entry: HistoryEntry): void;

  revealed: boolean[];
  revealing: boolean;
  toggleReveal(index: number): void;
  revealAll(): void;
  hideAll(): void;

  lang: Language;
  setLang(value: Language): void;
  bilingual: boolean;
  setBilingual(value: boolean): void;

  deck: Deck | undefined;
  layout: Layout | undefined;
  theme: Theme | undefined;

  history: HistoryEntry[];
  historyLoading: boolean;
  refreshHistory(): void;
  removeHistory(id: string): void;
  clearHistory(): void;

  shareUrl: string;

  exportJson(): void;
  exportMarkdown(): void;
  exportPng(): void;

  toast: Toast | null;
  notify(text: string, kind?: 'info' | 'error'): void;

  isCustom(kind: ConceptKind, id: string): boolean;
}

const REVEAL_INTERVAL_MS = 300;

const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initialUrl = useRef<UrlState>(
    readUrlState(typeof window === 'undefined' ? '' : window.location.search),
  ).current;

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const [deckId, setDeckId] = useState(initialUrl.deck ?? '');
  const [layoutId, setLayoutId] = useState(initialUrl.layout ?? '');
  const [themeId, setThemeId] = useState(initialUrl.theme ?? '');

  const [seed, setSeed] = useState(initialUrl.seed ?? '');
  const [reversed, setReversed] = useState<ReversedProbability>(initialUrl.reversed ?? 50);
  const [lang, setLang] = useState<Language>(initialUrl.lang ?? 'zh');
  const [bilingual, setBilingual] = useState(initialUrl.bilingual ?? true);

  const [result, setResult] = useState<DrawResult | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [revealing, setRevealing] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toastSeq = useRef(0);

  const notify = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, text, kind });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const t = useCallback((key: string) => label(catalog?.copy, key, lang), [catalog, lang]);

  const deck = useMemo(
    () => catalog?.decks.find((item) => item.id === deckId),
    [catalog, deckId],
  );
  const layout = useMemo(
    () => catalog?.layouts.find((item) => item.id === layoutId),
    [catalog, layoutId],
  );
  const theme = useMemo(
    () => catalog?.themes.find((item) => item.id === themeId),
    [catalog, themeId],
  );

  const loadCatalog = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setCatalog(await api.catalog());
      setStatus('ready');
    } catch (cause) {
      setError(errorMessage(cause));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const reload = useCallback(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // Keep selections valid whenever the catalog changes (new/removed custom concepts).
  useEffect(() => {
    if (!catalog) return;
    setDeckId((prev) => (prev && catalog.decks.some((item) => item.id === prev) ? prev : catalog.defaults.deck));
    setLayoutId((prev) => (prev && catalog.layouts.some((item) => item.id === prev) ? prev : catalog.defaults.layout));
    setThemeId((prev) => (prev && catalog.themes.some((item) => item.id === prev) ? prev : catalog.defaults.theme));
  }, [catalog]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await api.history());
    } catch (cause) {
      notify(errorMessage(cause), 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const revealTimer = useRef<number | null>(null);

  const stopReveal = useCallback(() => {
    if (revealTimer.current !== null) {
      window.clearInterval(revealTimer.current);
      revealTimer.current = null;
    }
    setRevealing(false);
  }, []);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) window.clearInterval(revealTimer.current);
    },
    [],
  );

  const playReveal = useCallback(
    (count: number) => {
      stopReveal();
      setRevealed(new Array(Math.max(0, count)).fill(false));
      if (count <= 0) return;
      setRevealing(true);
      let shown = 0;
      revealTimer.current = window.setInterval(() => {
        shown += 1;
        setRevealed((prev) => {
          if (shown > prev.length) return prev;
          const next = prev.slice();
          next[shown - 1] = true;
          return next;
        });
        if (shown >= count) stopReveal();
      }, REVEAL_INTERVAL_MS);
    },
    [stopReveal],
  );

  const toggleReveal = useCallback((index: number) => {
    setRevealed((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.slice();
      next[index] = !next[index];
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    stopReveal();
    setRevealed((prev) => prev.map(() => true));
  }, [stopReveal]);

  const hideAll = useCallback(() => {
    stopReveal();
    setRevealed((prev) => prev.map(() => false));
  }, [stopReveal]);

  const current = useRef({ deckId, layoutId, seed, reversed });
  current.current = { deckId, layoutId, seed, reversed };

  const performDraw = useCallback(
    async (override?: DrawOverride) => {
      const snapshot = current.current;
      const useDeck = override?.deckId ?? snapshot.deckId;
      const useLayout = override?.layoutId ?? snapshot.layoutId;
      if (!useDeck || !useLayout) {
        notify(t('error.draw'), 'error');
        return;
      }
      const finalSeed = (override?.seed ?? snapshot.seed).trim() || randomSeed();
      setSeed(finalSeed);
      setDrawing(true);
      setDrawError(null);
      try {
        const next = await api.draw({
          deck: useDeck,
          layout: useLayout,
          seed: finalSeed,
          reversed: snapshot.reversed,
        });
        setResult(next);
        playReveal(next.cards.length);
        try {
          const entry = await api.addHistory(next);
          setHistory((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
        } catch (cause) {
          notify(errorMessage(cause), 'error');
        }
      } catch (cause) {
        setDrawError(errorMessage(cause));
      } finally {
        setDrawing(false);
      }
    },
    [notify, playReveal, t],
  );

  const draw = useCallback(() => {
    void performDraw();
  }, [performDraw]);

  // A shared link carries a seed: reproduce that exact spread on first load.
  const initialDrawDone = useRef(false);
  useEffect(() => {
    if (!catalog || status !== 'ready' || initialDrawDone.current) return;
    if (!initialUrl.seed || !deckId || !layoutId) return;
    initialDrawDone.current = true;
    void performDraw({ seed: initialUrl.seed });
  }, [catalog, status, deckId, layoutId, initialUrl, performDraw]);

  const clearDrawError = useCallback(() => setDrawError(null), []);

  const rerollSeed = useCallback(() => {
    const next = randomSeed();
    setSeed(next);
  }, []);

  const reviewHistory = useCallback(
    (entry: HistoryEntry) => {
      stopReveal();
      setResult(entry.result);
      setRevealed(entry.result.cards.map(() => true));
      setSeed(entry.result.seed);
      setReversed(entry.result.reversedProbability);
      setDeckId(entry.result.deckId);
      setLayoutId(entry.result.layoutId);
      setDrawError(null);
    },
    [stopReveal],
  );

  const removeHistory = useCallback(
    async (id: string) => {
      try {
        await api.deleteHistory(id);
        setHistory((prev) => prev.filter((item) => item.id !== id));
        notify(`${t('history.delete')} ✓`);
      } catch (cause) {
        notify(errorMessage(cause), 'error');
      }
    },
    [notify, t],
  );

  const clearHistory = useCallback(async () => {
    try {
      await api.clearHistory();
      setHistory([]);
      notify(`${t('history.clear')} ✓`);
    } catch (cause) {
      notify(errorMessage(cause), 'error');
    }
  }, [notify, t]);

  // Keep the address bar shareable; the same effect is what makes a pasted link reproducible.
  useEffect(() => {
    if (status !== 'ready') return;
    writeUrlState({
      deck: deckId || undefined,
      layout: layoutId || undefined,
      theme: themeId || undefined,
      seed: result?.seed || seed || undefined,
      reversed,
      lang,
      bilingual,
    });
  }, [status, deckId, layoutId, themeId, seed, result, reversed, lang, bilingual]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return buildUrl(
      {
        deck: deckId || undefined,
        layout: layoutId || undefined,
        theme: themeId || undefined,
        seed: result?.seed || seed || undefined,
        reversed,
        lang,
        bilingual,
      },
      window.location.href,
    );
  }, [deckId, layoutId, themeId, seed, result, reversed, lang, bilingual]);

  const exportJson = useCallback(() => {
    if (!result) return;
    downloadText(resultToJson(result), `story-tarot-${result.seed}.json`, 'application/json');
  }, [result]);

  const exportMarkdown = useCallback(() => {
    if (!result) return;
    const markdown = resultToMarkdown(result, { lang, bilingual, t });
    downloadText(markdown, `story-tarot-${result.seed}.md`, 'text/markdown');
  }, [result, lang, bilingual, t]);

  const exportPng = useCallback(() => {
    if (!result) return;
    void resultToPngBlob(result, { lang, bilingual, t, theme: resolvedColors(theme?.colors) })
      .then((blob) => downloadBlob(blob, `story-tarot-${result.seed}.png`))
      .catch((cause) => notify(errorMessage(cause), 'error'));
  }, [result, lang, bilingual, t, theme, notify]);

  const isCustom = useCallback(
    (kind: ConceptKind, id: string) => Boolean(catalog?.customIds[kind]?.includes(id)),
    [catalog],
  );

  const applyCatalog = useCallback((next: Catalog) => {
    setCatalog(next);
    setStatus('ready');
    setError(null);
  }, []);

  const value: AppValue = {
    status,
    catalog,
    error,
    reload,
    applyCatalog,
    deckId,
    layoutId,
    themeId,
    setDeckId,
    setLayoutId,
    setThemeId,
    seed,
    setSeed,
    rerollSeed,
    reversed,
    setReversed,
    result,
    drawing,
    drawError,
    draw,
    clearDrawError,
    reviewHistory,
    revealed,
    revealing,
    toggleReveal,
    revealAll,
    hideAll,
    lang,
    setLang,
    bilingual,
    setBilingual,
    deck,
    layout,
    theme,
    history,
    historyLoading,
    refreshHistory,
    removeHistory,
    clearHistory,
    shareUrl,
    exportJson,
    exportMarkdown,
    exportPng,
    toast,
    notify,
    isCustom,
  };

  return (
    <AppContext.Provider value={value}>
      <I18nProvider
        copy={catalog?.copy}
        lang={lang}
        bilingual={bilingual}
        setLang={setLang}
        setBilingual={setBilingual}
      >
        {children}
      </I18nProvider>
    </AppContext.Provider>
  );
}

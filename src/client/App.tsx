import { useState } from 'react';
import { CardTable } from './components/CardTable';
import { ConceptEditor } from './components/ConceptEditor';
import { ExportPanel } from './components/ExportPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { ReadingPanel } from './components/ReadingPanel';
import { ErrorPane, Spinner, Toaster } from './components/Status';
import { Toolbar } from './components/Toolbar';
import { useI18n } from './i18n';
import { useApp } from './state';
import { cx } from './util';

export function App() {
  const app = useApp();
  const { t, lang, setLang, bilingual, setBilingual } = useI18n();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="app-title">{t('app.title')}</h1>
          <p className="app-subtitle">{t('app.subtitle')}</p>
        </div>

        <div className="app-header-actions">
          <div className="segmented" role="group" aria-label={t('toolbar.language')}>
            <button
              type="button"
              className={cx('segment', lang === 'zh' && 'is-active')}
              aria-pressed={lang === 'zh'}
              onClick={() => setLang('zh')}
            >
              {t('common.zh')}
            </button>
            <button
              type="button"
              className={cx('segment', lang === 'ja' && 'is-active')}
              aria-pressed={lang === 'ja'}
              onClick={() => setLang('ja')}
            >
              {t('common.ja')}
            </button>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={bilingual}
              onChange={(event) => setBilingual(event.target.checked)}
            />
            <span>{t('toolbar.bilingual')}</span>
          </label>

          <button type="button" className="button" onClick={() => setHistoryOpen(true)}>
            {t('history.title')}
            {app.history.length > 0 ? ` (${app.history.length})` : ''}
          </button>

          <button type="button" className="button" onClick={() => setEditorOpen(true)}>
            {t('concepts.open')}
          </button>
        </div>
      </header>

      {app.status === 'loading' ? <Spinner label={t('common.loading')} /> : null}

      {app.status === 'error' ? <ErrorPane message={app.error ?? t('error.load')} onRetry={app.reload} /> : null}

      {app.status === 'ready' ? (
        <>
          <Toolbar />
          <main className="app-main">
            <div className="app-stage">
              <CardTable />
              <ReadingPanel />
            </div>
            <ExportPanel />
          </main>
        </>
      ) : null}

      {historyOpen ? <HistoryPanel onClose={() => setHistoryOpen(false)} /> : null}
      {editorOpen ? <ConceptEditor onClose={() => setEditorOpen(false)} /> : null}

      <Toaster />
    </div>
  );
}

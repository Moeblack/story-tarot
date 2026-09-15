import { useState } from 'react';
import { errorMessage } from '../api';
import { copyToClipboard } from '../export';
import { useI18n } from '../i18n';
import { useApp } from '../state';
import { loc } from '../util';

export function ExportPanel() {
  const app = useApp();
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);

  const customInvolved =
    Boolean(app.result) &&
    (app.isCustom('decks', app.result?.deckId ?? '') ||
      app.isCustom('layouts', app.result?.layoutId ?? '') ||
      app.isCustom('interpretations', app.result?.interpretationId ?? ''));

  const share = async (): Promise<void> => {
    try {
      await copyToClipboard(app.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
      app.notify(t('share.copied'));
    } catch (cause) {
      app.notify(`${t('error.clipboard')}: ${errorMessage(cause)}`, 'error');
    }
  };

  return (
    <section className="side-panel">
      <h2 className="panel-title">{t('export.title')}</h2>

      <div className="button-row">
        <button type="button" className="button" disabled={!app.result} onClick={app.exportJson}>
          {t('export.json')}
        </button>
        <button type="button" className="button" disabled={!app.result} onClick={app.exportMarkdown}>
          {t('export.markdown')}
        </button>
        <button type="button" className="button" disabled={!app.result} onClick={app.exportPng}>
          {t('export.png')}
        </button>
      </div>

      {!app.result ? <p className="panel-hint">{t('export.empty')}</p> : null}

      <h2 className="panel-title">{t('share.title')}</h2>
      <div className="share-box">
        <textarea className="share-url" readOnly rows={3} value={app.shareUrl} onFocus={(e) => e.target.select()} />
        <div className="button-row">
          <button type="button" className="button is-primary" onClick={() => void share()}>
            {copied ? t('share.copied') : t('share.copyLink')}
          </button>
        </div>
        <p className="panel-hint">{t('share.hint')}</p>
        {customInvolved ? (
          <p className="panel-warning">
            {t('share.customWarning')}
            {app.result ? (
              <span className="panel-warning-ids">
                {loc(app.result.deckName, lang)} / {loc(app.result.layoutName, lang)} (
                <code>{app.result.deckId}</code>, <code>{app.result.layoutId}</code>)
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}

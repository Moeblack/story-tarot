import type { Localized, ReversedProbability } from '../../shared/types';
import { useI18n } from '../i18n';
import { useApp } from '../state';
import { cx, loc, locAlt } from '../util';

const REVERSED_OPTIONS: ReversedProbability[] = [0, 25, 50];

export function Toolbar() {
  const app = useApp();
  const { t, lang, bilingual } = useI18n();
  const { catalog } = app;

  const nameOf = (name: Localized | undefined): string => {
    const primary = loc(name, lang);
    const secondary = bilingual ? locAlt(name, lang) : '';
    return secondary ? `${primary} · ${secondary}` : primary;
  };

  const decorate = (text: string, custom: boolean): string => (custom ? `★ ${text}` : text);

  return (
    <section className="toolbar">
      <div className="toolbar-group">
        <label className="toolbar-field">
          <span className="toolbar-label">{t('toolbar.deck')}</span>
          <select
            value={app.deckId}
            disabled={!catalog}
            onChange={(event) => app.setDeckId(event.target.value)}
          >
            {catalog?.decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {decorate(nameOf(deck.name), app.isCustom('decks', deck.id))}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-field">
          <span className="toolbar-label">{t('toolbar.layout')}</span>
          <select
            value={app.layoutId}
            disabled={!catalog}
            onChange={(event) => app.setLayoutId(event.target.value)}
          >
            {catalog?.layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {decorate(nameOf(layout.name), app.isCustom('layouts', layout.id))}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-field">
          <span className="toolbar-label">{t('toolbar.interpretation')}</span>
          <select
            value={app.interpretationId}
            disabled={!catalog}
            onChange={(event) => app.setInterpretationId(event.target.value)}
          >
            {catalog?.interpretations.map((interpretation) => (
              <option key={interpretation.id} value={interpretation.id}>
                {decorate(nameOf(interpretation.name), app.isCustom('interpretations', interpretation.id))}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-field">
          <span className="toolbar-label">{t('toolbar.theme')}</span>
          <select
            value={app.themeId}
            disabled={!catalog}
            onChange={(event) => app.setThemeId(event.target.value)}
          >
            {catalog?.themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {decorate(nameOf(theme.name), app.isCustom('themes', theme.id))}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-field is-seed">
          <span className="toolbar-label">{t('toolbar.seed')}</span>
          <span className="seed-row">
            <input
              className="seed-input"
              value={app.seed}
              placeholder={t('toolbar.seedPlaceholder')}
              spellCheck={false}
              onChange={(event) => app.setSeed(event.target.value)}
            />
            <button type="button" className="button" onClick={app.rerollSeed}>
              {t('toolbar.randomSeed')}
            </button>
          </span>
        </label>

        <div className="toolbar-field is-reversed">
          <span className="toolbar-label">{t('toolbar.reversed')}</span>
          <div className="segmented" role="group">
            {REVERSED_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={cx('segment', app.reversed === value && 'is-active')}
                aria-pressed={app.reversed === value}
                onClick={() => app.setReversed(value)}
              >
                {t(
                  value === 0 ? 'toolbar.reversed0' : value === 25 ? 'toolbar.reversed25' : 'toolbar.reversed50',
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="button is-primary is-draw"
          disabled={app.drawing || !app.deckId || !app.layoutId}
          onClick={app.draw}
        >
          {app.drawing ? t('common.loading') : app.result ? t('toolbar.redraw') : t('toolbar.draw')}
        </button>
      </div>
    </section>
  );
}

import { Bi, useI18n } from '../i18n';
import { useApp } from '../state';
import { cx } from '../util';
import { EmptyState } from './Status';

/**
 * 解读面板只列事实：位置、正逆、词。
 * 牌面上没有释义与问句，这里也不补——联想由使用者自己做。
 */
export function ReadingPanel() {
  const app = useApp();
  const { t } = useI18n();
  const { result } = app;

  const uprightLabel = t('table.uprightBadge');
  const reversedLabel = t('table.reversedBadge');

  if (!result) {
    return (
      <section className="reading-panel">
        <EmptyState title={t('reading.empty')} hint={t('table.emptyHint')} />
      </section>
    );
  }

  return (
    <section className="reading-panel">
      <header className="panel-head">
        <h2 className="panel-title">{t('reading.title')}</h2>
        <span className="chip">
          {result.cards.length} {t('history.cards')}
        </span>
      </header>

      <ol className="reading-list">
        {result.cards.map((drawn, index) => {
          const card = drawn.card;
          const orientationLabel = drawn.reversed ? reversedLabel : uprightLabel;
          return (
            <li
              className={cx('reading-entry', drawn.reversed && 'is-reversed')}
              key={`${drawn.slot.id}-${index}`}
            >
              <header className="reading-head">
                <span className="reading-index">{index + 1}</span>
                <span className="reading-slot">
                  <Bi value={drawn.slot.label} />
                </span>
                <span className={cx('reading-orientation', drawn.reversed && 'is-reversed')}>
                  {orientationLabel}
                </span>
                <span className="reading-word">
                  <Bi value={card.word} />
                  {card.symbol ? <span className="reading-symbol">{card.symbol}</span> : null}
                </span>
                <span className="reading-order">#{drawn.slot.order}</span>
              </header>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

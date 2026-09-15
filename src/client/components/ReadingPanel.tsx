import { Bi, useI18n } from '../i18n';
import { useApp } from '../state';
import { cx } from '../util';
import { EmptyState } from './Status';

export function ReadingPanel() {
  const app = useApp();
  const { t, tx } = useI18n();
  const { result, catalog } = app;

  const interpretation =
    catalog?.interpretations.find((item) => item.id === result?.interpretationId) ?? app.interpretation;
  const uprightLabel = tx(interpretation?.orientations.upright) || t('table.uprightBadge');
  const reversedLabel = tx(interpretation?.orientations.reversed) || t('table.reversedBadge');

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
          const meaning = drawn.reversed ? card.reversed : card.upright;
          const cardQuestion = drawn.reversed ? card.questions.reversed : card.questions.upright;
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

              <dl className="reading-fields">
                <dt>{t('table.slotMeaning')}</dt>
                <dd>
                  <Bi value={drawn.slot.meaning} />
                </dd>

                <dt>{t('reading.cardMeaning')}</dt>
                <dd>
                  <Bi value={meaning} />
                </dd>

                {drawn.slot.question ? (
                  <>
                    <dt>{t('table.slotQuestion')}</dt>
                    <dd>
                      <Bi value={drawn.slot.question} />
                    </dd>
                  </>
                ) : null}

                <dt>{t('reading.cardQuestion')}</dt>
                <dd>
                  <Bi value={cardQuestion} />
                </dd>

                <dt>{t('reading.prompt')}</dt>
                <dd className="reading-prompt">
                  <Bi value={drawn.prompt} block />
                </dd>
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import { useMemo } from 'react';
import { computeGrid } from '../grid';
import { Bi, useI18n } from '../i18n';
import { useApp } from '../state';
import { CardView } from './CardView';
import { EmptyState, ErrorPane } from './Status';

export function CardTable() {
  const app = useApp();
  const { t, tx } = useI18n();
  const { result, catalog } = app;

  const grid = useMemo(() => computeGrid(result?.cards.map((drawn) => drawn.slot) ?? []), [result]);

  const interpretation =
    catalog?.interpretations.find((item) => item.id === result?.interpretationId) ?? app.interpretation;
  const uprightLabel = tx(interpretation?.orientations.upright) || t('table.uprightBadge');
  const reversedLabel = tx(interpretation?.orientations.reversed) || t('table.reversedBadge');

  if (app.drawError) {
    return <ErrorPane message={app.drawError} onRetry={app.draw} />;
  }

  if (!result) {
    return (
      <section className="table-panel">
        <EmptyState icon="🃏" title={t('table.empty')} hint={t('table.emptyHint')} />
      </section>
    );
  }

  return (
    <section className="table-panel">
      <header className="panel-head">
        <div className="panel-heading">
          <h2 className="panel-title">
            <Bi value={result.deckName} /> · <Bi value={result.layoutName} />
          </h2>
          <p className="panel-sub">
            <span className="chip">
              {t('toolbar.seed')}: <code>{result.seed}</code>
            </span>
            <span className="chip">
              {t('toolbar.reversed')}: {result.reversedProbability}%
            </span>
            <span className="chip">{t('table.generated')}</span>
          </p>
        </div>
        <div className="panel-actions">
          <button type="button" className="button" onClick={app.revealAll}>
            {t('table.revealAll')}
          </button>
          <button type="button" className="button" onClick={app.hideAll}>
            {t('table.hideAll')}
          </button>
        </div>
      </header>

      <div className="table-scroll">
        <div
          className="table"
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, var(--card-w))`,
            gridTemplateRows: `repeat(${grid.rows}, auto)`,
          }}
        >
          {result.cards.map((drawn, index) => (
            <CardView
              key={`${drawn.slot.id}-${index}`}
              drawn={drawn}
              index={index}
              revealed={Boolean(app.revealed[index])}
              onToggle={app.toggleReveal}
              uprightLabel={uprightLabel}
              reversedLabel={reversedLabel}
              style={{ gridColumn: grid.col(drawn.slot.x), gridRow: grid.row(drawn.slot.y) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

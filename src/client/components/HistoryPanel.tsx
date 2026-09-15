import { useI18n } from '../i18n';
import { useApp } from '../state';
import { cx, formatDateTime, loc } from '../util';
import { Modal } from './Modal';
import { EmptyState, Spinner } from './Status';

export interface HistoryPanelProps {
  onClose(): void;
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const app = useApp();
  const { t, lang } = useI18n();

  return (
    <Modal
      title={t('history.title')}
      onClose={onClose}
      wide
      footer={
        <div className="button-row">
          <button
            type="button"
            className="button is-danger"
            disabled={app.history.length === 0}
            onClick={() => {
              if (window.confirm(t('history.clearConfirm'))) void app.clearHistory();
            }}
          >
            {t('history.clear')}
          </button>
          <button type="button" className="button" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      }
    >
      {app.historyLoading && app.history.length === 0 ? (
        <Spinner label={t('common.loading')} />
      ) : app.history.length === 0 ? (
        <EmptyState title={t('history.empty')} hint={t('table.emptyHint')} />
      ) : (
        <ul className="history-list">
          {app.history.map((entry) => (
            <li className="history-entry" key={entry.id}>
              <div className="history-entry-head">
                <span className="history-time">{formatDateTime(entry.drawnAt, lang)}</span>
                <span className="chip">
                  {t('history.seed')}: <code>{entry.result.seed}</code>
                </span>
                <span className="chip">{entry.result.reversedProbability}%</span>
                {app.isCustom('decks', entry.result.deckId) ? (
                  <span className="chip is-custom">{t('concepts.customBadge')}</span>
                ) : null}
              </div>

              <p className="history-line">
                <strong>
                  {loc(entry.result.deckName, lang)} · {loc(entry.result.layoutName, lang)}
                </strong>
              </p>

              <ul className="history-cards">
                {entry.result.cards.map((drawn, index) => (
                  <li
                    className={cx('history-card', drawn.reversed && 'is-reversed')}
                    key={`${entry.id}-${index}`}
                  >
                    <span className="history-card-slot">{loc(drawn.slot.label, lang)}</span>
                    <span className="history-card-word">{loc(drawn.card.word, lang)}</span>
                    <span className="history-card-orientation">
                      {t(drawn.reversed ? 'table.reversedBadge' : 'table.uprightBadge')}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="button-row">
                <button
                  type="button"
                  className="button is-primary"
                  onClick={() => {
                    app.reviewHistory(entry);
                    onClose();
                  }}
                >
                  {t('history.review')}
                </button>
                <button
                  type="button"
                  className="button is-danger"
                  onClick={() => {
                    if (window.confirm(t('history.deleteConfirm'))) {
                      void app.removeHistory(entry.id);
                    }
                  }}
                >
                  {t('history.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

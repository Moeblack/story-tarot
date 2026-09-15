import type { CSSProperties } from 'react';
import type { DrawnCard } from '../../shared/types';
import { Bi, useI18n } from '../i18n';
import { cx } from '../util';

export interface CardViewProps {
  drawn: DrawnCard;
  index: number;
  revealed: boolean;
  onToggle(index: number): void;
  style: CSSProperties;
  reversedLabel: string;
  uprightLabel: string;
}

/**
 * One card on the table. Click flips it; reversed cards keep the word rotated
 * 180° and carry an explicit badge so it is unmistakable at a glance.
 */
export function CardView({
  drawn,
  index,
  revealed,
  onToggle,
  style,
  reversedLabel,
  uprightLabel,
}: CardViewProps) {
  const { t } = useI18n();
  const orientationLabel = drawn.reversed ? reversedLabel : uprightLabel;

  return (
    <div className={cx('table-cell', revealed && 'is-revealed', drawn.reversed && 'is-reversed')} style={style}>
      <button
        type="button"
        className="card"
        onClick={() => onToggle(index)}
        aria-pressed={revealed}
        aria-label={`${index + 1}. ${drawn.card.word.zh || drawn.card.word.ja}`}
      >
        <span className="card-inner">
          <span className="card-face card-back" aria-hidden={revealed}>
            <span className="card-back-mark">{drawn.card.symbol || '✦'}</span>
            <span className="card-back-index">{index + 1}</span>
          </span>
          <span className="card-face card-front">
            <span className="card-head">
              <span className="card-index">{index + 1}</span>
              <span className="card-slot"><Bi value={drawn.slot.label} /></span>
            </span>
            <span className="card-body">
              <span className={cx('card-word', drawn.reversed && 'is-rotated')}>
                <Bi value={drawn.card.word} block />
              </span>
            </span>
            <span className="card-foot">
              <span className={cx('card-badge', drawn.reversed && 'is-reversed')}>{orientationLabel}</span>
              {drawn.card.symbol ? <span className="card-symbol">{drawn.card.symbol}</span> : null}
            </span>
          </span>
        </span>
      </button>
      <p className="table-caption">
        <span className="table-caption-index">{index + 1}</span>
        <Bi value={drawn.slot.label} />
        <span className="table-caption-hint">{t('table.clickHint')}</span>
      </p>
    </div>
  );
}

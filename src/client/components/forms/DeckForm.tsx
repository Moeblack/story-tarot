import { useState } from 'react';
import type { Card, Deck } from '../../../shared/types';
import { emptyCard } from '../../concepts';
import { useI18n } from '../../i18n';
import { uniqueId } from '../../random';
import { Accordion, LocalizedField, TextField } from '../Fields';

export interface DeckFormProps {
  value: Deck;
  onChange(next: Deck): void;
}

export function DeckForm({ value, onChange }: DeckFormProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set<number>());

  const toggle = (index: number): void => {
    const next = new Set(open);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpen(next);
  };

  const updateCard = (index: number, card: Card): void => {
    onChange({ ...value, cards: value.cards.map((item, i) => (i === index ? card : item)) });
  };

  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= value.cards.length) return;
    const cards = value.cards.slice();
    const [item] = cards.splice(index, 1);
    cards.splice(target, 0, item);
    onChange({ ...value, cards });
  };

  const addCard = (): void => {
    const id = uniqueId(`${value.id}-card`, value.cards.map((card) => card.id));
    onChange({ ...value, cards: [...value.cards, emptyCard(id)] });
  };

  const removeCard = (index: number): void => {
    onChange({ ...value, cards: value.cards.filter((_, i) => i !== index) });
  };

  return (
    <div className="concept-form">
      <div className="form-section">
        <TextField label={t('concepts.id')} value={value.id} mono onChange={(id) => onChange({ ...value, id })} />
        <LocalizedField label={t('concepts.name')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
        <LocalizedField
          label={t('concepts.description')}
          value={value.description}
          rows={3}
          onChange={(description) => onChange({ ...value, description })}
        />
      </div>

      <div className="form-section">
        <header className="form-section-head">
          <h3>
            {t('concepts.card')} · {value.cards.length}
          </h3>
          <button type="button" className="button" onClick={addCard}>
            + {t('concepts.cardAdd')}
          </button>
        </header>

        {value.cards.map((card, index) => (
          <Accordion
            key={`${card.id}-${index}`}
            open={open.has(index)}
            onToggle={() => toggle(index)}
            title={
              <>
                <span className="index-badge">{index + 1}</span>
                <span className="accordion-word">{card.word.zh || card.word.ja || t('common.untitled')}</span>
              </>
            }
            meta={card.symbol ? <span className="mono">{card.symbol}</span> : null}
            actions={
              <>
                <button
                  type="button"
                  className="icon-button"
                  title={t('concepts.moveUp')}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  title={t('concepts.moveDown')}
                  onClick={() => move(index, 1)}
                  disabled={index === value.cards.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button is-danger"
                  title={t('concepts.cardRemove')}
                  onClick={() => removeCard(index)}
                >
                  ✕
                </button>
              </>
            }
          >
            <div className="form-grid">
              <TextField
                label={t('concepts.id')}
                value={card.id}
                mono
                onChange={(id) => updateCard(index, { ...card, id })}
              />
              <LocalizedField
                label={t('concepts.word')}
                value={card.word}
                onChange={(word) => updateCard(index, { ...card, word })}
              />
              <TextField
                label={t('concepts.symbol')}
                value={card.symbol ?? ''}
                onChange={(symbol) => updateCard(index, { ...card, symbol })}
              />
            </div>

            <div className="form-grid">
              <LocalizedField
                label={t('concepts.upright')}
                value={card.upright}
                rows={2}
                onChange={(upright) => updateCard(index, { ...card, upright })}
              />
              <LocalizedField
                label={t('concepts.reversed')}
                value={card.reversed}
                rows={2}
                onChange={(reversed) => updateCard(index, { ...card, reversed })}
              />
            </div>

            <div className="form-grid">
              <LocalizedField
                label={`${t('concepts.question')} · ${t('concepts.upright')}`}
                value={card.questions.upright}
                rows={2}
                onChange={(question) =>
                  updateCard(index, { ...card, questions: { ...card.questions, upright: question } })
                }
              />
              <LocalizedField
                label={`${t('concepts.question')} · ${t('concepts.reversed')}`}
                value={card.questions.reversed}
                rows={2}
                onChange={(question) =>
                  updateCard(index, { ...card, questions: { ...card.questions, reversed: question } })
                }
              />
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

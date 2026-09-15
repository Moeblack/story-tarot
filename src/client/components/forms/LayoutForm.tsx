import { useMemo, useState } from 'react';
import type { Layout, Slot } from '../../../shared/types';
import { emptySlot } from '../../concepts';
import { computeGrid } from '../../grid';
import { useI18n } from '../../i18n';
import { uniqueId } from '../../random';
import { Accordion, LocalizedField, NumberField, TextField } from '../Fields';

export interface LayoutFormProps {
  value: Layout;
  onChange(next: Layout): void;
}

export function LayoutForm({ value, onChange }: LayoutFormProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set<number>());
  const grid = useMemo(() => computeGrid(value.slots), [value.slots]);

  const toggle = (index: number): void => {
    const next = new Set(open);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setOpen(next);
  };

  const updateSlot = (index: number, slot: Slot): void => {
    onChange({ ...value, slots: value.slots.map((item, i) => (i === index ? slot : item)) });
  };

  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= value.slots.length) return;
    const slots = value.slots.slice();
    const [item] = slots.splice(index, 1);
    slots.splice(target, 0, item);
    onChange({ ...value, slots });
  };

  const addSlot = (): void => {
    const id = uniqueId(`${value.id}-slot`, value.slots.map((slot) => slot.id));
    const order = value.slots.reduce((max, slot) => Math.max(max, slot.order), 0) + 1;
    const x = Math.min(value.slots.length + 1, 4);
    onChange({ ...value, slots: [...value.slots, emptySlot(id, order, x, 1)] });
  };

  const removeSlot = (index: number): void => {
    onChange({ ...value, slots: value.slots.filter((_, i) => i !== index) });
  };

  return (
    <div className="concept-form">
      <div className="form-section">
        <TextField label={t('concepts.id')} value={value.id} mono onChange={(id) => onChange({ ...value, id })} />
        <LocalizedField label={t('concepts.name')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
        <LocalizedField
          label={t('concepts.description')}
          value={value.description}
          rows={2}
          onChange={(description) => onChange({ ...value, description })}
        />
      </div>

      <div className="form-section">
        <h3 className="form-section-title">{t('concepts.x')} / {t('concepts.y')}</h3>
        <div className="layout-preview" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(56px, 1fr))` }}>
          {value.slots.map((slot, index) => (
            <div
              className="layout-preview-slot"
              key={`${slot.id}-${index}`}
              style={{ gridColumn: grid.col(slot.x), gridRow: grid.row(slot.y) }}
            >
              <span className="layout-preview-order">{slot.order}</span>
              <span className="layout-preview-label">
                {slot.label.zh || slot.label.ja || `${t('concepts.slot')} ${index + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <header className="form-section-head">
          <h3>
            {t('concepts.slot')} · {value.slots.length}
          </h3>
          <button type="button" className="button" onClick={addSlot}>
            + {t('concepts.slotAdd')}
          </button>
        </header>

        {value.slots.map((slot, index) => (
          <Accordion
            key={`${slot.id}-${index}`}
            open={open.has(index)}
            onToggle={() => toggle(index)}
            title={
              <>
                <span className="index-badge">{slot.order}</span>
                <span className="accordion-word">{slot.label.zh || slot.label.ja || t('common.untitled')}</span>
              </>
            }
            meta={
              <span className="mono">
                x{slot.x} · y{slot.y}
              </span>
            }
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
                  disabled={index === value.slots.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button is-danger"
                  title={t('concepts.slotRemove')}
                  onClick={() => removeSlot(index)}
                >
                  ✕
                </button>
              </>
            }
          >
            <div className="form-grid">
              <TextField
                label={t('concepts.id')}
                value={slot.id}
                mono
                onChange={(id) => updateSlot(index, { ...slot, id })}
              />
              <NumberField
                label={t('concepts.order')}
                value={slot.order}
                onChange={(order) => updateSlot(index, { ...slot, order })}
              />
              <NumberField label={t('concepts.x')} value={slot.x} onChange={(x) => updateSlot(index, { ...slot, x })} />
              <NumberField label={t('concepts.y')} value={slot.y} onChange={(y) => updateSlot(index, { ...slot, y })} />
            </div>

            <LocalizedField
              label={t('concepts.label')}
              value={slot.label}
              onChange={(label) => updateSlot(index, { ...slot, label })}
            />
            <LocalizedField
              label={t('concepts.meaning')}
              value={slot.meaning}
              rows={2}
              onChange={(meaning) => updateSlot(index, { ...slot, meaning })}
            />
            <LocalizedField
              label={`${t('concepts.question')}（${t('common.optional')}）`}
              value={slot.question ?? { zh: '', ja: '' }}
              rows={2}
              onChange={(question) => updateSlot(index, { ...slot, question })}
            />
          </Accordion>
        ))}
      </div>
    </div>
  );
}

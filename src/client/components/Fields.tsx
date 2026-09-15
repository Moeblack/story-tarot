import { useEffect, useState, type ReactNode } from 'react';
import type { Localized } from '../../shared/types';
import { errorMessage } from '../api';
import { useI18n } from '../i18n';
import { cx } from '../util';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
}

export function TextField({ label, value, onChange, placeholder, mono, type }: TextFieldProps) {
  return (
    <label className={cx('field', mono && 'is-mono')}>
      <span className="field-label">{label}</span>
      <input
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange(value: number): void;
  step?: number;
  min?: number;
}

export function NumberField({ label, value, onChange, step, min }: NumberFieldProps) {
  return (
    <label className="field is-number">
      <span className="field-label">{label}</span>
      <input
        type="number"
        step={step ?? 1}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
      />
    </label>
  );
}

export interface LocalizedFieldProps {
  label: string;
  value: Localized;
  onChange(next: Localized): void;
  rows?: number;
  placeholder?: string;
}

/** One label, two language inputs — every domain string in this app is bilingual. */
export function LocalizedField({ label, value, onChange, rows, placeholder }: LocalizedFieldProps) {
  const { t } = useI18n();
  return (
    <div className="field field-localized">
      <span className="field-label">{label}</span>
      <div className="field-pair">
        <label className="field-sub">
          <span className="field-sub-label">{t('common.zh')}</span>
          {rows ? (
            <textarea
              rows={rows}
              value={value.zh}
              placeholder={placeholder}
              onChange={(event) => onChange({ ...value, zh: event.target.value })}
            />
          ) : (
            <input
              value={value.zh}
              placeholder={placeholder}
              onChange={(event) => onChange({ ...value, zh: event.target.value })}
            />
          )}
        </label>
        <label className="field-sub">
          <span className="field-sub-label">{t('common.ja')}</span>
          {rows ? (
            <textarea
              rows={rows}
              value={value.ja}
              placeholder={placeholder}
              onChange={(event) => onChange({ ...value, ja: event.target.value })}
            />
          ) : (
            <input
              value={value.ja}
              placeholder={placeholder}
              onChange={(event) => onChange({ ...value, ja: event.target.value })}
            />
          )}
        </label>
      </div>
    </div>
  );
}

export interface AccordionProps {
  title: ReactNode;
  meta?: ReactNode;
  open: boolean;
  onToggle(): void;
  actions?: ReactNode;
  children: ReactNode;
}

export function Accordion({ title, meta, open, onToggle, actions, children }: AccordionProps) {
  return (
    <section className={cx('accordion', open && 'is-open')}>
      <header className="accordion-head">
        <button type="button" className="accordion-toggle" onClick={onToggle} aria-expanded={open}>
          <span className="accordion-caret" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className="accordion-title">{title}</span>
          {meta ? <span className="accordion-meta">{meta}</span> : null}
        </button>
        {actions ? <div className="accordion-actions">{actions}</div> : null}
      </header>
      {open ? <div className="accordion-body">{children}</div> : null}
    </section>
  );
}

export interface JsonEditorProps {
  value: unknown;
  onChange(next: unknown): void;
}

/** Advanced escape hatch for power users; the forms stay the primary editor. */
export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const { t } = useI18n();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setError(null);
  }, [value]);

  const format = (): void => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  const apply = (): void => {
    try {
      const parsed: unknown = JSON.parse(text);
      onChange(parsed);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <div className="json-editor">
      <textarea
        className="json-text"
        value={text}
        spellCheck={false}
        rows={16}
        onChange={(event) => setText(event.target.value)}
      />
      {error ? <p className="field-error">{t('concepts.jsonInvalid')}: {error}</p> : null}
      <div className="button-row">
        <button type="button" className="button" onClick={format}>
          {t('concepts.formatJson')}
        </button>
        <button type="button" className="button is-primary" onClick={apply}>
          {t('concepts.applyJson')}
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { Copy } from '../../../shared/types';
import { useI18n } from '../../i18n';

export interface CopyFormProps {
  value: Copy;
  onChange(next: Copy): void;
}

export function CopyForm({ value, onChange }: CopyFormProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('');

  const keys = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return Object.keys(value.labels)
      .filter((key) => !needle || key.toLowerCase().includes(needle))
      .sort((a, b) => a.localeCompare(b));
  }, [value.labels, filter]);

  const update = (key: string, lang: 'zh' | 'ja', text: string): void => {
    const entry = value.labels[key] ?? { zh: '', ja: '' };
    onChange({ ...value, labels: { ...value.labels, [key]: { ...entry, [lang]: text } } });
  };

  const rename = (oldKey: string, newKey: string): void => {
    if (oldKey === newKey) return;
    const entry = value.labels[oldKey];
    if (!entry) return;
    const labels = { ...value.labels };
    delete labels[oldKey];
    labels[newKey] = entry;
    onChange({ ...value, labels });
  };

  const remove = (key: string): void => {
    const labels = { ...value.labels };
    delete labels[key];
    onChange({ ...value, labels });
  };

  const add = (): void => {
    let index = 1;
    while (value.labels[`custom.label.${index}`]) index += 1;
    onChange({ ...value, labels: { ...value.labels, [`custom.label.${index}`]: { zh: '', ja: '' } } });
  };

  return (
    <div className="concept-form">
      <div className="form-section">
        <header className="form-section-head">
          <h3>
            {t('concepts.copy')} · {Object.keys(value.labels).length}
          </h3>
          <div className="form-section-actions">
            <input
              className="filter-input"
              value={filter}
              placeholder={t('concepts.search')}
              onChange={(event) => setFilter(event.target.value)}
            />
            <button type="button" className="button" onClick={add}>
              + {t('common.add')}
            </button>
          </div>
        </header>
        <p className="panel-hint">{t('concepts.copyHint')}</p>

        <div className="copy-table">
          {keys.map((key) => (
            <div className="copy-row" key={key}>
              <input
                className="copy-key mono"
                value={key}
                spellCheck={false}
                onChange={(event) => rename(key, event.target.value)}
              />
              <input
                className="copy-cell"
                value={value.labels[key]?.zh ?? ''}
                placeholder={t('common.zh')}
                onChange={(event) => update(key, 'zh', event.target.value)}
              />
              <input
                className="copy-cell"
                value={value.labels[key]?.ja ?? ''}
                placeholder={t('common.ja')}
                onChange={(event) => update(key, 'ja', event.target.value)}
              />
              <button
                type="button"
                className="icon-button is-danger"
                title={t('concepts.delete')}
                onClick={() => remove(key)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { Theme } from '../../../shared/types';
import { useI18n } from '../../i18n';
import { LocalizedField, TextField } from '../Fields';

export interface ThemeFormProps {
  value: Theme;
  onChange(next: Theme): void;
}

const COLOR_FIELDS = [
  { key: 'background', label: 'concepts.colorBackground' },
  { key: 'surface', label: 'concepts.colorSurface' },
  { key: 'text', label: 'concepts.colorText' },
  { key: 'muted', label: 'concepts.colorMuted' },
  { key: 'accent', label: 'concepts.colorAccent' },
  { key: 'border', label: 'concepts.colorBorder' },
] as const;

export function ThemeForm({ value, onChange }: ThemeFormProps) {
  const { t } = useI18n();

  const setColor = (key: keyof Theme['colors'], color: string): void => {
    const colors: Theme['colors'] = { ...value.colors };
    colors[key] = color;
    onChange({ ...value, colors });
  };

  return (
    <div className="concept-form">
      <div className="form-section">
        <TextField label={t('concepts.id')} value={value.id} mono onChange={(id) => onChange({ ...value, id })} />
        <LocalizedField label={t('concepts.name')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
      </div>

      <div className="form-section">
        <h3 className="form-section-title">{t('concepts.colors')}</h3>
        <div className="color-grid">
          {COLOR_FIELDS.map((field) => (
            <div className="color-field" key={field.key}>
              <span className="field-label">{t(field.label)}</span>
              <div className="color-row">
                <input
                  type="color"
                  className="color-swatch"
                  value={value.colors[field.key]}
                  onChange={(event) => setColor(field.key, event.target.value)}
                />
                <input
                  className="color-text"
                  value={value.colors[field.key]}
                  spellCheck={false}
                  onChange={(event) => setColor(field.key, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

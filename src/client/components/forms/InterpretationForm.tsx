import type { Interpretation } from '../../../shared/types';
import { useI18n } from '../../i18n';
import { LocalizedField, TextField } from '../Fields';

export interface InterpretationFormProps {
  value: Interpretation;
  onChange(next: Interpretation): void;
}

export function InterpretationForm({ value, onChange }: InterpretationFormProps) {
  const { t } = useI18n();
  const placeholders = ['{slot}', '{meaning}', '{word}', '{orientation}', '{interpretation}', '{question}', '{slotQuestion}'];

  return (
    <div className="concept-form">
      <div className="form-section">
        <TextField label={t('concepts.id')} value={value.id} mono onChange={(id) => onChange({ ...value, id })} />
        <LocalizedField label={t('concepts.name')} value={value.name} onChange={(name) => onChange({ ...value, name })} />
      </div>

      <div className="form-section">
        <LocalizedField
          label={t('concepts.template')}
          value={value.template}
          rows={3}
          onChange={(template) => onChange({ ...value, template })}
        />
        <p className="panel-hint">
          {placeholders.map((placeholder) => (
            <code className="placeholder-chip" key={placeholder}>
              {placeholder}
            </code>
          ))}
        </p>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">{t('concepts.orientations')}</h3>
        <LocalizedField
          label={`${t('concepts.orientations')} · ${t('concepts.upright')}`}
          value={value.orientations.upright}
          onChange={(upright) => onChange({ ...value, orientations: { ...value.orientations, upright } })}
        />
        <LocalizedField
          label={`${t('concepts.orientations')} · ${t('concepts.reversed')}`}
          value={value.orientations.reversed}
          onChange={(reversed) => onChange({ ...value, orientations: { ...value.orientations, reversed } })}
        />
      </div>
    </div>
  );
}

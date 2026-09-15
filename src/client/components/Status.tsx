import { useApp } from '../state';
import { useI18n } from '../i18n';
import { cx } from '../util';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner-dot" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: string;
}

export function EmptyState({ title, hint, icon }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-icon" aria-hidden="true">{icon}</div> : null}
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
    </div>
  );
}

export interface ErrorPaneProps {
  message: string;
  onRetry?(): void;
}

export function ErrorPane({ message, onRetry }: ErrorPaneProps) {
  const { t } = useI18n();
  return (
    <div className="error-pane" role="alert">
      <p className="error-title">{t('error.title')}</p>
      <p className="error-message">{message}</p>
      {onRetry ? (
        <button type="button" className="button is-primary" onClick={onRetry}>
          {t('error.retry')}
        </button>
      ) : null}
    </div>
  );
}

export function Toaster() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={cx('toast', toast.kind === 'error' && 'is-error')} role="status" key={toast.id}>
      {toast.text}
    </div>
  );
}

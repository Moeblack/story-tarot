import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { cx } from '../util';

export interface ModalProps {
  title: ReactNode;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
}

export function Modal({ title, onClose, children, footer, wide, className }: ModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cx('modal', wide && 'is-wide', className)}>
        <header className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

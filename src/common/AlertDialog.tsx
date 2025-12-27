/**
 * TabBurrow - アラートダイアログコンポーネント
 * 通知用のモーダルダイアログ（OKボタンのみ）
 */

import { memo } from 'react';
import { DialogOverlay } from './DialogOverlay.js';
import { useTranslation } from './i18nContext.js';
import { CheckCircle, XCircle, Info } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'info';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  onClose: () => void;
}

const variantIcons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={24} className="alert-icon-success" />,
  error: <XCircle size={24} className="alert-icon-error" />,
  info: <Info size={24} className="alert-icon-info" />,
};

export const AlertDialog = memo(function AlertDialog({
  isOpen,
  title,
  message,
  variant = 'info',
  onClose,
}: AlertDialogProps) {
  const { t } = useTranslation();

  return (
    <DialogOverlay isOpen={isOpen} onClose={onClose} onEnter={onClose}>
      <div className="dialog">
        <div className="dialog-header">
          <span className="dialog-icon">{variantIcons[variant]}</span>
          <h3 className="dialog-title">{title}</h3>
        </div>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t('dialog.ok')}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
});

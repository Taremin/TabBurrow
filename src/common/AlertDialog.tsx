/**
 * TabBurrow - アラートダイアログコンポーネント
 * 通知用のモーダルダイアログ（OKボタンのみ）
 */

import { memo, useCallback, useEffect } from 'react';
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

  // ESCキーまたはEnterキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && (e.key === 'Escape' || e.key === 'Enter')) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // オーバーレイクリックで閉じる
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="dialog-overlay" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
      <div className="dialog">
        <div className="dialog-icon">{variantIcons[variant]}</div>
        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t('dialog.ok')}
          </button>
        </div>
      </div>
    </div>
  );
});

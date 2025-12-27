/**
 * TabBurrow - 確認ダイアログコンポーネント
 */

import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from './i18nContext.js';
import { useDialog } from './hooks/useDialog.js';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  // 確認ボタンのカスタマイズ（オプション）
  confirmButtonText?: string;  // 翻訳済みテキスト。省略時は「削除」
  confirmButtonStyle?: 'danger' | 'primary';  // ボタンのスタイル。省略時は 'danger'
}

export const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmButtonText,
  confirmButtonStyle = 'danger',
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const { handleOverlayClick } = useDialog({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="dialog-overlay" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
      <div className="dialog">
        <div className="dialog-header">
          <span className="dialog-icon"><AlertTriangle className="alert-icon-warning" /></span>
          <h3 className="dialog-title">{title}</h3>
        </div>
        <p className="dialog-message">{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className={`btn btn-${confirmButtonStyle}`} onClick={onConfirm}>
            {confirmButtonText || t('common.delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

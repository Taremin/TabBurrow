/**
 * TabBurrow - 確認ダイアログコンポーネント
 */

import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from '../common/i18nContext.js';

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

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // オーバーレイクリックで閉じる
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="dialog-overlay" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
      <div className="dialog">
        <div className="dialog-icon">⚠️</div>
        <h3 className="dialog-title">{title}</h3>
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
    </div>
  );
});

/**
 * TabBurrow - 入力ダイアログコンポーネント
 * テキスト入力を受け付けるモーダルダイアログ
 */

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from './i18nContext.js';

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  // 確認ボタンのカスタマイズ（オプション）
  confirmButtonText?: string;
}

export const PromptDialog = memo(function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue = '',
  placeholder,
  onConfirm,
  onCancel,
  confirmButtonText,
}: PromptDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // ダイアログが開いたときに初期値をセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      // 次のフレームでフォーカス
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen, defaultValue]);

  // ESCキーでダイアログを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, value]);

  // オーバーレイクリックで閉じる
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  // 確認ボタン
  const handleConfirm = useCallback(() => {
    if (value.trim()) {
      onConfirm(value.trim());
    }
  }, [value, onConfirm]);

  if (!isOpen) return null;

  return (
    <div 
      className="dialog-overlay" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
      <div className="dialog">
        <h3 className="dialog-title">{title}</h3>
        {message && <p className="dialog-message">{message}</p>}
        <input
          ref={inputRef}
          type="text"
          className="dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || t('dialog.promptPlaceholder')}
        />
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={!value.trim()}
          >
            {confirmButtonText || t('dialog.ok')}
          </button>
        </div>
      </div>
    </div>
  );
});

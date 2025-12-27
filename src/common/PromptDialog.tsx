/**
 * TabBurrow - 入力ダイアログコンポーネント
 * テキスト入力を受け付けるモーダルダイアログ
 */

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { DialogOverlay } from './DialogOverlay.js';
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
  // エラーメッセージ（オプション）
  error?: string | null;
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
  error,
}: PromptDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 確認ボタン
  const handleConfirm = useCallback(() => {
    if (value.trim()) {
      onConfirm(value.trim());
    }
  }, [value, onConfirm]);

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

  return (
    <DialogOverlay isOpen={isOpen} onClose={onCancel} onEnter={handleConfirm}>
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
        {error && <p className="dialog-error">{error}</p>}
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
    </DialogOverlay>
  );
});

/**
 * TabBurrow - 入力ダイアログコンポーネント
 * テキスト入力を受け付けるモーダルダイアログ
 */

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { DialogOverlay } from './DialogOverlay';
import { useTranslation } from './i18nContext';

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
  // 空入力を許可するかどうか（デフォルト: false）
  allowEmpty?: boolean;
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
  allowEmpty = false,
}: PromptDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // 確認ボタン
  const handleConfirm = useCallback(() => {
    if (allowEmpty || value.trim()) {
      onConfirm(value.trim());
    }
  }, [value, onConfirm, allowEmpty]);

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
            disabled={!allowEmpty && !value.trim()}
          >
            {confirmButtonText || t('dialog.ok')}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
});

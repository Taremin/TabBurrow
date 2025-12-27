/**
 * TabBurrow - テキストインポートダイアログ
 * JSON、URLリスト、Markdown形式を自動判定してインポート
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { DialogOverlay } from '../../common/DialogOverlay.js';
import { useTranslation } from '../../common/i18nContext.js';
import { detectTextFormat } from '../../exportImport.js';

interface TextImportDialogProps {
  isOpen: boolean;
  title: string;
  /** タブデータのインポートの場合はtrue（複数フォーマット対応）。設定の場合はfalse（JSONのみ） */
  isTabsImport?: boolean;
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}

export const TextImportDialog = memo(function TextImportDialog({
  isOpen,
  title,
  isTabsImport = false,
  onImport,
  onClose,
}: TextImportDialogProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 入力テキストのフォーマットを検出
  const detectedFormat = useMemo(() => {
    if (!inputText.trim()) return null;
    return detectTextFormat(inputText);
  }, [inputText]);

  // フォーマットの表示名
  const formatDisplayName = useMemo(() => {
    if (!detectedFormat) return '';
    switch (detectedFormat) {
      case 'json':
        return t('settings.dataManagement.formatJson');
      case 'urlList':
        return t('settings.dataManagement.formatUrlList');
      case 'markdown':
        return t('settings.dataManagement.formatMarkdown');
      default:
        return '';
    }
  }, [detectedFormat, t]);

  // インポート実行
  const handleImport = useCallback(async () => {
    if (!inputText.trim()) {
      setError(t('settings.dataManagement.emptyJson'));
      return;
    }

    // 設定インポートの場合はJSONのみ許可
    if (!isTabsImport) {
      try {
        JSON.parse(inputText);
      } catch {
        setError(t('settings.dataManagement.invalidJson'));
        return;
      }
    }

    setIsImporting(true);
    setError(null);

    try {
      await onImport(inputText);
      // 成功したらダイアログを閉じてリセット
      setInputText('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsImporting(false);
    }
  }, [inputText, onImport, onClose, t, isTabsImport]);

  // ダイアログを閉じる際に状態リセット
  const handleClose = useCallback(() => {
    setInputText('');
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <DialogOverlay isOpen={isOpen} onClose={handleClose}>
      <div
        className="dialog dialog-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title">{title}</div>
        <div className="dialog-content">
          <textarea
            className="form-textarea export-import-textarea"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError(null);
            }}
            placeholder={
              isTabsImport
                ? t('settings.dataManagement.pasteTextPlaceholder')
                : t('settings.dataManagement.pasteJsonPlaceholder')
            }
          />
          {/* フォーマット検出表示（タブインポートのみ） */}
          {isTabsImport && detectedFormat && (
            <div className="format-detected">
              {t('settings.dataManagement.detectedFormat')}: <strong>{formatDisplayName}</strong>
            </div>
          )}
          {error && <div className="dialog-error">{error}</div>}
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={isImporting}
          >
            <span>📥</span>
            <span>
              {isImporting
                ? t('settings.dataManagement.importing')
                : t('settings.dataManagement.importButton')}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isImporting}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
});


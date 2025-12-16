/**
 * TabBurrow - テキストエクスポートダイアログ
 * 複数フォーマット対応（JSON、URLリスト、Markdown）
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import {
  type TabExportData,
  type ExportFormat,
  formatTabsData,
} from '../../exportImport.js';

interface TextExportDialogProps {
  isOpen: boolean;
  title: string;
  /** タブデータのエクスポートの場合はtrue。設定データの場合はfalse（JSONのみ） */
  isTabsExport?: boolean;
  /** タブデータ（フォーマット変換用） */
  tabsData?: TabExportData | null;
  /** 設定データなど、JSON文字列を直接渡す場合 */
  jsonData?: string;
  onClose: () => void;
}

export const TextExportDialog = memo(function TextExportDialog({
  isOpen,
  title,
  isTabsExport = false,
  tabsData,
  jsonData,
  onClose,
}: TextExportDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('json');

  // 表示するテキストを計算
  const displayText = useMemo(() => {
    if (isTabsExport && tabsData) {
      return formatTabsData(tabsData, format);
    }
    return jsonData || '';
  }, [isTabsExport, tabsData, jsonData, format]);

  // クリップボードにコピー
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      // 2秒後にリセット
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('クリップボードへのコピーに失敗:', error);
    }
  }, [displayText]);

  // ダイアログを閉じる際に状態をリセット
  const handleClose = useCallback(() => {
    setCopied(false);
    setFormat('json');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div
        className="dialog dialog-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title">{title}</div>
        <div className="dialog-content">
          {/* フォーマット選択（タブデータのみ） */}
          {isTabsExport && (
            <div className="format-selector">
              <label className="form-label">
                {t('settings.dataManagement.formatLabel')}
              </label>
              <select
                className="form-select"
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
              >
                <option value="json">
                  {t('settings.dataManagement.formatJson')}
                </option>
                <option value="urlList">
                  {t('settings.dataManagement.formatUrlList')}
                </option>
                <option value="markdown">
                  {t('settings.dataManagement.formatMarkdown')}
                </option>
              </select>
            </div>
          )}
          <textarea
            className="form-textarea export-import-textarea"
            value={displayText}
            readOnly
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopy}
          >
            <span>📋</span>
            <span>
              {copied
                ? t('settings.dataManagement.copied')
                : t('settings.dataManagement.copyToClipboard')}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * インポート/エクスポートダイアログ
 */

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext.js';

interface ImportExportDialogProps {
  isOpen: boolean;
  mode: 'import' | 'export';
  onClose: () => void;
  onImport?: (json: string) => Promise<boolean>;
  exportJson?: string;
}

export function ImportExportDialog({ isOpen, mode, onClose, onImport, exportJson }: ImportExportDialogProps) {
  const { t } = useTranslation();
  const [inputJson, setInputJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImport = useCallback(async () => {
    if (!inputJson.trim()) {
      setError(t('themeEditor.importError.empty', { defaultValue: 'JSONを入力してください' }));
      return;
    }

    try {
      const success = await onImport?.(inputJson);
      if (success) {
        setInputJson('');
        setError(null);
        onClose();
      } else {
        setError(t('themeEditor.importError.invalid', { defaultValue: '無効なJSON形式です' }));
      }
    } catch {
      setError(t('themeEditor.importError.invalid', { defaultValue: '無効なJSON形式です' }));
    }
  }, [inputJson, onImport, onClose, t]);

  const handleCopy = useCallback(async () => {
    if (!exportJson) return;
    
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [exportJson]);

  const handleClose = useCallback(() => {
    setInputJson('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog import-export-dialog" onClick={e => e.stopPropagation()}>
        <h2 className="dialog-title">
          {mode === 'import'
            ? t('themeEditor.importTitle', { defaultValue: 'テーマをインポート' })
            : t('themeEditor.exportTitle', { defaultValue: 'テーマをエクスポート' })}
        </h2>

        {mode === 'import' ? (
          <>
            <textarea
              className="json-textarea"
              value={inputJson}
              onChange={e => {
                setInputJson(e.target.value);
                setError(null);
              }}
              placeholder={t('themeEditor.importPlaceholder', { defaultValue: 'ここにJSONを貼り付けてください...' })}
            />
            {error && <p style={{ color: 'var(--danger-color)', marginTop: '8px' }}>{error}</p>}
          </>
        ) : (
          <textarea
            className="json-textarea"
            value={exportJson || ''}
            readOnly
          />
        )}

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            {t('common.cancel')}
          </button>
          {mode === 'import' ? (
            <button className="btn btn-primary" onClick={handleImport}>
              {t('themeEditor.importButton', { defaultValue: 'インポート' })}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied
                ? t('themeEditor.copied', { defaultValue: 'コピーしました!' })
                : t('themeEditor.copyToClipboard', { defaultValue: 'クリップボードにコピー' })}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

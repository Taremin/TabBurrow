/**
 * インポート/エクスポートダイアログ
 */

import { useState, useCallback } from 'react';
import { Copy, Check, Upload, Download } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext.js';
import { Dialog } from '../../common/Dialog.js';

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

  const title = mode === 'import'
    ? t('themeEditor.importTitle', { defaultValue: 'テーマをインポート' })
    : t('themeEditor.exportTitle', { defaultValue: 'テーマをエクスポート' });

  const icon = mode === 'import' ? <Upload size={20} /> : <Download size={20} />;

  const actions = (
    <>
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
    </>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      icon={icon}
      actions={actions}
      width={600}
    >
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
    </Dialog>
  );
}


/**
 * TabBurrow - インポートモード選択ダイアログ
 */

import { useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import type { ImportMode } from '../../exportImport.js';

interface ImportModeDialogProps {
  isOpen: boolean;
  selectedMode: ImportMode;
  onModeChange: (mode: ImportMode) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportModeDialog({
  isOpen,
  selectedMode,
  onModeChange,
  onConfirm,
  onCancel,
}: ImportModeDialogProps) {
  const { t } = useTranslation();

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }, [onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog">
        <div className="dialog-icon">📥</div>
        <h3 className="dialog-title">{t('settings.importDialog.title')}</h3>
        <p className="dialog-message">{t('settings.importDialog.message')}</p>

        <div className="import-mode-options">
          <label className="import-mode-option">
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={selectedMode === 'merge'}
              onChange={() => onModeChange('merge')}
            />
            <span className="option-content">
              <strong>{t('settings.importDialog.mergeTitle')}</strong>
              <small>{t('settings.importDialog.mergeDescription')}</small>
            </span>
          </label>
          <label className="import-mode-option">
            <input
              type="radio"
              name="importMode"
              value="overwrite"
              checked={selectedMode === 'overwrite'}
              onChange={() => onModeChange('overwrite')}
            />
            <span className="option-content">
              <strong>{t('settings.importDialog.overwriteTitle')}</strong>
              <small>{t('settings.importDialog.overwriteDescription')}</small>
            </span>
          </label>
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {t('settings.importDialog.cancelButton')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
          >
            {t('settings.importDialog.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

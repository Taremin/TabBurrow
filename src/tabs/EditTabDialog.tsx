/**
 * TabBurrow - タブ編集ダイアログ
 * 表示名とソートキーを編集するためのダイアログ
 */

import { memo, useCallback, useEffect, useState, useRef } from 'react';
import { Dialog } from '../common/Dialog';
import { useTranslation } from '../common/i18nContext';
import { Pencil } from 'lucide-react';

interface EditTabDialogProps {
  isOpen: boolean;
  title: string;
  defaultDisplayName?: string;
  defaultSortKey?: string;
  onConfirm: (displayName: string, sortKey: string) => void;
  onCancel: () => void;
}

export const EditTabDialog = memo(function EditTabDialog({
  isOpen,
  title,
  defaultDisplayName = '',
  defaultSortKey = '',
  onConfirm,
  onCancel,
}: EditTabDialogProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期値のセット
  useEffect(() => {
    if (isOpen) {
      setDisplayName(defaultDisplayName);
      setSortKey(defaultSortKey);
      // 表示名入力にフォーカス
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen, defaultDisplayName, defaultSortKey]);

  const handleConfirm = useCallback(() => {
    onConfirm(displayName.trim(), sortKey.trim());
  }, [displayName, sortKey, onConfirm]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={<Pencil size={20} />}
      width="400px"
      actions={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} data-testid="confirm-edit-tab">
            {t('common.save')}
          </button>
        </>
      }
    >
      <div className="edit-tab-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {t('tabManager.tabCard.displayNameLabel')}
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
            {t('tabManager.tabCard.displayNameMessage')}
          </p>
          <input
            ref={inputRef}
            type="text"
            className="dialog-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('tabManager.tabCard.displayNamePlaceholder')}
            data-testid="edit-tab-display-name"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {t('tabManager.tabCard.sortKeyLabel')}
          </label>
          <input
            type="text"
            className="dialog-input"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            placeholder={t('tabManager.tabCard.sortKeyPlaceholder')}
            data-testid="edit-tab-sort-key"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            {t('tabManager.tabCard.sortKeyHelp')}
          </p>
        </div>
      </div>
    </Dialog>
  );
});

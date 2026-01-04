/**
 * TabBurrow - ピン留めドメイングループ設定コンポーネント
 * 設定画面でピン留めドメイングループの順序入れ替えと解除を管理
 */

import { useState, useCallback } from 'react';
import { Folder, Pin } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext.js';
import { ConfirmDialog } from '../../common/ConfirmDialog.js';
import { DraggableList, DraggableListItem } from './DraggableList.js';

interface PinnedDomainGroupSettingsProps {
  pinnedDomainGroups: string[];
  domainGroupAliases?: Record<string, string>;
  onReorder: (newOrder: string[]) => void;
  onUnpin: (domain: string) => void;
}

/**
 * ピン留めドメイングループ設定コンポーネント
 * - ドラッグ&ドロップで順序入れ替え
 * - ピン留め解除
 */
export function PinnedDomainGroupSettings({
  pinnedDomainGroups,
  domainGroupAliases = {},
  onReorder,
  onUnpin,
}: PinnedDomainGroupSettingsProps) {
  const { t } = useTranslation();
  
  // 削除確認ダイアログ
  const [unpinDialogOpen, setUnpinDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  // ピン留め解除ダイアログを開く
  const openUnpinDialog = useCallback((domain: string) => {
    setSelectedDomain(domain);
    setUnpinDialogOpen(true);
  }, []);
  
  // ピン留め解除実行
  const handleUnpin = useCallback(() => {
    if (selectedDomain) {
      onUnpin(selectedDomain);
    }
    setUnpinDialogOpen(false);
    setSelectedDomain(null);
  }, [selectedDomain, onUnpin]);
  
  // DraggableList用のアイテムリスト作成
  const items: DraggableListItem[] = pinnedDomainGroups.map(domain => ({
    id: domain,
    name: domainGroupAliases[domain] || domain,
    icon: (
      <span className="pinned-domain-icons">
        <Folder size={16} />
        <Pin size={12} className="pinned-indicator" />
      </span>
    ),
    badge: domainGroupAliases[domain] ? domain : undefined,
  }));
  
  // 順序変更
  const handleReorder = useCallback((newOrder: string[]) => {
    onReorder(newOrder);
  }, [onReorder]);
  
  // 削除（ピン解除）
  const handleDelete = useCallback((id: string) => {
    openUnpinDialog(id);
  }, [openUnpinDialog]);
  
  return (
    <div className="pinned-domain-groups-settings">
      <p className="settings-description">
        {t('settings.pinnedDomainGroups.description')}
      </p>
      
      <DraggableList
        items={items}
        onReorder={handleReorder}
        onDelete={handleDelete}
        deleteTitle={t('settings.pinnedDomainGroups.unpin')}
        dragHint={t('settings.pinnedDomainGroups.dragHint')}
        emptyMessage={t('settings.pinnedDomainGroups.empty')}
      />
      
      {/* ピン解除確認ダイアログ */}
      <ConfirmDialog
        isOpen={unpinDialogOpen}
        title={t('settings.pinnedDomainGroups.unpinConfirmTitle')}
        message={t('settings.pinnedDomainGroups.unpinConfirmMessage', { domain: domainGroupAliases[selectedDomain || ''] || selectedDomain || '' })}
        confirmButtonText={t('settings.pinnedDomainGroups.unpin')}
        confirmButtonStyle="danger"
        onConfirm={handleUnpin}
        onCancel={() => {
          setUnpinDialogOpen(false);
          setSelectedDomain(null);
        }}
      />
    </div>
  );
}

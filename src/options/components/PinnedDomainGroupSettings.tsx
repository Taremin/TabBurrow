/**
 * TabBurrow - ピン留めドメイングループ設定コンポーネント
 * 設定画面でピン留めドメイングループの順序入れ替えと解除を管理
 */

import { useState, useCallback } from 'react';
import { Folder } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { DraggableList, DraggableListItem } from './DraggableList';
import type { PinnedDomainGroup } from '../../settings';
import { ColorPicker } from '../../common/ColorPicker';

interface PinnedDomainGroupSettingsProps {
  pinnedDomainGroups: PinnedDomainGroup[];
  domainGroupAliases?: Record<string, string>;
  onReorder: (newOrder: PinnedDomainGroup[]) => void;
  onUnpin: (domain: string) => void;
  onColorChange?: (domain: string, color: string | undefined) => void;
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
  onColorChange,
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
  const items: DraggableListItem[] = pinnedDomainGroups.map(pinned => ({
    id: pinned.domain,
    name: domainGroupAliases[pinned.domain] || pinned.domain,
    icon: <Folder size={16} />,
    badge: domainGroupAliases[pinned.domain] ? pinned.domain : undefined,
    action: onColorChange ? (
      <ColorPicker
        color={pinned.color}
        onChange={(color) => onColorChange(pinned.domain, color)}
      />
    ) : undefined,
  }));
  
  // 順序変更
  const handleReorder = useCallback((newOrder: string[]) => {
    // 既存のピン留めデータから色情報を引き継いで新しい順序を作成
    const reordered = newOrder.map(domain => {
      const existing = pinnedDomainGroups.find(p => p.domain === domain);
      return existing || { domain };
    });
    onReorder(reordered);
  }, [pinnedDomainGroups, onReorder]);
  
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

/**
 * TabBurrow - カスタムグループ設定コンポーネント
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, FolderPlus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from '../../common/i18nContext.js';
import { ConfirmDialog } from '../../common/ConfirmDialog.js';
import { PromptDialog } from '../../common/PromptDialog.js';
import {
  getAllCustomGroups,
  createCustomGroup,
  renameCustomGroup,
  deleteCustomGroup,
  getAllTabs,
  updateCustomGroupOrder,
  updateCustomGroupColor,
} from '../../storage.js';
import type { CustomGroupMeta, SavedTab } from '../../storage.js';
import { ColorPicker } from '../../common/ColorPicker.js';

interface CustomGroupSettingsProps {
  showGroupedTabsInDomainGroups?: boolean;
  onShowGroupedTabsInDomainGroupsChange?: (value: boolean) => void;
}

export function CustomGroupSettings({
  showGroupedTabsInDomainGroups = false,
  onShowGroupedTabsInDomainGroupsChange,
}: CustomGroupSettingsProps) {
  const { t } = useTranslation();
  
  // グループ一覧
  const [groups, setGroups] = useState<CustomGroupMeta[]>([]);
  // 各グループのタブ数
  const [tabCounts, setTabCounts] = useState<Map<string, number>>(new Map());
  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  
  // ダイアログ状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomGroupMeta | null>(null);
  
  // エラー状態
  const [error, setError] = useState<string | null>(null);
  
  // ドラッグアンドドロップ状態
  const [draggedGroupName, setDraggedGroupName] = useState<string | null>(null);
  const [dragOverGroupName, setDragOverGroupName] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // グループ一覧を読み込む
  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const allGroups = await getAllCustomGroups();
      const allTabs = await getAllTabs();
      
      // 各グループのタブ数をカウント
      const counts = new Map<string, number>();
      for (const tab of allTabs) {
        const groupsForTab = new Set<string>();
        if (tab.customGroups && tab.customGroups.length > 0) {
          tab.customGroups.forEach(g => groupsForTab.add(g));
        } else if (tab.groupType === 'custom' && tab.group) {
          groupsForTab.add(tab.group);
        }
        
        for (const groupName of groupsForTab) {
          counts.set(groupName, (counts.get(groupName) || 0) + 1);
        }
      }
      
      setGroups(allGroups);
      setTabCounts(counts);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // 新規グループ作成
  const handleCreateGroup = useCallback(async (name: string) => {
    if (!name.trim()) {
      setError(t('settings.customGroups.emptyNameError'));
      return;
    }
    
    // 重複チェック
    if (groups.some(g => g.name === name.trim())) {
      setError(t('settings.customGroups.duplicateError'));
      return;
    }
    
    try {
      await createCustomGroup(name.trim());
      setCreateDialogOpen(false);
      setError(null);
      await loadGroups();
    } catch (err) {
      console.error('Failed to create group:', err);
      setError(String(err));
    }
  }, [groups, loadGroups, t]);

  // グループ名編集
  const handleEditGroup = useCallback(async (newName: string) => {
    if (!selectedGroup) return;
    
    if (!newName.trim()) {
      setError(t('settings.customGroups.emptyNameError'));
      return;
    }
    
    // 重複チェック（自分自身は除く）
    if (groups.some(g => g.name === newName.trim() && g.name !== selectedGroup.name)) {
      setError(t('settings.customGroups.duplicateError'));
      return;
    }
    
    try {
      await renameCustomGroup(selectedGroup.name, newName.trim());
      setEditDialogOpen(false);
      setSelectedGroup(null);
      setError(null);
      await loadGroups();
    } catch (err) {
      console.error('Failed to rename group:', err);
      setError(String(err));
    }
  }, [selectedGroup, groups, loadGroups, t]);

  // グループ削除
  const handleDeleteGroup = useCallback(async () => {
    if (!selectedGroup) return;
    
    try {
      await deleteCustomGroup(selectedGroup.name);
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  }, [selectedGroup, loadGroups]);

  // 編集ダイアログを開く
  const openEditDialog = useCallback((group: CustomGroupMeta) => {
    setSelectedGroup(group);
    setError(null);
    setEditDialogOpen(true);
  }, []);

  // 削除ダイアログを開く
  const openDeleteDialog = useCallback((group: CustomGroupMeta) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  }, []);

  // 新規作成ダイアログを開く
  const openCreateDialog = useCallback(() => {
    setError(null);
    setCreateDialogOpen(true);
  }, []);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.DragEvent, groupName: string) => {
    setDraggedGroupName(groupName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', groupName);
  }, []);

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    setDraggedGroupName(null);
    setDragOverGroupName(null);
    setDropPosition(null);
  }, []);

  // ドラッグオーバー（ドロップ可能エリア）
  const handleDragOver = useCallback((e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedGroupName && draggedGroupName !== groupName) {
      // マウス位置に基づいて挿入位置を判定（上半分=before、下半分=after）
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const position: 'before' | 'after' = mouseY < rect.height / 2 ? 'before' : 'after';
      
      setDragOverGroupName(groupName);
      setDropPosition(position);
    }
  }, [draggedGroupName]);

  // ドラッグ離脱
  const handleDragLeave = useCallback(() => {
    setDragOverGroupName(null);
    setDropPosition(null);
  }, []);

  // ドロップ処理
  const handleDrop = useCallback(async (e: React.DragEvent, targetGroupName: string) => {
    e.preventDefault();
    const sourceGroupName = e.dataTransfer.getData('text/plain');
    
    if (!sourceGroupName || sourceGroupName === targetGroupName) {
      setDraggedGroupName(null);
      setDragOverGroupName(null);
      setDropPosition(null);
      return;
    }

    // 挿入位置を計算
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const position: 'before' | 'after' = mouseY < rect.height / 2 ? 'before' : 'after';

    // 新しい順序を計算
    const newOrder = [...groups];
    const sourceIndex = newOrder.findIndex(g => g.name === sourceGroupName);
    let targetIndex = newOrder.findIndex(g => g.name === targetGroupName);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedGroupName(null);
      setDragOverGroupName(null);
      setDropPosition(null);
      return;
    }

    // ソースを削除
    const [movedGroup] = newOrder.splice(sourceIndex, 1);
    
    // ターゲットインデックスを再計算（ソース削除後にインデックスがずれる可能性）
    targetIndex = newOrder.findIndex(g => g.name === targetGroupName);
    
    // 挿入位置を調整
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    newOrder.splice(insertIndex, 0, movedGroup);
    
    // UIを即座に更新
    setGroups(newOrder);
    setDraggedGroupName(null);
    setDragOverGroupName(null);
    setDropPosition(null);

    // DBに保存
    try {
      await updateCustomGroupOrder(newOrder.map(g => g.name));
    } catch (err) {
      console.error('Failed to update group order:', err);
      // エラー時は再読み込み
      await loadGroups();
    }
  }, [groups, loadGroups]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="custom-groups-settings">
      {/* 設定オプション */}
      {onShowGroupedTabsInDomainGroupsChange && (
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={showGroupedTabsInDomainGroups}
              onChange={(e) => onShowGroupedTabsInDomainGroupsChange(e.target.checked)}
              data-testid="show-grouped-tabs-checkbox"
            />
            <span className="checkbox-custom"></span>
            <span>{t('settings.customGroups.showInDomainGroups')}</span>
          </label>
          <div className="form-hint" style={{ marginTop: '4px', marginLeft: '28px' }}>
            {t('settings.customGroups.showInDomainGroupsHelp')}
          </div>
        </div>
      )}

      {/* グループ一覧 */}
      {groups.length === 0 ? (
        <p className="empty-message">{t('settings.customGroups.empty')}</p>
      ) : (
        <ul className="custom-groups-list">
          {groups.map(group => {
            const isDragging = draggedGroupName === group.name;
            const isDropTarget = dragOverGroupName === group.name && !isDragging;
            const dropClass = isDropTarget && dropPosition ? `drop-${dropPosition}` : '';
            
            return (
              <li
                key={group.name}
                className={`custom-group-item ${isDragging ? 'dragging' : ''} ${dropClass}`}
                draggable
                onDragStart={(e) => handleDragStart(e, group.name)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, group.name)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.name)}
                data-testid="custom-group-item"
              >
                <span className="drag-handle" title={t('settings.customGroups.dragHint')}>
                  <GripVertical size={16} />
                </span>
                <div className="custom-group-info">
                  <span className="custom-group-icon">
                    <Folder size={16} />
                  </span>
                  <span className="custom-group-name" data-testid="custom-group-name">{group.name}</span>
                  <span className="custom-group-count">
                    ({t('settings.customGroups.tabCount', { count: tabCounts.get(group.name) || 0 })})
                  </span>
                </div>
                <div className="custom-group-actions">
                  <ColorPicker
                    color={group.color}
                    onChange={async (color) => {
                      await updateCustomGroupColor(group.name, color);
                      setGroups(prev => prev.map(g => 
                        g.name === group.name ? { ...g, color } : g
                      ));
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => openEditDialog(group)}
                    title={t('settings.customGroups.editGroup')}
                    aria-label={t('settings.customGroups.editGroup')}
                    data-testid="edit-group-button"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-danger-icon"
                    onClick={() => openDeleteDialog(group)}
                    title={t('settings.customGroups.deleteGroup')}
                    aria-label={t('settings.customGroups.deleteGroup')}
                    data-testid="delete-group-button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 新規グループ作成ボタン */}
      <button
        type="button"
        className="btn btn-primary add-group-button"
        onClick={openCreateDialog}
        data-testid="add-group-button"
      >
        <FolderPlus size={16} />
        <span>{t('settings.customGroups.addGroup')}</span>
      </button>

      {/* 新規作成ダイアログ */}
      <PromptDialog
        isOpen={createDialogOpen}
        title={t('settings.customGroups.createDialogTitle')}
        defaultValue=""
        error={error}
        onConfirm={handleCreateGroup}
        onCancel={() => {
          setCreateDialogOpen(false);
          setError(null);
        }}
      />

      {/* 編集ダイアログ */}
      <PromptDialog
        isOpen={editDialogOpen}
        title={t('settings.customGroups.renameDialogTitle')}
        defaultValue={selectedGroup?.name || ''}
        error={error}
        onConfirm={handleEditGroup}
        onCancel={() => {
          setEditDialogOpen(false);
          setSelectedGroup(null);
          setError(null);
        }}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={t('settings.customGroups.deleteConfirmTitle')}
        message={t('settings.customGroups.deleteConfirmMessage', { name: selectedGroup?.name || '' })}
        confirmButtonText={t('common.delete')}
        confirmButtonStyle="danger"
        onConfirm={handleDeleteGroup}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedGroup(null);
        }}
      />
    </div>
  );
}

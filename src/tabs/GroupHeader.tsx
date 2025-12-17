/**
 * TabBurrow - グループヘッダーコンポーネント
 * ドメイングループとカスタムグループの両方に対応
 */

import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../common/i18nContext.js';

interface GroupHeaderProps {
  name: string;
  groupType: 'domain' | 'custom';
  tabCount: number;
  onDeleteGroup: (name: string, groupType: 'domain' | 'custom') => void;
  onOpenGroup: (name: string) => void;
  onOpenGroupAsTabGroup?: (name: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  // グループ内フィルタ
  filterPattern?: string;
  onFilterChange?: (pattern: string) => void;
  // 選択モード関連
  isSelectionMode?: boolean;
  groupTabIds?: string[];
  selectedTabIds?: Set<string>;
  onSelectGroup?: (tabIds: string[]) => void;
  onDeselectGroup?: (tabIds: string[]) => void;
}

/**
 * グループヘッダーコンポーネント
 * GroupedVirtuosoのgroupContentとして使用
 */
export const GroupHeader = memo(function GroupHeader({ 
  name, 
  groupType,
  tabCount, 
  onDeleteGroup,
  onOpenGroup,
  onOpenGroupAsTabGroup,
  onRenameGroup,
  filterPattern = '',
  onFilterChange,
  isSelectionMode = false,
  groupTabIds = [],
  selectedTabIds = new Set(),
  onSelectGroup,
  onDeselectGroup,
}: GroupHeaderProps) {
  const { t } = useTranslation();
  const [showFilter, setShowFilter] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);
  
  // 正規表現が有効かどうか
  const isValidPattern = useMemo(() => {
    if (!filterPattern.trim()) return true;
    try {
      new RegExp(filterPattern);
      return true;
    } catch {
      return false;
    }
  }, [filterPattern]);
  
  // 選択状態の計算
  const { isAllSelected, isPartiallySelected, selectedCountInGroup } = useMemo(() => {
    if (!isSelectionMode || groupTabIds.length === 0) {
      return { isAllSelected: false, isPartiallySelected: false, selectedCountInGroup: 0 };
    }
    const selectedCountInGroup = groupTabIds.filter(id => selectedTabIds.has(id)).length;
    const isAllSelected = selectedCountInGroup === groupTabIds.length;
    const isPartiallySelected = selectedCountInGroup > 0 && selectedCountInGroup < groupTabIds.length;
    return { isAllSelected, isPartiallySelected, selectedCountInGroup };
  }, [isSelectionMode, groupTabIds, selectedTabIds]);
  
  // indeterminate状態を設定
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);
  
  const handleDelete = useCallback(() => {
    onDeleteGroup(name, groupType);
  }, [name, groupType, onDeleteGroup]);

  const handleOpen = useCallback(() => {
    onOpenGroup(name);
  }, [name, onOpenGroup]);

  const handleOpenAsTabGroup = useCallback(() => {
    if (onOpenGroupAsTabGroup) {
      onOpenGroupAsTabGroup(name);
    }
  }, [name, onOpenGroupAsTabGroup]);

  const handleRename = useCallback(() => {
    if (!onRenameGroup) return;
    const newName = prompt(t('tabManager.customGroup.renameDialogTitle'), name);
    if (newName && newName.trim() && newName !== name) {
      onRenameGroup(name, newName.trim());
    }
  }, [name, onRenameGroup, t]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFilterChange) {
      onFilterChange(e.target.value);
    }
  }, [onFilterChange]);

  const toggleFilter = useCallback(() => {
    setShowFilter(prev => !prev);
    // フィルタを閉じる時はクリア
    if (showFilter && onFilterChange) {
      onFilterChange('');
    }
  }, [showFilter, onFilterChange]);
  
  // グループ選択のトグル
  const handleToggleGroupSelection = useCallback(() => {
    if (isAllSelected || isPartiallySelected) {
      // 全選択または部分選択 → 解除
      if (onDeselectGroup) {
        onDeselectGroup(groupTabIds);
      }
    } else {
      // 未選択 → 全選択
      if (onSelectGroup) {
        onSelectGroup(groupTabIds);
      }
    }
  }, [isAllSelected, isPartiallySelected, groupTabIds, onSelectGroup, onDeselectGroup]);

  const isCustomGroup = groupType === 'custom';
  const icon = isCustomGroup ? '📌' : '📁';
  const hasActiveFilter = filterPattern.trim().length > 0;

  return (
    <div className={`group-header ${isCustomGroup ? 'custom-group' : 'domain-group'}`}>
      <div className="group-title">
        {/* 選択モード時のチェックボックス */}
        {isSelectionMode && groupTabIds.length > 0 && (
          <div 
            className="group-checkbox"
            title={isAllSelected ? t('tabManager.selection.deselectGroup') : t('tabManager.selection.selectGroup')}
          >
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleGroupSelection}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
        <span className="group-icon">{icon}</span>
        <span className="group-domain">{name}</span>
        <span className="group-count">({tabCount})</span>
      </div>
      <div className="group-actions">
        {/* グループ内フィルタ */}
        {onFilterChange && (
          <>
            {showFilter && (
              <div className="group-filter">
                <input
                  type="text"
                  className={`group-filter-input ${!isValidPattern ? 'error' : ''}`}
                  placeholder={t('tabManager.groupFilter.placeholder')}
                  value={filterPattern}
                  onChange={handleFilterChange}
                  onClick={e => e.stopPropagation()}
                />
                {!isValidPattern && (
                  <span className="group-filter-error" title={t('tabManager.groupFilter.invalidPattern')}>
                    ⚠️
                  </span>
                )}
              </div>
            )}
            <button
              className={`group-filter-toggle ${showFilter || hasActiveFilter ? 'active' : ''}`}
              onClick={toggleFilter}
              title={t('tabManager.groupFilter.placeholder')}
            >
              🔍
            </button>
          </>
        )}
        {isCustomGroup && onRenameGroup && (
          <button 
            className="group-edit" 
            title={t('tabManager.customGroup.edit')}
            onClick={handleRename}
          >
            ✏️
          </button>
        )}
        <button 
          className="group-open" 
          title={t('tabManager.group.openButton')}
          onClick={handleOpen}
        >
          {t('tabManager.group.openButton')}
        </button>
        {onOpenGroupAsTabGroup && (
          <button 
            className="group-open" 
            title={t('tabManager.group.openAsTabGroupButton')}
            onClick={handleOpenAsTabGroup}
          >
            {t('tabManager.group.openAsTabGroupButton')}
          </button>
        )}
        <button 
          className="group-delete" 
          title={t('tabManager.group.deleteButton')}
          onClick={handleDelete}
        >
          {t('tabManager.group.deleteButton')}
        </button>
      </div>
    </div>
  );
});

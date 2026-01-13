/**
 * TabBurrow - グループヘッダーコンポーネント
 * ドメイングループとカスタムグループの両方に対応
 */

import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../common/i18nContext';
import { Bookmark, Folder, Search, AlertTriangle, Pencil, ChevronDown, Pin, SortAsc, Check } from 'lucide-react';
import { ColorPicker } from '../common/ColorPicker';
import { useClickOutside } from '../common/hooks/useClickOutside';
import type { ItemSortType } from './types';

interface GroupHeaderProps {
  name: string;
  groupType: 'domain' | 'custom';
  tabCount: number;
  onDeleteGroup: (name: string, groupType: 'domain' | 'custom') => void;
  onOpenGroup: (name: string, groupType: 'domain' | 'custom') => void;
  onOpenGroupAsTabGroup?: (name: string, groupType: 'domain' | 'custom') => void;
  // リネームリクエスト（親でPromptDialogを表示）
  onRequestRename?: (currentName: string, groupType: 'domain' | 'custom') => void;
  // グループ内フィルタ
  filterPattern?: string;
  onFilterChange?: (pattern: string) => void;
  // 表示密度
  isCompact?: boolean;
  // 選択モード関連
  isSelectionMode?: boolean;
  groupTabIds?: string[];
  selectedTabIds?: Set<string>;
  onSelectGroup?: (tabIds: string[]) => void;
  onDeselectGroup?: (tabIds: string[]) => void;
  // 折りたたみ状態
  isCollapsed?: boolean;
  onToggleCollapse?: (groupName: string) => void;
  displayName?: string;
  // ピン留め関連
  isPinned?: boolean;
  onTogglePin?: (name: string) => void;
  // グループ色
  color?: string;
  onColorChange?: (color: string | undefined) => void;
  // グループ別のアイテムソート順変更
  itemSort?: string;
  onItemSortChange?: (itemSort: ItemSortType | undefined) => void;
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
  onRequestRename,
  filterPattern = '',
  onFilterChange,
  isCompact = false,
  isSelectionMode = false,
  groupTabIds = [],
  selectedTabIds = new Set(),
  onSelectGroup,
  onDeselectGroup,
  isCollapsed = false,
  onToggleCollapse,
  displayName,
  isPinned = false,
  onTogglePin,
  color,
  onColorChange,
  itemSort,
  onItemSortChange,
}: GroupHeaderProps) {
  const { t } = useTranslation();
  const [showFilter, setShowFilter] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuPosition, setSortMenuPosition] = useState({ left: 0, top: 0 });
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // 外部クリックでメニューを閉じる
  const closeSortMenu = useCallback(() => setShowSortMenu(false), []);
  useClickOutside([sortMenuRef, sortButtonRef], closeSortMenu, showSortMenu);

  // メニュートグル
  const handleToggleSortMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showSortMenu && sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      setSortMenuPosition({
        left: rect.right - 200, // メニュー幅を考慮して右寄せ
        top: rect.bottom + 4,
      });
    }
    setShowSortMenu(prev => !prev);
  }, [showSortMenu]);

  const handleSortSelect = useCallback((value: ItemSortType | undefined) => {
    if (onItemSortChange) {
      onItemSortChange(value);
    }
    setShowSortMenu(false);
  }, [onItemSortChange]);
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
  const { isAllSelected, isPartiallySelected } = useMemo(() => {
    if (!isSelectionMode || groupTabIds.length === 0) {
      return { isAllSelected: false, isPartiallySelected: false };
    }
    const selectedCountInGroup = groupTabIds.filter(id => selectedTabIds.has(id)).length;
    const isAllSelected = selectedCountInGroup === groupTabIds.length;
    const isPartiallySelected = selectedCountInGroup > 0 && selectedCountInGroup < groupTabIds.length;
    return { isAllSelected, isPartiallySelected };
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
    onOpenGroup(name, groupType);
  }, [name, groupType, onOpenGroup]);

  const handleOpenAsTabGroup = useCallback(() => {
    if (onOpenGroupAsTabGroup) {
      onOpenGroupAsTabGroup(name, groupType);
    }
  }, [name, groupType, onOpenGroupAsTabGroup]);

  const handleRename = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    // 親コンポーネントにリネームリクエストを通知（PromptDialogを表示させる）
    if (onRequestRename) {
      onRequestRename(name, groupType);
    }
  }, [name, groupType, onRequestRename]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFilterChange) {
      onFilterChange(e.target.value);
    }
  }, [onFilterChange]);

  const toggleFilter = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowFilter(prev => !prev);
    // フィルタを閉じる時はクリア
    if (showFilter && onFilterChange) {
      onFilterChange('');
    }
  }, [showFilter, onFilterChange]);
  
  // グループ選択のトグル
  const handleToggleGroupSelection = useCallback((e?: React.ChangeEvent | React.MouseEvent) => {
    e?.stopPropagation();
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
  const isDomainGroup = groupType === 'domain';
  const hasActiveFilter = filterPattern.trim().length > 0;

  // ピン留めトグルのハンドラ
  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(name);
    }
  }, [name, onTogglePin]);

  // 折りたたみトグルのハンドラ
  const handleToggleCollapse = useCallback(() => {
    // 伝播を止める必要はない（これが最上位のハンドラになるため）
    if (onToggleCollapse) {
      onToggleCollapse(name);
    }
  }, [name, onToggleCollapse]);

  const handleButtonClick = useCallback((e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  }, []);

  return (
    <div 
      className={`group-header ${isCustomGroup ? 'custom-group' : 'domain-group'} ${isCompact ? 'group-header-compact' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      onClick={handleToggleCollapse}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleCollapse(); }}
      title={isCollapsed ? t('tabManager.group.expandButton') : t('tabManager.group.collapseButton')}
      data-testid="group-header"
    >
      {/* グループカラーバー */}
      {color && (
        <div className="group-color-bar" style={{ backgroundColor: color }} />
      )}
      <div className="group-title">
        {isSelectionMode && groupTabIds.length > 0 && (
          <div 
            className="group-checkbox"
            title={isAllSelected ? t('tabManager.selection.deselectGroup') : t('tabManager.selection.selectGroup')}
            onClick={e => e.stopPropagation()}
            data-testid="group-checkbox"
          >
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleGroupSelection}
            />
          </div>
        )}
        <span className={`group-collapse-icon ${isCollapsed ? 'collapsed' : ''}`}>
          <ChevronDown size={16} />
        </span>
        <span className="group-icon">{isCustomGroup ? <Bookmark size={16} /> : <Folder size={16} />}</span>
        {isPinned && isDomainGroup && (
          <span className="group-pin-icon" title={t('tabManager.group.unpinButton')}>
            <Pin size={16} />
          </span>
        )}
        <span className="group-domain">{displayName || name}</span>
        {displayName && (
          <span className="group-original-domain">{name}</span>
        )}
        <span className="group-count">({tabCount})</span>
      </div>
      <div className="group-actions">
        {/* ピン留めボタン（ドメイングループのみ、左端に配置） */}
        {isDomainGroup && onTogglePin && (
          <button 
            className={`group-pin ${isPinned ? 'pinned' : ''}`}
            title={isPinned ? t('tabManager.group.unpinButton') : t('tabManager.group.pinButton')}
            onClick={handleTogglePin}
            data-testid="group-pin-button"
          >
            <Pin size={16} />
          </button>
        )}
        {/* グループ別のソート順選択 (カスタムグループまたはピン留め済みドメイングループのみ) */}
        {onItemSortChange && (groupType === 'custom' || isPinned) && (
          <div className="group-sort-wrapper">
            <button
              ref={sortButtonRef}
              className={`group-action-button ${itemSort && itemSort !== '' ? 'active' : ''}`}
              title={t('tabManager.sort.itemLabel')}
              onClick={handleToggleSortMenu}
              data-testid="group-item-sort-button"
            >
              <SortAsc size={16} />
            </button>
            {showSortMenu && createPortal(
              <div
                ref={sortMenuRef}
                className="group-menu-portal group-sort-menu"
                style={{
                  position: 'fixed',
                  left: sortMenuPosition.left,
                  top: sortMenuPosition.top,
                  zIndex: 1000,
                }}
              >
                <div className="group-menu-label">{t('tabManager.sort.itemLabel')}</div>
                <button
                  className={`group-menu-item ${!itemSort ? 'is-selected' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleSortSelect(undefined); }}
                  data-testid="group-sort-option-default"
                >
                  <span className="group-menu-item-check">{!itemSort && <Check size={14} />}</span>
                  <span className="group-menu-item-text">{t('tabManager.sort.default')}</span>
                </button>
                <div className="group-menu-divider" />
                {[
                  { value: 'saved-desc' as const, label: t('tabManager.sort.savedDesc') },
                  { value: 'saved-asc' as const, label: t('tabManager.sort.savedAsc') },
                  { value: 'title-asc' as const, label: t('tabManager.sort.titleAsc') },
                  { value: 'title-desc' as const, label: t('tabManager.sort.titleDesc') },
                  { value: 'accessed-desc' as const, label: t('tabManager.sort.accessedDesc') },
                  { value: 'accessed-asc' as const, label: t('tabManager.sort.accessedAsc') },
                ].map(opt => (
                  <button
                    key={opt.value}
                    className={`group-menu-item ${itemSort === opt.value ? 'is-selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleSortSelect(opt.value); }}
                    data-testid={`group-sort-option-${opt.value}`}
                  >
                    <span className="group-menu-item-check">{itemSort === opt.value && <Check size={14} />}</span>
                    <span className="group-menu-item-text">{opt.label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
        {/* カスタムグループまたはピン留めドメイングループの色変更 */}
        {(isCustomGroup || (isDomainGroup && isPinned)) && onColorChange && (
          <ColorPicker
            color={color}
            onChange={onColorChange}
          />
        )}
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
                  data-testid="group-filter-input"
                />
                {!isValidPattern && (
                  <span className="group-filter-error" title={t('tabManager.groupFilter.invalidPattern')}>
                    <AlertTriangle size={16} />
                  </span>
                )}
              </div>
            )}
            <button
              className={`group-filter-toggle ${showFilter || hasActiveFilter ? 'active' : ''}`}
              onClick={toggleFilter}
              title={t('tabManager.groupFilter.placeholder')}
              data-testid="group-filter-toggle"
            >
              <Search size={16} />
            </button>
          </>
        )}
        {onRequestRename && (
          <button 
            className="group-edit" 
            title={isCustomGroup ? t('tabManager.customGroup.edit') : t('settings.domainGroups.editAlias')}
            onClick={handleRename}
            data-testid="group-rename-button"
          >
            <Pencil size={16} />
          </button>
        )}
        <button 
          className="group-open" 
          title={t('tabManager.group.openButton')}
          onClick={(e) => handleButtonClick(e, handleOpen)}
          data-testid="group-open-button"
        >
          {t('tabManager.group.openButton')}
        </button>
        {onOpenGroupAsTabGroup && (
          <button 
            className="group-open" 
            title={t('tabManager.group.openAsTabGroupButton')}
            onClick={(e) => handleButtonClick(e, handleOpenAsTabGroup)}
            data-testid="group-open-tab-group-button"
          >
            {t('tabManager.group.openAsTabGroupButton')}
          </button>
        )}
        <button 
          className="group-delete" 
          title={t('tabManager.group.deleteButton')}
          onClick={(e) => handleButtonClick(e, handleDelete)}
          data-testid="group-delete-button"
        >
          {t('tabManager.group.deleteButton')}
        </button>
      </div>
    </div>
  );
});

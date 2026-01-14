import { memo, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import type { DateRangeFilter, ViewMode, DisplayDensity, CustomGroupMeta, SearchOptions, GroupSortType, ItemSortType } from './types';
import { useTranslation } from '../common/i18nContext';
import { useClickOutside } from '../common/hooks/useClickOutside';
import { DateRangeFilterComponent } from './DateRangeFilter';
import { Search, X, ListChecks, Calendar, AlignJustify, LayoutList, List, Activity, Settings, ExternalLink, Trash2, FolderPlus, CheckSquare, Square } from 'lucide-react';

interface HeaderProps {
  tabCount: number;
  searchQuery: string;
  dateRange: DateRangeFilter;
  viewMode: ViewMode;
  displayDensity: DisplayDensity;
  onSearchChange: (query: string) => void;
  searchOptions: SearchOptions;
  onSearchOptionsChange: (options: SearchOptions) => void;
  regexError: string | null;
  onDateRangeChange: (range: DateRangeFilter) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onDisplayDensityChange: (density: DisplayDensity) => void;
  onDeleteAll: () => void;
  onOpenAll: () => void;
  onLinkCheck: () => void;
  hasAnyTabs: boolean;
  // 選択モード関連
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkMoveToGroup: (groupName: string) => void;
  onBulkRemoveFromGroup: () => void;
  onBulkOpenAsTabGroup?: () => void;
  customGroups: CustomGroupMeta[];
  // グループ作成関連
  onCreateGroup: () => void;
  onRequestBulkMoveToNewGroup: () => void;
  // カスタムグループ表示設定
  showGroupedTabsInDomainGroups: boolean;
  onToggleShowGroupedTabsInDomainGroups: () => void;
  // 正規化ルール作成
  onCreateNormalizationRule: () => void;
  // ソート順関連
  groupSort: GroupSortType;
  itemSort: ItemSortType;
  onGroupSortChange: (mode: GroupSortType) => void;
  onItemSortChange: (mode: ItemSortType) => void;
  // ゴミ箱関連
  trashCount: number;
  onOpenTrash: () => void;
}

export const Header = memo(function Header({
  tabCount,
  searchQuery,
  dateRange,
  viewMode,
  displayDensity,
  onSearchChange,
  searchOptions,
  onSearchOptionsChange,
  regexError,
  onDateRangeChange,
  onViewModeChange,
  onDisplayDensityChange,
  onDeleteAll,
  onOpenAll,
  onLinkCheck,
  hasAnyTabs,
  isSelectionMode,
  onToggleSelectionMode,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkMoveToGroup,
  onBulkRemoveFromGroup,
  onBulkOpenAsTabGroup,
  customGroups,
  onCreateGroup,
  onRequestBulkMoveToNewGroup,
  showGroupedTabsInDomainGroups,
  onToggleShowGroupedTabsInDomainGroups,
  onCreateNormalizationRule,
  groupSort,
  itemSort,
  onGroupSortChange,
  onItemSortChange,
  trashCount,
  onOpenTrash,
}: HeaderProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const viewModeMenuRef = useRef<HTMLDivElement>(null);

  // 日時フィルタがアクティブかどうか
  const hasActiveDateFilter = useMemo(() => {
    return dateRange.startDate !== null || dateRange.endDate !== null;
  }, [dateRange]);

  // 検索のデバウンス
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localQuery, onSearchChange]);

  // グループメニューの外部クリックで閉じる
  const closeGroupMenu = useCallback(() => setShowGroupMenu(false), []);
  useClickOutside(groupMenuRef, closeGroupMenu, showGroupMenu);

  // 表示モードメニューの外部クリックで閉じる
  const closeViewModeMenu = useCallback(() => setShowViewModeMenu(false), []);
  useClickOutside(viewModeMenuRef, closeViewModeMenu, showViewModeMenu);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalQuery('');
    onSearchChange('');
  }, [onSearchChange]);

  // 検索オプションのトグル
  const toggleCaseSensitive = useCallback(() => {
    onSearchOptionsChange({ ...searchOptions, caseSensitive: !searchOptions.caseSensitive });
  }, [searchOptions, onSearchOptionsChange]);

  const toggleWholeWord = useCallback(() => {
    onSearchOptionsChange({ ...searchOptions, wholeWord: !searchOptions.wholeWord });
  }, [searchOptions, onSearchOptionsChange]);

  const toggleUseRegex = useCallback(() => {
    onSearchOptionsChange({ ...searchOptions, useRegex: !searchOptions.useRegex });
  }, [searchOptions, onSearchOptionsChange]);

  const toggleDateFilter = useCallback(() => {
    setShowDateFilter(prev => !prev);
  }, []);

  // 表示モードメニューのトグル
  const toggleViewModeMenu = useCallback(() => {
    setShowViewModeMenu(prev => !prev);
  }, []);

  // 表示モード選択
  const handleViewModeSelect = useCallback((mode: ViewMode) => {
    onViewModeChange(mode);
    setShowViewModeMenu(false);
  }, [onViewModeChange]);

  // 表示密度選択
  const handleDensitySelect = useCallback((density: DisplayDensity) => {
    onDisplayDensityChange(density);
    setShowViewModeMenu(false);
  }, [onDisplayDensityChange]);

  const handleGroupSelect = useCallback((groupName: string) => {
    onBulkMoveToGroup(groupName);
    setShowGroupMenu(false);
  }, [onBulkMoveToGroup]);

  return (
    <header className="header header-compact">
      <div className="header-main">
        <div className="header-left">
          <h1 className="logo logo-compact">
            <img src="../icons/icon48.png" alt="TabBurrow" className="logo-icon-img" />
            TabBurrow
          </h1>
          <span className="tab-count">{t('common.tabCount', { count: tabCount })}</span>
        </div>
        <div className="header-right">
          {/* 選択モード時の表示 */}
          {isSelectionMode ? (
            <div className="selection-toolbar">
              <span className="selection-count">
                {t('tabManager.selection.selectedCount', { count: selectedCount })}
              </span>
              <button 
                className="btn btn-secondary btn-small"
                onClick={selectedCount === tabCount ? onDeselectAll : onSelectAll}
                data-testid="bulk-select-toggle"
              >
                {selectedCount === tabCount 
                  ? t('tabManager.selection.deselectAll') 
                  : t('tabManager.selection.selectAll')}
              </button>
              <div className="selection-group-menu" ref={groupMenuRef}>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowGroupMenu(prev => !prev)}
                  disabled={selectedCount === 0}
                  data-testid="bulk-move-button"
                >
                  {t('tabManager.selection.bulkMoveToGroup')} ▼
                </button>
                {showGroupMenu && (
                  <div className="selection-group-dropdown">
                    {/* 既存グループ */}
                    {customGroups.map(group => (
                      <button
                        key={group.name}
                        className="selection-group-item"
                        onClick={() => handleGroupSelect(group.name)}
                      >
                        {group.name}
                      </button>
                    ))}
                    {/* 新規グループ作成 */}
                    <div className="selection-group-divider" />
                    <button
                      className="selection-group-item selection-group-item-new"
                      onClick={() => {
                        onRequestBulkMoveToNewGroup();
                        setShowGroupMenu(false);
                      }}
                    >
                      {t('tabManager.customGroup.createNew')}
                    </button>
                    {/* グループから外す */}
                    <button
                      className="selection-group-item"
                      onClick={() => {
                        onBulkRemoveFromGroup();
                        setShowGroupMenu(false);
                      }}
                    >
                      {t('tabManager.selection.bulkRemoveFromGroup')}
                    </button>
                  </div>
                )}
              </div>
              <button 
                className="btn btn-danger btn-small"
                onClick={onBulkDelete}
                disabled={selectedCount === 0}
                data-testid="bulk-delete-button"
              >
                {t('tabManager.selection.bulkDelete')}
              </button>
              {onBulkOpenAsTabGroup && (
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={onBulkOpenAsTabGroup}
                  disabled={selectedCount === 0}
                  title={t('tabManager.selection.openAsTabGroup')}
                  data-testid="bulk-open-tab-group-button"
                >
                  {t('tabManager.selection.openAsTabGroup')}
                </button>
              )}
              <button 
                className="btn btn-secondary btn-small"
                onClick={onCreateNormalizationRule}
                disabled={selectedCount === 0}
                title={t('tabManager.selection.createNormalizationRule')}
                data-testid="create-normalization-rule-button"
              >
                <Activity size={16} />
              </button>
              <button 
                className="btn btn-secondary btn-small"
                onClick={onToggleSelectionMode}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="search-container search-container-compact">
                <div className="search-input-wrapper">
                  <span className="search-icon"><Search size={16} /></span>
                  <input
                    type="text"
                    className={`search-input search-input-compact ${regexError ? 'search-input-error' : ''}`}
                    placeholder={t('tabManager.search.placeholder')}
                    value={localQuery}
                    onChange={handleInputChange}
                  />
                  {localQuery && (
                    <button 
                      className="clear-search" 
                      onClick={handleClearSearch}
                      aria-label={t('tabManager.search.clearButton')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="search-options">
                  <button
                    type="button"
                    className={`search-option-btn ${searchOptions.caseSensitive ? 'active' : ''}`}
                    onClick={toggleCaseSensitive}
                    title={t('tabManager.search.options.caseSensitive')}
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    className={`search-option-btn ${searchOptions.wholeWord ? 'active' : ''}`}
                    onClick={toggleWholeWord}
                    title={t('tabManager.search.options.wholeWord')}
                  >
                    <span className="search-option-underline">ab</span>
                  </button>
                  <button
                    type="button"
                    className={`search-option-btn ${searchOptions.useRegex ? 'active' : ''} ${regexError ? 'error' : ''}`}
                    onClick={toggleUseRegex}
                    title={t('tabManager.search.options.useRegex')}
                  >
                    .*
                  </button>
                </div>
              </div>
              {regexError && (
                <span className="search-error-hint">{t('tabManager.search.regexError')}</span>
              )}
              <button 
                className={`btn btn-icon btn-filter ${isSelectionMode ? 'active' : ''}`}
                onClick={onToggleSelectionMode}
                title={t('tabManager.selection.toggleButton')}
                disabled={!hasAnyTabs}
                data-testid="selection-mode-toggle"
              >
                <ListChecks size={18} />
              </button>
              <button 
                className={`btn btn-icon btn-filter ${showDateFilter || hasActiveDateFilter ? 'active' : ''}`}
                onClick={toggleDateFilter}
                title={t('tabManager.dateFilter.toggleButton')}
                aria-label={t('tabManager.dateFilter.toggleButton')}
                data-testid="date-filter-toggle"
              >
                <Calendar size={18} />
                {hasActiveDateFilter && <span className="filter-badge"></span>}
              </button>
              <div className="view-mode-dropdown" ref={viewModeMenuRef}>
                <button 
                  className={`btn btn-icon btn-filter ${showViewModeMenu || displayDensity === 'compact' ? 'active' : ''}`}
                  onClick={toggleViewModeMenu}
                  title={t('tabManager.viewMode.toggleButton')}
                  data-testid="view-mode-toggle"
                >
                  {displayDensity === 'compact' ? <AlignJustify size={18} /> : (viewMode === 'grouped' ? <LayoutList size={18} /> : <List size={18} />)}
                </button>
                {showViewModeMenu && (
                  <div className="view-mode-menu">
                    <div className="view-mode-menu-section">
                      <div className="view-mode-menu-label">{t('tabManager.viewMode.groupMode')}</div>
                      <button
                        className={`view-mode-menu-item ${viewMode === 'grouped' ? 'active' : ''}`}
                        onClick={() => handleViewModeSelect('grouped')}
                        data-testid="view-mode-grouped"
                      >
                        <LayoutList size={16} /> {t('tabManager.viewMode.grouped')}
                      </button>
                      <button
                        className={`view-mode-menu-item ${viewMode === 'flat' ? 'active' : ''}`}
                        onClick={() => handleViewModeSelect('flat')}
                        data-testid="view-mode-flat"
                      >
                        <List size={16} /> {t('tabManager.viewMode.flat')}
                      </button>
                    </div>
                    <div className="view-mode-menu-divider" />
                    <div className="view-mode-menu-section">
                      <div className="view-mode-menu-label">{t('tabManager.viewMode.density')}</div>
                      <button
                        className={`view-mode-menu-item ${displayDensity === 'normal' ? 'active' : ''}`}
                        onClick={() => handleDensitySelect('normal')}
                        data-testid="view-mode-normal"
                      >
                        {t('tabManager.viewMode.normal')}
                      </button>
                      <button
                        className={`view-mode-menu-item ${displayDensity === 'compact' ? 'active' : ''}`}
                        onClick={() => handleDensitySelect('compact')}
                        data-testid="view-mode-compact"
                      >
                        <AlignJustify size={16} /> {t('tabManager.viewMode.compact')}
                      </button>
                    </div>
                    <div className="view-mode-menu-divider" />
                    <div className="view-mode-menu-section">
                      <button
                        className="view-mode-menu-item"
                        onClick={() => {
                          onToggleShowGroupedTabsInDomainGroups();
                          setShowViewModeMenu(false);
                        }}
                        data-testid="show-grouped-tabs-toggle"
                      >
                        {showGroupedTabsInDomainGroups ? <CheckSquare size={16} /> : <Square size={16} />}
                        {t('settings.customGroups.showInDomainGroups')}
                      </button>
                    </div>

                    <div className="view-mode-menu-divider" />
                    <div className="view-mode-menu-section">
                      <div className="view-mode-menu-label">{t('tabManager.sort.groupLabel')}</div>
                      <select
                        className="view-mode-menu-select"
                        value={groupSort}
                        onChange={(e) => onGroupSortChange(e.target.value as GroupSortType)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="count-desc">{t('tabManager.sort.countDesc')}</option>
                        <option value="count-asc">{t('tabManager.sort.countAsc')}</option>
                        <option value="domain-asc">{t('tabManager.sort.domainAsc')}</option>
                        <option value="domain-desc">{t('tabManager.sort.domainDesc')}</option>
                        <option value="updated-desc">{t('tabManager.sort.updatedDesc')}</option>
                        <option value="updated-asc">{t('tabManager.sort.updatedAsc')}</option>
                      </select>
                    </div>

                    <div className="view-mode-menu-divider" />
                    <div className="view-mode-menu-section">
                      <div className="view-mode-menu-label">{t('tabManager.sort.itemLabel')}</div>
                      <select
                        className="view-mode-menu-select"
                        value={itemSort}
                        onChange={(e) => onItemSortChange(e.target.value as ItemSortType)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="saved-desc">{t('tabManager.sort.savedDesc')}</option>
                        <option value="saved-asc">{t('tabManager.sort.savedAsc')}</option>
                        <option value="title-asc">{t('tabManager.sort.titleAsc')}</option>
                        <option value="title-desc">{t('tabManager.sort.titleDesc')}</option>
                        <option value="accessed-desc">{t('tabManager.sort.accessedDesc')}</option>
                        <option value="accessed-asc">{t('tabManager.sort.accessedAsc')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <button 
                className="btn btn-icon btn-secondary"
                onClick={onLinkCheck}
                disabled={!hasAnyTabs}
                title={t('linkCheck.button')}
              >
                <Activity size={18} />
              </button>
              <button 
                className="btn btn-icon btn-secondary"
                onClick={onCreateGroup}
                title={t('tabManager.customGroup.createButton')}
                aria-label={t('tabManager.customGroup.createButton')}
                data-testid="create-group-button"
              >
                <FolderPlus size={18} />
              </button>
              <a href="options.html" className="btn btn-icon btn-secondary" title={t('tabManager.header.settingsButton')}>
                <Settings size={18} />
              </a>
              <button 
                className={`btn btn-icon btn-secondary ${trashCount > 0 ? 'has-badge' : ''}`}
                onClick={onOpenTrash}
                title={t('tabManager.trash.title')}
                aria-label={t('tabManager.trash.title')}
                data-testid="trash-button"
              >
                <Trash2 size={18} />
                {trashCount > 0 && <span className="trash-badge">{trashCount}</span>}
              </button>
              <button 
                className="btn btn-icon btn-primary"
                onClick={onOpenAll}
                disabled={!hasAnyTabs}
                title={t('tabManager.header.openAllButton')}
                aria-label={t('tabManager.header.openAllButton')}
              >
                <ExternalLink size={18} />
              </button>
              <button 
                className="btn btn-icon btn-danger"
                onClick={onDeleteAll}
                disabled={!hasAnyTabs}
                title={t('tabManager.header.deleteAllButton')}
                aria-label={t('tabManager.header.deleteAllButton')}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>
      {showDateFilter && (
        <div className="header-filter-panel">
          <DateRangeFilterComponent
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
      )}
    </header>
  );
});

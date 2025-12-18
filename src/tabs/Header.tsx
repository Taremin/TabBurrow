import { memo, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import type { DateRangeFilter, ViewMode, CustomGroupMeta, SearchOptions } from './types';
import { useTranslation } from '../common/i18nContext.js';
import { DateRangeFilterComponent } from './DateRangeFilter';

interface HeaderProps {
  tabCount: number;
  storageInfo: string;
  searchQuery: string;
  dateRange: DateRangeFilter;
  viewMode: ViewMode;
  onSearchChange: (query: string) => void;
  searchOptions: SearchOptions;
  onSearchOptionsChange: (options: SearchOptions) => void;
  regexError: string | null;
  onDateRangeChange: (range: DateRangeFilter) => void;
  onViewModeChange: (mode: ViewMode) => void;
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
  onBulkOpenAsTabGroup: () => void;
  customGroups: CustomGroupMeta[];
}

export const Header = memo(function Header({
  tabCount,
  storageInfo,
  searchQuery,
  dateRange,
  viewMode,
  onSearchChange,
  searchOptions,
  onSearchOptionsChange,
  regexError,
  onDateRangeChange,
  onViewModeChange,
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
}: HeaderProps) {
  const { t } = useTranslation();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => {
    if (!showGroupMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
    };
    
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside);
    });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupMenu]);

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

  // 表示モード切替
  const toggleViewMode = useCallback(() => {
    onViewModeChange(viewMode === 'grouped' ? 'flat' : 'grouped');
  }, [viewMode, onViewModeChange]);

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
              >
                {selectedCount === tabCount 
                  ? t('tabManager.selection.deselectAll') 
                  : t('tabManager.selection.selectAll')}
              </button>
              {customGroups.length > 0 && (
                <div className="selection-group-menu" ref={groupMenuRef}>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowGroupMenu(prev => !prev)}
                    disabled={selectedCount === 0}
                  >
                    {t('tabManager.selection.bulkMoveToGroup')} ▼
                  </button>
                  {showGroupMenu && (
                    <div className="selection-group-dropdown">
                      {customGroups.map(group => (
                        <button
                          key={group.name}
                          className="selection-group-item"
                          onClick={() => handleGroupSelect(group.name)}
                        >
                          {group.name}
                        </button>
                      ))}
                      <div className="selection-group-divider" />
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
              )}
              <button 
                className="btn btn-danger btn-small"
                onClick={onBulkDelete}
                disabled={selectedCount === 0}
              >
                {t('tabManager.selection.bulkDelete')}
              </button>
              <button 
                className="btn btn-secondary btn-small"
                onClick={onBulkOpenAsTabGroup}
                disabled={selectedCount === 0}
                title={t('tabManager.selection.openAsTabGroup')}
              >
                {t('tabManager.selection.openAsTabGroup')}
              </button>
              <button 
                className="btn btn-secondary btn-small"
                onClick={onToggleSelectionMode}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="search-container search-container-compact">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className={`search-input search-input-compact ${regexError ? 'search-input-error' : ''}`}
                  placeholder={t('tabManager.search.placeholder')}
                  value={localQuery}
                  onChange={handleInputChange}
                />
                {localQuery && (
                  <button className="clear-search" onClick={handleClearSearch}>
                    ✕
                  </button>
                )}
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
                <span>☑</span>
              </button>
              <button 
                className={`btn btn-icon btn-filter ${showDateFilter || hasActiveDateFilter ? 'active' : ''}`}
                onClick={toggleDateFilter}
                title={t('tabManager.dateFilter.toggleButton')}
              >
                <span>📅</span>
                {hasActiveDateFilter && <span className="filter-badge"></span>}
              </button>
              <button 
                className={`btn btn-icon btn-filter ${viewMode === 'flat' ? 'active' : ''}`}
                onClick={toggleViewMode}
                title={t('tabManager.viewMode.toggleButton')}
                data-testid="view-mode-toggle"
              >
                <span>{viewMode === 'grouped' ? '📊' : '📋'}</span>
              </button>
              <button 
                className="btn btn-icon btn-secondary"
                onClick={onLinkCheck}
                disabled={!hasAnyTabs}
                title={t('linkCheck.button')}
              >
                <span>🔗</span>
              </button>
              <a href="options.html" className="btn btn-icon btn-secondary" title={t('tabManager.header.settingsButton')}>
                <span>⚙️</span>
              </a>
              <button 
                className="btn btn-icon btn-primary"
                onClick={onOpenAll}
                disabled={!hasAnyTabs}
                title={t('tabManager.header.openAllButton')}
              >
                <span>📂</span>
              </button>
              <button 
                className="btn btn-icon btn-danger"
                onClick={onDeleteAll}
                disabled={!hasAnyTabs}
                title={t('tabManager.header.deleteAllButton')}
              >
                <span>🗑️</span>
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

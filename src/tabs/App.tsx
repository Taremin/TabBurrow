/**
 * TabBurrow - メインアプリケーションコンポーネント
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import browser from '../browserApi.js';
import '../tabGroupsPolyfill.js'; // Vivaldi用polyfillを適用
import { platform } from '../platform.js';
import type { Tabs } from 'webextension-polyfill';
import { getSettings, saveSettings, notifySettingsChanged, type GroupSortType, type ItemSortType, type RestoreMode, type ViewMode, type DisplayDensity } from '../settings.js';
import type { GroupFilter, SearchOptions } from './types.js';
import { DEFAULT_SEARCH_OPTIONS } from './types.js';
import { Header } from './Header.js';
import { TabList } from './TabList.js';
import { ConfirmDialog } from '../common/ConfirmDialog.js';
import { LinkCheckDialog } from './LinkCheckDialog.js';
import { PromptDialog } from '../common/PromptDialog.js';
import { useTranslation } from '../common/i18nContext.js';

// Custom Hooks
import { useTabs } from './hooks/useTabs.js';
import { useGroups } from './hooks/useGroups.js';
import { useSearch } from './hooks/useSearch.js';
import { useSelection } from './hooks/useSelection.js';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonText?: string;
  confirmButtonStyle?: 'danger' | 'primary';
}

// ユーティリティ: 指定ミリ秒待機
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// ユーティリティ: タブの状態変化を待機
const waitForTabStatus = (tabId: number, waitFor: 'loading' | 'complete'): Promise<void> => {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType) => {
      if (updatedTabId === tabId && changeInfo.status === waitFor) {
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    // タイムアウト: 30秒後に強制解決
    setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 30000);
  });
};

export function App() {
  const { t } = useTranslation();

  // Custom Hooks
  const {
    allTabs,
    customGroups,
    storageInfo,
    loadTabs,
    handleDeleteTab,
    handleDeleteDomainGroup: deleteDomainGroup,
    handleDeleteAll: deleteAll,
    handleBulkDelete: bulkDeleteTabs,
    handleMoveToGroup: moveTabToGroup,
    handleRemoveFromGroup: removeTabFromGroup,
    handleBulkMoveToGroup: bulkMoveTabsToGroup,
    handleBulkRemoveFromGroup: bulkRemoveTabsFromGroup,
    handleUpdateTab: updateTabData,
  } = useTabs();

  const {
    createGroup,
    deleteCustomGroup: deleteCustomGroupByName,
    renameGroup,
  } = useGroups(loadTabs);

  const {
    searchQuery,
    searchOptions,
    setSearchOptions, // handleSearch (filters logic updated internally)
    onSearchOptionsChange,
    dateRange,
    setDateRange,
    filteredTabs,
    regexError,
    handleSearch, // setSearchQuery wrapper
  } = useSearch(allTabs);

  const {
    isSelectionMode,
    selectedTabIds,
    setSelectedTabIds,
    toggleSelectionMode: handleToggleSelectionMode,
    toggleSelection: handleToggleSelection,
    selectAll,
    deselectAll: handleDeselectAll,
    setIsSelectionMode,
  } = useSelection();

  // Settings State
  const [groupSort, setGroupSort] = useState<GroupSortType>('count-desc');
  const [itemSort, setItemSort] = useState<ItemSortType>('saved-desc');
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('lazy');
  const [restoreIntervalMs, setRestoreIntervalMs] = useState(100);
  const [viewMode, setViewMode] = useState<ViewMode | undefined>(undefined);
  const [displayDensity, setDisplayDensity] = useState<DisplayDensity | undefined>(undefined);
  const [domainGroupAliases, setDomainGroupAliases] = useState<Record<string, string>>({});
  const [showGroupedTabsInDomainGroups, setShowGroupedTabsInDomainGroups] = useState(false);

  // UI State
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const [groupFilters, setGroupFilters] = useState<GroupFilter>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isLinkCheckOpen, setIsLinkCheckOpen] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ isOpen: boolean; currentName: string; groupType?: 'domain' | 'custom' }>({ isOpen: false, currentName: '' });
  const [createGroupDialog, setCreateGroupDialog] = useState<{
    isOpen: boolean;
    tabIdToMove?: string;
    bulkMove?: boolean;
  }>({ isOpen: false });
  const [tabRenameDialog, setTabRenameDialog] = useState<{
    isOpen: boolean;
    tabId: string;
    currentDisplayName?: string;
  }>({ isOpen: false, tabId: '' });

  // Tab Count
  const tabCount = useMemo(() => filteredTabs.length, [filteredTabs]);

  // Load Settings
  const loadSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      setGroupSort(settings.groupSort);
      setItemSort(settings.itemSort);
      setRestoreMode(settings.restoreMode);
      setRestoreIntervalMs(settings.restoreIntervalMs);
      setViewMode(prev => prev === undefined ? settings.defaultViewMode : prev);
      setDisplayDensity(prev => prev === undefined ? settings.defaultDisplayDensity : prev);
      setDomainGroupAliases(settings.domainGroupAliases || {});
      setShowGroupedTabsInDomainGroups(settings.showGroupedTabsInDomainGroups);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    }
  }, []);

  // Settings Change Listener
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'settings-changed') {
        loadSettings();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [loadSettings]);

  // Load Collapsed Groups state
  useEffect(() => {
    const loadCollapsed = async () => {
      try {
        const result = await browser.storage.local.get('collapsedGroups');
        if (result.collapsedGroups) {
          setCollapsedGroups(result.collapsedGroups as Record<string, boolean>);
        }
      } catch (error) {
        console.error('折りたたみ状態の読み込みに失敗:', error);
      }
    };
    loadCollapsed();
    loadSettings();
  }, [loadSettings]);

  // Save Collapsed Groups
  const saveCollapsedGroups = useCallback(async (newState: Record<string, boolean>) => {
    try {
      await browser.storage.local.set({ collapsedGroups: newState });
    } catch (error) {
      console.error('折りたたみ状態の保存に失敗:', error);
    }
  }, []);

  const handleToggleCollapse = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const newState = { ...prev, [groupName]: !prev[groupName] };
      saveCollapsedGroups(newState);
      return newState;
    });
  }, [saveCollapsedGroups]);

  // Toggle showGroupedTabsInDomainGroups and save to settings
  const handleToggleShowGroupedTabsInDomainGroups = useCallback(async () => {
    const newValue = !showGroupedTabsInDomainGroups;
    setShowGroupedTabsInDomainGroups(newValue);
    try {
      const settings = await getSettings();
      await saveSettings({ ...settings, showGroupedTabsInDomainGroups: newValue });
    } catch (error) {
      console.error('設定の保存に失敗:', error);
    }
  }, [showGroupedTabsInDomainGroups]);

  // Actions Wrapper
  const handleOpenTab = useCallback((url: string) => {
    browser.tabs.create({ url });
  }, []);

  const handleMiddleClickTab = useCallback((url: string) => {
    browser.tabs.create({ url, active: false });
  }, []);

  const getGroupTabs = useCallback((groupName: string, groupType: 'domain' | 'custom') => {
    return filteredTabs.filter(t => {
      if (groupType === 'custom') {
        return t.customGroups?.includes(groupName) || (t.groupType === 'custom' && t.group === groupName);
      } else {
        const matchesDomain = (t.groupType === 'domain' ? t.group : t.domain) === groupName;
        if (!matchesDomain) return false;
        
        const hasCustomGroup = (t.customGroups && t.customGroups.length > 0) || (t.groupType === 'custom' && t.group);
        return !hasCustomGroup || showGroupedTabsInDomainGroups;
      }
    });
  }, [filteredTabs, showGroupedTabsInDomainGroups]);

  const handleDeleteGroup = useCallback((groupName: string, groupType: 'domain' | 'custom') => {
    const groupTabs = getGroupTabs(groupName, groupType);
    
    if (groupType === 'custom') {
      setDialog({
        isOpen: true,
        title: t('tabManager.customGroup.deleteConfirmTitle'),
        message: t('tabManager.customGroup.deleteConfirmMessage', { name: groupName }),
        onConfirm: async () => {
          await deleteCustomGroupByName(groupName);
          setDialog(d => ({ ...d, isOpen: false }));
        },
      });
    } else {
      setDialog({
        isOpen: true,
        title: t('tabManager.confirmDialog.deleteGroupTitle'),
        message: t('tabManager.confirmDialog.deleteGroupMessage', { domain: groupName, count: groupTabs.length }),
        onConfirm: async () => {
          await deleteDomainGroup(groupName);
          setDialog(d => ({ ...d, isOpen: false }));
        },
      });
    }
  }, [filteredTabs, deleteDomainGroup, deleteCustomGroupByName, t]);

  const openTabsWithRestoreMode = useCallback(async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const tab = await browser.tabs.create({ url, active: false });
      
      if (restoreMode === 'immediate' || restoreMode === 'lazy') {
        if (tab.id) {
          await waitForTabStatus(tab.id, restoreMode === 'immediate' ? 'loading' : 'complete');
          try {
            await browser.tabs.discard(tab.id);
          } catch (e) {
            console.warn('タブのdiscardに失敗:', e);
          }
        }
      }
      
      if (restoreIntervalMs > 0 && i < urls.length - 1) {
        await sleep(restoreIntervalMs);
      }
    }
  }, [restoreMode, restoreIntervalMs]);

  const handleOpenGroup = useCallback(async (groupName: string, groupType: 'domain' | 'custom') => {
    const groupTabs = getGroupTabs(groupName, groupType);
    const urls = groupTabs.map(tab => tab.url);
    await openTabsWithRestoreMode(urls);
  }, [getGroupTabs, openTabsWithRestoreMode]);

  const handleOpenGroupAsTabGroup = useCallback(async (groupName: string, groupType: 'domain' | 'custom') => {
    const groupTabs_ = getGroupTabs(groupName, groupType);
    if (groupTabs_.length === 0) return;
    
    try {
      const tabIds: number[] = [];
      for (const tab of groupTabs_) {
        const newTab = await browser.tabs.create({ url: tab.url, active: false });
        if (newTab.id) tabIds.push(newTab.id);
      }
      
      if (tabIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupId = await (browser.tabs as any).group({ tabIds });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (browser as any).tabGroups.update(groupId, { title: groupName, collapsed: false });
      }
    } catch (error) {
      console.error('タブグループの作成に失敗:', error);
    }
  }, [filteredTabs]);

  const handleBulkOpenAsTabGroup = useCallback(async () => {
    if (selectedTabIds.size === 0) return;
    
    try {
      const selectedTabs = filteredTabs.filter(t => selectedTabIds.has(t.id));
      const tabIds: number[] = [];
      for (const tab of selectedTabs) {
        const newTab = await browser.tabs.create({ url: tab.url, active: false });
        if (newTab.id) tabIds.push(newTab.id);
      }
      
      if (tabIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupId = await (browser.tabs as any).group({ tabIds });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (browser as any).tabGroups.update(groupId, { title: `${selectedTabs.length} tabs`, collapsed: false });
      }
      
      setSelectedTabIds(new Set());
      // setIsSelectionMode(false); (Hook logic handles selection state)
    } catch (error) {
      console.error('タブグループの作成に失敗:', error);
    }
  }, [selectedTabIds, filteredTabs, setSelectedTabIds]);

  // Rename Logic
  const handleRequestRename = useCallback((currentName: string, groupType: 'domain' | 'custom') => {
    setRenameDialog({ isOpen: true, currentName, groupType });
  }, []);

  const handleConfirmRename = useCallback(async (newName: string) => {
    setRenameDialog({ isOpen: false, currentName: '' });
    if (renameDialog.currentName && newName !== renameDialog.currentName) {
      if (renameDialog.groupType === 'custom') {
        await renameGroup(renameDialog.currentName, newName);
      } else if (renameDialog.groupType === 'domain') {
        try {
          const settings = await getSettings();
          const newAliases = { ...settings.domainGroupAliases, [renameDialog.currentName]: newName };
          await saveSettings({ ...settings, domainGroupAliases: newAliases });
          notifySettingsChanged();
          setDomainGroupAliases(newAliases);
        } catch (error) {
          console.error('エイリアスの保存に失敗:', error);
        }
      }
    }
  }, [renameDialog, renameGroup]);

  // Create/Move Group Logic
  const handleRequestCreateGroup = useCallback(() => {
    setCreateGroupDialog({ isOpen: true });
  }, []);

  const handleRequestMoveToNewGroup = useCallback((tabId: string) => {
    setCreateGroupDialog({ isOpen: true, tabIdToMove: tabId });
  }, []);

  const handleRequestBulkMoveToNewGroup = useCallback(() => {
    if (selectedTabIds.size === 0) return;
    setCreateGroupDialog({ isOpen: true, bulkMove: true });
  }, [selectedTabIds.size]);

  const handleConfirmCreateGroup = useCallback(async (groupName: string) => {
    const name = groupName.trim();
    if (!name) {
      setCreateGroupDialog({ isOpen: false });
      return;
    }

    try {
      const existingGroup = customGroups.find(g => g.name === name);
      if (!existingGroup) {
        await createGroup(name);
      }

      if (createGroupDialog.tabIdToMove) {
        await moveTabToGroup(createGroupDialog.tabIdToMove, name);
      } else if (createGroupDialog.bulkMove && selectedTabIds.size > 0) {
        await bulkMoveTabsToGroup([...selectedTabIds], name);
        setSelectedTabIds(new Set());
        setIsSelectionMode(false);
      }
    } catch (error) {
      console.error('グループ作成に失敗:', error);
    }
    
    setCreateGroupDialog({ isOpen: false });
  }, [createGroupDialog, selectedTabIds, customGroups, createGroup, moveTabToGroup, bulkMoveTabsToGroup, setSelectedTabIds]);

  // Tab Rename Logic
  const handleRequestTabRename = useCallback((tabId: string) => {
    const tab = allTabs.find(t => t.id === tabId);
    setTabRenameDialog({
      isOpen: true,
      tabId,
      currentDisplayName: tab?.displayName || '',
    });
  }, [allTabs]);

  const handleConfirmTabRename = useCallback(async (newDisplayName: string) => {
    const trimmed = newDisplayName.trim();
    // 空文字の場合はundefinedにして表示名を解除
    const displayName = trimmed || undefined;
    await updateTabData(tabRenameDialog.tabId, { displayName });
    setTabRenameDialog({ isOpen: false, tabId: '' });
  }, [tabRenameDialog.tabId, updateTabData]);

  // Bulk Actions
  const handleSelectAll = useCallback(() => {
    selectAll(filteredTabs.map(tab => tab.id));
  }, [filteredTabs, selectAll]);

  const handleBulkDelete = useCallback(() => {
    const count = selectedTabIds.size;
    if (count === 0) return;
    
    setDialog({
      isOpen: true,
      title: t('tabManager.selection.confirmDeleteTitle'),
      message: t('tabManager.selection.confirmDeleteMessage', { count }),
      onConfirm: async () => {
        await bulkDeleteTabs([...selectedTabIds]);
        setSelectedTabIds(new Set());
        setIsSelectionMode(false);
        setDialog(d => ({ ...d, isOpen: false }));
      },
    });
  }, [selectedTabIds, bulkDeleteTabs, setSelectedTabIds, t]);

  const handleBulkMoveToGroupWrapper = useCallback(async (groupName: string) => {
    if (selectedTabIds.size === 0) return;
    await bulkMoveTabsToGroup([...selectedTabIds], groupName);
    setSelectedTabIds(new Set());
    setIsSelectionMode(false);
  }, [selectedTabIds, bulkMoveTabsToGroup, setSelectedTabIds, setIsSelectionMode]);

  const handleBulkRemoveFromGroupWrapper = useCallback(async () => {
    if (selectedTabIds.size === 0) return;
    await bulkRemoveTabsFromGroup([...selectedTabIds]);
    setSelectedTabIds(new Set());
    setIsSelectionMode(false);
  }, [selectedTabIds, bulkRemoveTabsFromGroup, setSelectedTabIds, setIsSelectionMode]);

  const handleSelectGroup = useCallback((tabIds: string[]) => {
      setSelectedTabIds(prev => {
          const next = new Set(prev);
          tabIds.forEach(id => next.add(id));
          return next;
      });
  }, [setSelectedTabIds]);

  const handleDeselectGroup = useCallback((tabIds: string[]) => {
      setSelectedTabIds(prev => {
          const next = new Set(prev);
          tabIds.forEach(id => next.delete(id));
          return next;
      });
  }, [setSelectedTabIds]);

  // Global Actions
  const handleOpenAll = useCallback(() => {
    const count = filteredTabs.length;
    setDialog({
      isOpen: true,
      title: t('tabManager.confirmDialog.openAllTitle'),
      message: t('tabManager.confirmDialog.openAllMessage', { count }),
      confirmButtonText: t('tabManager.confirmDialog.openAllConfirm'),
      confirmButtonStyle: 'primary',
      onConfirm: async () => {
        const urls = filteredTabs.map(tab => tab.url);
        await openTabsWithRestoreMode(urls);
        setDialog(d => ({ ...d, isOpen: false }));
      },
    });
  }, [filteredTabs, openTabsWithRestoreMode, t]);

  const handleDeleteAllConfirm = useCallback(() => {
    setDialog({
      isOpen: true,
      title: t('tabManager.confirmDialog.deleteAllTitle'),
      message: t('tabManager.confirmDialog.deleteAllMessage', { count: allTabs.length }),
      onConfirm: async () => {
        await deleteAll();
        setDialog(d => ({ ...d, isOpen: false }));
      },
    });
  }, [allTabs.length, deleteAll, t]);

  const handleCancelDialog = useCallback(() => {
    setDialog(d => ({ ...d, isOpen: false }));
  }, []);

  const handleGroupFilterChange = useCallback((groupName: string, pattern: string) => {
    setGroupFilters(prev => ({ ...prev, [groupName]: pattern }));
  }, []);
  
  return (
    <div className="container">
      <Header
        tabCount={tabCount}
        storageInfo={storageInfo}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        searchOptions={searchOptions}
        onSearchOptionsChange={onSearchOptionsChange}
        regexError={regexError}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        viewMode={viewMode ?? 'grouped'}
        displayDensity={displayDensity ?? 'normal'}
        onViewModeChange={setViewMode}
        onDisplayDensityChange={setDisplayDensity}
        onDeleteAll={handleDeleteAllConfirm}
        onOpenAll={handleOpenAll}
        onLinkCheck={() => setIsLinkCheckOpen(true)}
        hasAnyTabs={allTabs.length > 0}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        selectedCount={selectedTabIds.size}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkDelete={handleBulkDelete}
        onBulkMoveToGroup={handleBulkMoveToGroupWrapper}
        onBulkRemoveFromGroup={handleBulkRemoveFromGroupWrapper}
        onBulkOpenAsTabGroup={platform.supportsTabGroups ? handleBulkOpenAsTabGroup : undefined}
        customGroups={customGroups}
        onCreateGroup={handleRequestCreateGroup}
        onRequestBulkMoveToNewGroup={handleRequestBulkMoveToNewGroup}
        showGroupedTabsInDomainGroups={showGroupedTabsInDomainGroups}
        onToggleShowGroupedTabsInDomainGroups={handleToggleShowGroupedTabsInDomainGroups}
      />

      <main className="main">
        {/* 検索結果なし */}
        {searchQuery && filteredTabs.length === 0 && (
          <div className="no-results" style={{ display: 'flex' }}>
            <div className="no-results-icon">🔍</div>
            <p>{t('tabManager.noResults.message')}</p>
          </div>
        )}

        {/* タブ一覧 */}
        {filteredTabs.length > 0 && (
          <TabList
            tabs={filteredTabs}
            customGroups={customGroups}
            viewMode={viewMode ?? 'grouped'}
            displayDensity={displayDensity ?? 'normal'}
            groupSort={groupSort}
            itemSort={itemSort}
            onDeleteTab={handleDeleteTab}
            onDeleteGroup={handleDeleteGroup}
            onOpenGroup={handleOpenGroup}
            onOpenGroupAsTabGroup={platform.supportsTabGroups ? handleOpenGroupAsTabGroup : undefined}
            onOpenTab={handleOpenTab}
            onMiddleClickTab={handleMiddleClickTab}
            onRenameGroup={renameGroup}
            onRequestRename={handleRequestRename}
            onMoveToGroup={moveTabToGroup}
            onRemoveFromGroup={removeTabFromGroup}
            onRequestMoveToNewGroup={handleRequestMoveToNewGroup}
            onRenameTab={handleRequestTabRename}
            isSelectionMode={isSelectionMode}
            selectedTabIds={selectedTabIds}
            onToggleSelection={handleToggleSelection}
            onSelectGroup={handleSelectGroup}
            onDeselectGroup={handleDeselectGroup}
            groupFilters={groupFilters}
            onGroupFilterChange={handleGroupFilterChange}
            collapsedGroups={collapsedGroups}
            onToggleCollapse={handleToggleCollapse}
            domainGroupAliases={domainGroupAliases}
            showGroupedTabsInDomainGroups={showGroupedTabsInDomainGroups}
          />
        )}

        {/* 空状態 */}
        {!searchQuery && allTabs.length === 0 && (
          <div className="empty-state" style={{ display: 'flex' }}>
            <div className="empty-icon">📭</div>
            <h2>{t('tabManager.empty.title')}</h2>
            <p>{t('tabManager.empty.message')}</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <span>{storageInfo}</span>
      </footer>

      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={handleCancelDialog}
        confirmButtonText={dialog.confirmButtonText}
        confirmButtonStyle={dialog.confirmButtonStyle}
      />

      <LinkCheckDialog
        isOpen={isLinkCheckOpen}
        onClose={() => setIsLinkCheckOpen(false)}
        onTabsDeleted={loadTabs}
      />
      
      {/* リネームダイアログ (PromptDialog) */}
      <PromptDialog
        isOpen={renameDialog.isOpen}
        title={t('tabManager.promptDialog.renameGroupTitle')}
        message={t('tabManager.promptDialog.renameGroupMessage')}
        defaultValue={renameDialog.currentName}
        onConfirm={handleConfirmRename}
        onCancel={() => setRenameDialog({ isOpen: false, currentName: '' })}
      />

      {/* 新規グループダイアログ (PromptDialog) */}
      <PromptDialog
        isOpen={createGroupDialog.isOpen}
        title={t('tabManager.promptDialog.createGroupTitle')}
        message={t('tabManager.promptDialog.createGroupMessage')}
        placeholder={t('tabManager.promptDialog.createGroupPlaceholder')}
        onConfirm={handleConfirmCreateGroup}
        onCancel={() => setCreateGroupDialog({ isOpen: false })}
      />

      {/* タブ表示名変更ダイアログ (PromptDialog) */}
      <PromptDialog
        isOpen={tabRenameDialog.isOpen}
        title={t('tabManager.tabCard.renameDialogTitle')}
        message={t('tabManager.tabCard.renameDialogMessage')}
        defaultValue={tabRenameDialog.currentDisplayName || ''}
        allowEmpty={true}
        onConfirm={handleConfirmTabRename}
        onCancel={() => setTabRenameDialog({ isOpen: false, tabId: '' })}
      />
    </div>
  );
}

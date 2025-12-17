/**
 * TabBurrow - メインアプリケーションコンポーネント
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import browser from '../browserApi.js';
import '../tabGroupsPolyfill.js'; // Vivaldi用polyfillを適用
import type { Tabs } from 'webextension-polyfill';
import {
  getAllTabs,
  searchTabs,
  deleteTab,
  deleteTabsByDomain,
  deleteTabsByGroup,
  deleteAllTabs,
  deleteCustomGroup,
  renameCustomGroup,
  getAllCustomGroups,
  assignTabToCustomGroup,
  removeTabFromCustomGroup,
  getStorageUsage,
  deleteMultipleTabs,
  assignMultipleTabsToGroup,
  removeMultipleTabsFromGroup,
} from '../storage.js';
import { getSettings, type GroupSortType, type ItemSortType, type RestoreMode } from '../settings.js';
import type { SavedTab, DateRangeFilter, CustomGroupMeta, ViewMode, GroupFilter } from './types';
import { formatBytes } from './utils';
import { Header } from './Header';
import { TabList } from './TabList';
import { ConfirmDialog } from './ConfirmDialog';
import { LinkCheckDialog } from './LinkCheckDialog';
import { useTranslation } from '../common/i18nContext.js';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
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

  // 状態
  const [allTabs, setAllTabs] = useState<SavedTab[]>([]);
  const [filteredTabs, setFilteredTabs] = useState<SavedTab[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroupMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupSort, setGroupSort] = useState<GroupSortType>('count-desc');
  const [itemSort, setItemSort] = useState<ItemSortType>('saved-desc');
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('lazy');
  const [restoreIntervalMs, setRestoreIntervalMs] = useState(100);
  const [dateRange, setDateRange] = useState<DateRangeFilter>({ startDate: null, endDate: null });
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [storageInfo, setStorageInfo] = useState(t('tabManager.storageCalculating'));
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // 選択モード関連
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  
  // グループ内フィルタ
  const [groupFilters, setGroupFilters] = useState<GroupFilter>({});

  // リンクチェックダイアログ
  const [isLinkCheckOpen, setIsLinkCheckOpen] = useState(false);

  // タブ数
  const tabCount = useMemo(() => filteredTabs.length, [filteredTabs]);

  // 統計情報の更新
  const updateStats = useCallback(async () => {
    const usage = await getStorageUsage();
    if (usage.quota > 0) {
      const percent = ((usage.used / usage.quota) * 100).toFixed(1);
      setStorageInfo(t('tabManager.storageUsage', {
        used: formatBytes(usage.used),
        quota: formatBytes(usage.quota),
        percent,
      }));
    } else {
      setStorageInfo(t('tabManager.storageUsageNoQuota', {
        used: formatBytes(usage.used),
      }));
    }
  }, [t]);

  // タブの読み込み
  const loadTabs = useCallback(async () => {
    try {
      const tabs = await getAllTabs();
      const groups = await getAllCustomGroups();
      setAllTabs(tabs);
      setFilteredTabs(tabs);
      setCustomGroups(groups);
      await updateStats();
    } catch (error) {
      console.error('タブの読み込みに失敗:', error);
    }
  }, [updateStats]);

  // 設定の読み込み（ソート・復元設定）
  const loadSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      setGroupSort(settings.groupSort);
      setItemSort(settings.itemSort);
      setRestoreMode(settings.restoreMode);
      setRestoreIntervalMs(settings.restoreIntervalMs);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    }
  }, []);

  // 検索
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTabs(allTabs);
      return;
    }
    try {
      const results = await searchTabs(query);
      setFilteredTabs(results);
    } catch (error) {
      console.error('検索に失敗:', error);
    }
  }, [allTabs]);

  // 日時フィルタリング
  const applyDateFilter = useCallback((tabs: SavedTab[]): SavedTab[] => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return tabs;
    }

    return tabs.filter((tab) => {
      const savedDate = new Date(tab.savedAt);
      // ローカル時間での日付をYYYY-MM-DD形式に変換
      const year = savedDate.getFullYear();
      const month = String(savedDate.getMonth() + 1).padStart(2, '0');
      const day = String(savedDate.getDate()).padStart(2, '0');
      const savedDateStr = `${year}-${month}-${day}`;

      if (dateRange.startDate && savedDateStr < dateRange.startDate) {
        return false;
      }
      if (dateRange.endDate && savedDateStr > dateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [dateRange]);

  // 日時フィルター変更時に再フィルタリング
  useEffect(() => {
    const applyFilters = async () => {
      let filtered = allTabs;

      // 検索フィルター
      if (searchQuery.trim()) {
        filtered = await searchTabs(searchQuery);
      }

      // 日時フィルター適用
      filtered = applyDateFilter(filtered);

      setFilteredTabs(filtered);
    };

    applyFilters();
  }, [allTabs, searchQuery, dateRange, applyDateFilter]);

  // タブを開く
  const handleOpenTab = useCallback((url: string) => {
    browser.tabs.create({ url });
  }, []);

  // タブ削除
  const handleDeleteTab = useCallback(async (id: string) => {
    await deleteTab(id);
    await loadTabs();
  }, [loadTabs]);

  // グループ削除
  const handleDeleteGroup = useCallback((groupName: string, groupType: 'domain' | 'custom') => {
    const groupTabs = filteredTabs.filter(t => t.group === groupName);
    
    if (groupType === 'custom') {
      // カスタムグループ削除（タブはドメイングループに戻る）
      setDialog({
        isOpen: true,
        title: t('tabManager.customGroup.deleteConfirmTitle'),
        message: t('tabManager.customGroup.deleteConfirmMessage', { name: groupName }),
        onConfirm: async () => {
          await deleteCustomGroup(groupName);
          await loadTabs();
          setDialog(d => ({ ...d, isOpen: false }));
        },
      });
    } else {
      // ドメイングループ削除（タブも削除）
      setDialog({
        isOpen: true,
        title: t('tabManager.confirmDialog.deleteGroupTitle'),
        message: t('tabManager.confirmDialog.deleteGroupMessage', { domain: groupName, count: groupTabs.length }),
        onConfirm: async () => {
          await deleteTabsByGroup(groupName);
          await loadTabs();
          setDialog(d => ({ ...d, isOpen: false }));
        },
      });
    }
  }, [filteredTabs, loadTabs, t]);

  // 復元モードに応じてタブを開く
  const openTabsWithRestoreMode = useCallback(async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const tab = await browser.tabs.create({ url, active: false });
      
      if (restoreMode === 'immediate') {
        // 高速サスペンド: loadingを待ってdiscard（URLが確定するまで待つ）
        if (tab.id) {
          await waitForTabStatus(tab.id, 'loading');
          try {
            await browser.tabs.discard(tab.id);
          } catch (e) {
            // discardに失敗しても続行
            console.warn('タブのdiscardに失敗:', e);
          }
        }
      } else if (restoreMode === 'lazy') {
        // 遅延サスペンド: 読み込み完了を待ってdiscard
        if (tab.id) {
          await waitForTabStatus(tab.id, 'complete');
          try {
            await browser.tabs.discard(tab.id);
          } catch (e) {
            console.warn('タブのdiscardに失敗:', e);
          }
        }
      }
      // mode === 'normal' の場合は何もしない（通常読み込み）
      
      // 最後のタブ以外はインターバルを待つ
      if (restoreIntervalMs > 0 && i < urls.length - 1) {
        await sleep(restoreIntervalMs);
      }
    }
  }, [restoreMode, restoreIntervalMs]);

  // グループ内のタブをすべて開く
  const handleOpenGroup = useCallback(async (groupName: string) => {
    const groupTabs = filteredTabs.filter(t => t.group === groupName);
    const urls = groupTabs.map(tab => tab.url);
    await openTabsWithRestoreMode(urls);
  }, [filteredTabs, openTabsWithRestoreMode]);

  // グループ内のタブをタブグループとして開く
  const handleOpenGroupAsTabGroup = useCallback(async (groupName: string) => {
    const groupTabs_ = filteredTabs.filter(t => t.group === groupName);
    if (groupTabs_.length === 0) return;
    
    try {
      // タブを作成
      const tabIds: number[] = [];
      for (const tab of groupTabs_) {
        const newTab = await browser.tabs.create({ url: tab.url, active: false });
        if (newTab.id) {
          tabIds.push(newTab.id);
        }
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

  // 選択したタブをタブグループとして開く
  const handleBulkOpenAsTabGroup = useCallback(async () => {
    if (selectedTabIds.size === 0) return;
    
    try {
      const selectedTabs = filteredTabs.filter(t => selectedTabIds.has(t.id));
      const tabIds: number[] = [];
      for (const tab of selectedTabs) {
        const newTab = await browser.tabs.create({ url: tab.url, active: false });
        if (newTab.id) {
          tabIds.push(newTab.id);
        }
      }
      
      if (tabIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupId = await (browser.tabs as any).group({ tabIds });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (browser as any).tabGroups.update(groupId, { title: `${selectedTabs.length} tabs`, collapsed: false });
      }
      
      // 選択モードを解除
      setSelectedTabIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('タブグループの作成に失敗:', error);
    }
  }, [selectedTabIds, filteredTabs]);

  // カスタムグループ名を変更
  const handleRenameGroup = useCallback(async (oldName: string, newName: string) => {
    try {
      await renameCustomGroup(oldName, newName);
      await loadTabs();
    } catch (error) {
      console.error('グループ名の変更に失敗:', error);
    }
  }, [loadTabs]);

  // タブをカスタムグループに移動
  const handleMoveToGroup = useCallback(async (tabId: string, groupName: string) => {
    try {
      await assignTabToCustomGroup(tabId, groupName);
      await loadTabs();
    } catch (error) {
      console.error('グループへの移動に失敗:', error);
    }
  }, [loadTabs]);

  // タブをカスタムグループから削除
  const handleRemoveFromGroup = useCallback(async (tabId: string) => {
    try {
      await removeTabFromCustomGroup(tabId);
      await loadTabs();
    } catch (error) {
      console.error('グループからの削除に失敗:', error);
    }
  }, [loadTabs]);

  // ===== 選択モード関連 =====
  
  // 選択モードの切り替え
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        // モード終了時に選択をクリア
        setSelectedTabIds(new Set());
      }
      return !prev;
    });
  }, []);

  // タブ選択のトグル
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全選択
  const handleSelectAll = useCallback(() => {
    setSelectedTabIds(new Set(filteredTabs.map(tab => tab.id)));
  }, [filteredTabs]);

  // 選択解除
  const handleDeselectAll = useCallback(() => {
    setSelectedTabIds(new Set());
  }, []);

  // 一括削除
  const handleBulkDelete = useCallback(() => {
    const count = selectedTabIds.size;
    if (count === 0) return;
    
    setDialog({
      isOpen: true,
      title: t('tabManager.selection.confirmDeleteTitle'),
      message: t('tabManager.selection.confirmDeleteMessage', { count }),
      onConfirm: async () => {
        await deleteMultipleTabs([...selectedTabIds]);
        setSelectedTabIds(new Set());
        setIsSelectionMode(false);
        await loadTabs();
        setDialog(d => ({ ...d, isOpen: false }));
      },
    });
  }, [selectedTabIds, loadTabs, t]);

  // 一括グループ移動
  const handleBulkMoveToGroup = useCallback(async (groupName: string) => {
    if (selectedTabIds.size === 0) return;
    
    try {
      await assignMultipleTabsToGroup([...selectedTabIds], groupName);
      setSelectedTabIds(new Set());
      setIsSelectionMode(false);
      await loadTabs();
    } catch (error) {
      console.error('一括グループ移動に失敗:', error);
    }
  }, [selectedTabIds, loadTabs]);

  // 一括でグループから外す
  const handleBulkRemoveFromGroup = useCallback(async () => {
    if (selectedTabIds.size === 0) return;
    
    try {
      await removeMultipleTabsFromGroup([...selectedTabIds]);
      setSelectedTabIds(new Set());
      setIsSelectionMode(false);
      await loadTabs();
    } catch (error) {
      console.error('一括グループ解除に失敗:', error);
    }
  }, [selectedTabIds, loadTabs]);

  // グループ内タブを一括選択
  const handleSelectGroup = useCallback((tabIds: string[]) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      tabIds.forEach(id => next.add(id));
      return next;
    });
  }, []);

  // グループ内タブを一括解除
  const handleDeselectGroup = useCallback((tabIds: string[]) => {
    setSelectedTabIds(prev => {
      const next = new Set(prev);
      tabIds.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  // グループフィルタの変更
  const handleGroupFilterChange = useCallback((groupName: string, pattern: string) => {
    setGroupFilters(prev => ({
      ...prev,
      [groupName]: pattern,
    }));
  }, []);

  // すべてのタブを開く
  const handleOpenAll = useCallback(async () => {
    const urls = filteredTabs.map(tab => tab.url);
    await openTabsWithRestoreMode(urls);
  }, [filteredTabs, openTabsWithRestoreMode]);

  // 全削除
  const handleDeleteAll = useCallback(() => {
    setDialog({
      isOpen: true,
      title: t('tabManager.confirmDialog.deleteAllTitle'),
      message: t('tabManager.confirmDialog.deleteAllMessage', { count: allTabs.length }),
      onConfirm: async () => {
        await deleteAllTabs();
        await loadTabs();
        setDialog(d => ({ ...d, isOpen: false }));
      },
    });
  }, [allTabs.length, loadTabs, t]);

  // ダイアログを閉じる
  const handleCancelDialog = useCallback(() => {
    setDialog(d => ({ ...d, isOpen: false }));
  }, []);

  // 初期読み込み
  useEffect(() => {
    loadTabs();
    loadSettings();
  }, [loadTabs, loadSettings]);

  // Background Scriptからの変更通知を受信
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'tabs-changed') {
        loadTabs();
      }
      if (msg.type === 'settings-changed') {
        loadSettings();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [loadTabs, loadSettings]);

  // 検索クエリ変更時に再フィルタリング
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    }
  }, [allTabs]); // allTabsが変わったときに再検索

  return (
    <div className="container">
      <Header
        tabCount={tabCount}
        storageInfo={storageInfo}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDeleteAll={handleDeleteAll}
        onOpenAll={handleOpenAll}
        onLinkCheck={() => setIsLinkCheckOpen(true)}
        hasAnyTabs={allTabs.length > 0}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        selectedCount={selectedTabIds.size}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkDelete={handleBulkDelete}
        onBulkMoveToGroup={handleBulkMoveToGroup}
        onBulkRemoveFromGroup={handleBulkRemoveFromGroup}
        onBulkOpenAsTabGroup={handleBulkOpenAsTabGroup}
        customGroups={customGroups}
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
            viewMode={viewMode}
            groupSort={groupSort}
            itemSort={itemSort}
            onDeleteTab={handleDeleteTab}
            onDeleteGroup={handleDeleteGroup}
            onOpenGroup={handleOpenGroup}
            onOpenGroupAsTabGroup={handleOpenGroupAsTabGroup}
            onOpenTab={handleOpenTab}
            onRenameGroup={handleRenameGroup}
            onMoveToGroup={handleMoveToGroup}
            onRemoveFromGroup={handleRemoveFromGroup}
            isSelectionMode={isSelectionMode}
            selectedTabIds={selectedTabIds}
            onToggleSelection={handleToggleSelection}
            onSelectGroup={handleSelectGroup}
            onDeselectGroup={handleDeselectGroup}
            groupFilters={groupFilters}
            onGroupFilterChange={handleGroupFilterChange}
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
      />

      <LinkCheckDialog
        isOpen={isLinkCheckOpen}
        onClose={() => setIsLinkCheckOpen(false)}
        onTabsDeleted={loadTabs}
      />
    </div>
  );
}

/**
 * TabBurrow - タブ操作フック
 * タブの取得、更新、削除、フィルタリングを管理
 */

import { useState, useCallback, useEffect } from 'react';
import browser from '../../browserApi';
import type { SavedTab, CustomGroupMeta } from '../types';
import {
  getAllTabs,
  getAllCustomGroups,
  deleteTab,
  deleteTabsByGroup,
  deleteMultipleTabs,
  assignTabToCustomGroup,
  assignMultipleTabsToGroup,
  removeTabFromCustomGroup,
  removeMultipleTabsFromGroup,
  getStorageUsage,
  deleteAllTabs,
  updateTab,
} from '../../storage';
import { formatBytes } from '../utils';
import { useTranslation } from '../../common/i18nContext';

export function useTabs() {
  const { t } = useTranslation();
  const [allTabs, setAllTabs] = useState<SavedTab[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroupMeta[]>([]);
  const [storageInfo, setStorageInfo] = useState(t('tabManager.storageCalculating'));
  const [isLoading, setIsLoading] = useState(true);

  // 統計情報の更新
  const updateStats = useCallback(async () => {
    try {
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
    } catch (error) {
      console.error('統計情報の更新に失敗:', error);
    }
  }, [t]);

  // タブとグループの読み込み
  const loadTabs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tabs, groups] = await Promise.all([
        getAllTabs(),
        getAllCustomGroups(),
      ]);
      setAllTabs(tabs);
      setCustomGroups(groups);
      await updateStats();
    } catch (error) {
      console.error('タブの読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  // タブ削除
  const handleDeleteTab = useCallback(async (id: string) => {
    await deleteTab(id);
    await loadTabs();
  }, [loadTabs]);

  // ドメイングループ削除（タブも削除）
  const handleDeleteDomainGroup = useCallback(async (groupName: string) => {
    await deleteTabsByGroup(groupName);
    await loadTabs();
  }, [loadTabs]);

  // 全削除
  const handleDeleteAll = useCallback(async () => {
    await deleteAllTabs();
    await loadTabs();
  }, [loadTabs]);

  // 複数削除
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    await deleteMultipleTabs(ids);
    await loadTabs();
  }, [loadTabs]);

  // グループ移動
  const handleMoveToGroup = useCallback(async (tabId: string, groupName: string) => {
    await assignTabToCustomGroup(tabId, groupName);
    await loadTabs();
  }, [loadTabs]);

  // グループから外す
  const handleRemoveFromGroup = useCallback(async (tabId: string, groupName?: string) => {
    await removeTabFromCustomGroup(tabId, groupName);
    await loadTabs();
  }, [loadTabs]);

  // 複数グループ移動
  const handleBulkMoveToGroup = useCallback(async (ids: string[], groupName: string) => {
    await assignMultipleTabsToGroup(ids, groupName);
    await loadTabs();
  }, [loadTabs]);

  // 複数グループ解除
  const handleBulkRemoveFromGroup = useCallback(async (ids: string[], groupName?: string) => {
    await removeMultipleTabsFromGroup(ids, groupName);
    await loadTabs();
  }, [loadTabs]);

  // タブの部分更新（displayName等）
  const handleUpdateTab = useCallback(async (id: string, updates: Partial<SavedTab>) => {
    await updateTab(id, updates);
    await loadTabs();
  }, [loadTabs]);

  // 初期読み込みとイベントリスナー
  useEffect(() => {
    loadTabs();

    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'tabs-changed') {
        loadTabs();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [loadTabs]);

  // ストレージ情報更新（言語切り替え時）
  useEffect(() => {
    updateStats();
  }, [updateStats]);

  return {
    allTabs,
    customGroups,
    storageInfo,
    isLoading,
    loadTabs,
    handleDeleteTab,
    handleDeleteDomainGroup,
    handleDeleteAll,
    handleBulkDelete,
    handleMoveToGroup,
    handleRemoveFromGroup,
    handleBulkMoveToGroup,
    handleBulkRemoveFromGroup,
    handleUpdateTab,
  };
}

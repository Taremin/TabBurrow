/**
 * storage/tabs.ts - タブ関連の操作
 */

import {
  TABS_STORE_NAME,
  type SavedTab,
} from '../dbSchema';
import { openDB } from './dbCore';
import { type UrlNormalizationRule } from '../settings';

const STORE_NAME = TABS_STORE_NAME;

/**
 * URLで既存のタブを検索
 */
export async function findTabByUrl(url: string): Promise<SavedTab | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('url');
    const request = index.get(url);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 正規化URLで既存のタブを検索
 */
export async function findTabByCanonicalUrl(canonicalUrl: string): Promise<SavedTab | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('canonicalUrl');
    const request = index.get(canonicalUrl);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 複数のタブを保存（同じURLがあれば上書き）
 */
export async function saveTabs(tabs: SavedTab[]): Promise<void> {
  const db = await openDB();
  
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByCanonicalUrl(tab.canonicalUrl);
    if (existing) {
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      tabsToSave.push({ 
        ...tab, 
        id: existing.id, 
        screenshot,
        displayName: existing.displayName,
        group: existing.group,
        groupType: existing.groupType,
        customGroups: existing.customGroups,
      });
    } else {
      tabsToSave.push(tab);
    }
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const tab of tabsToSave) {
      store.put(tab);
    }
  });
}

/**
 * カスタムグループにタブを保存（既存タブのグループ情報も上書き）
 */
export async function saveTabsForCustomGroup(tabs: SavedTab[]): Promise<void> {
  const db = await openDB();
  
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByCanonicalUrl(tab.canonicalUrl);
    if (existing) {
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      const mergedCustomGroups = [...new Set([...(existing.customGroups || []), ...(tab.customGroups || [])])];
      tabsToSave.push({ 
        ...tab, 
        id: existing.id, 
        screenshot,
        displayName: existing.displayName,
        group: existing.group,
        groupType: existing.groupType,
        customGroups: mergedCustomGroups,
      });
    } else {
      tabsToSave.push(tab);
    }
  }
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const tab of tabsToSave) {
      store.put(tab);
    }
  });
}

/**
 * 全タブを取得（保存日時の降順）
 */
export async function getAllTabs(): Promise<SavedTab[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('savedAt');
    const request = index.openCursor(null, 'prev');
    
    const results: SavedTab[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value as SavedTab);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * ドメインごとにグループ化したタブを取得
 */
export async function getTabsGroupedByDomain(): Promise<Map<string, SavedTab[]>> {
  const allTabs = await getAllTabs();
  const grouped = new Map<string, SavedTab[]>();

  for (const tab of allTabs) {
    const existing = grouped.get(tab.domain) || [];
    existing.push(tab);
    grouped.set(tab.domain, existing);
  }

  return grouped;
}

/**
 * 単一タブを削除
 */
export async function deleteTab(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * タブを部分更新
 */
export async function updateTab(id: string, updates: Partial<SavedTab>): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const tab = getRequest.result as SavedTab | undefined;
      if (tab) {
        const updatedTab = { ...tab, ...updates };
        store.put(updatedTab);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * グループ内の全タブを削除（ドメインまたはカスタムグループ）
 */
export async function deleteTabsByGroup(group: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        const matches = 
          (tab.groupType === 'custom' && (tab.customGroups?.includes(group) || tab.group === group)) ||
          (tab.groupType === 'domain' && (tab.group === group || tab.domain === group));
          
        if (matches) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * ドメイン内の全タブを削除（後方互換性のため維持）
 */
export async function deleteTabsByDomain(domain: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('domain');
    const request = index.openCursor(IDBKeyRange.only(domain));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 全タブを削除
 */
export async function deleteAllTabs(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * ストレージ使用量を取得
 */
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}

/**
 * タブ数を取得
 */
export async function getTabCount(): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 正規化適用結果の型
 */
export interface NormalizationApplyResult {
  mergedCount: number;
  details: Array<{
    normalizedUrl: string;
    keptTabId: string;
    keptUrl: string;
    removedUrls: string[];
  }>;
}

/**
 * 既存の全タブに正規化ルールを適用し、重複を統合する
 */
export async function applyNormalizationToExisting(rules: UrlNormalizationRule[]): Promise<NormalizationApplyResult> {
  const { applyUrlNormalization } = await import('../utils/url.js');
  const allTabs = await getAllTabs();
  
  const groupedByCanonical = new Map<string, SavedTab[]>();
  for (const tab of allTabs) {
    const normalized = applyUrlNormalization(tab.url, rules);
    const existing = groupedByCanonical.get(normalized) || [];
    existing.push({ ...tab, canonicalUrl: normalized });
    groupedByCanonical.set(normalized, existing);
  }
  
  const db = await openDB();
  let mergedCount = 0;
  const details: NormalizationApplyResult['details'] = [];
  
  return new Promise<NormalizationApplyResult>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    transaction.oncomplete = () => resolve({ mergedCount, details });
    transaction.onerror = () => reject(transaction.error);
    
    for (const [canonicalUrl, tabs] of groupedByCanonical.entries()) {
      if (tabs.length > 1) {
        tabs.sort((a, b) => b.savedAt - a.savedAt);
        const [latest, ...others] = tabs;
        store.put(latest);
        
        const removedUrls: string[] = [];
        for (const other of others) {
          store.delete(other.id);
          removedUrls.push(other.url);
          mergedCount++;
        }
        
        details.push({
          normalizedUrl: canonicalUrl,
          keptTabId: latest.id,
          keptUrl: latest.url,
          removedUrls,
        });
      } else {
        store.put(tabs[0]);
      }
    }
  });
}

/**
 * 複数タブを一括削除
 */
export async function deleteMultipleTabs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const id of ids) {
      store.delete(id);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * タブのソートキーを更新
 */
export async function updateTabSortKey(id: string, sortKey: string | undefined): Promise<void> {
  const finalSortKey = (sortKey && sortKey.trim() !== '') ? sortKey.trim() : undefined;
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const tab = getRequest.result as SavedTab | undefined;
      if (tab) {
        if (finalSortKey === undefined) {
          delete tab.sortKey;
        } else {
          tab.sortKey = finalSortKey;
        }
        store.put(tab);
      }
    };

    transaction.oncomplete = () => {
      import('../browserApi').then(browser => {
        browser.default.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
      });
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

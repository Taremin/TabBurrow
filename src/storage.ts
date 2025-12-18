/**
 * TabBurrow - IndexedDBストレージ層
 * タブ情報とスクリーンショットの永続化を管理
 */

// 共通スキーマ定義からインポート
import {
  DB_NAME,
  DB_VERSION,
  TABS_STORE_NAME,
  CUSTOM_GROUPS_STORE_NAME,
  type SavedTab,
  type CustomGroupMeta,
  type GroupType,
} from './dbSchema.js';

// 型を再エクスポート（後方互換性のため）
export type { SavedTab, CustomGroupMeta, GroupType };

// ストア名のエイリアス（後方互換性のため）
const STORE_NAME = TABS_STORE_NAME;
const CUSTOM_GROUPS_STORE = CUSTOM_GROUPS_STORE_NAME;

let dbInstance: IDBDatabase | null = null;

/**
 * データベースインスタンスをリセット（テスト用）
 */
export function resetDBInstance(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}


/**
 * IndexedDBデータベースを開く
 */
async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`IndexedDBを開けませんでした: ${request.error}`));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;
      const oldVersion = event.oldVersion;
      
      // タブストアの作成（バージョン1から）
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('domain', 'domain', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
        store.createIndex('url', 'url', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
      
      // バージョン2: カスタムグループ対応
      if (oldVersion < 2) {
        // カスタムグループストアを作成
        if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE)) {
          const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE, { keyPath: 'name' });
          groupStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // 既存タブにgroup/groupTypeフィールドを追加
        const tabStore = transaction.objectStore(STORE_NAME);
        tabStore.createIndex('group', 'group', { unique: false });
        tabStore.createIndex('groupType', 'groupType', { unique: false });
        
        // 既存データのマイグレーション
        const cursorRequest = tabStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
            // domainフィールドをgroupにコピー、groupTypeをdomainに設定
            if (!tab.group) {
              tab.group = tab.domain;
              tab.groupType = 'domain';
              cursor.update(tab);
            }
            cursor.continue();
          }
        };
      }
    };
  });
}

/**
 * URLで既存のタブを検索
 */
async function findTabByUrl(url: string): Promise<SavedTab | null> {
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
 * 複数のタブを保存（同じURLがあれば上書き）
 */
export async function saveTabs(tabs: SavedTab[]): Promise<void> {
  const db = await openDB();
  
  // 保存対象のURLで既存タブを検索し、IDを取得
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByUrl(tab.url);
    if (existing) {
      // 既存タブがあればそのIDを引き継ぐ（上書き用）
      // 新しいスクリーンショットが空の場合は既存のスクリーンショットを引き継ぐ
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      // 既存のgroup/groupTypeを保持（カスタムグループ設定を維持）
      tabsToSave.push({ 
        ...tab, 
        id: existing.id, 
        screenshot,
        group: existing.group,
        groupType: existing.groupType,
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
  
  // 保存対象のURLで既存タブを検索し、IDを取得
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByUrl(tab.url);
    if (existing) {
      // 既存タブがあればそのIDを引き継ぐ（上書き用）
      // 新しいスクリーンショットが空の場合は既存のスクリーンショットを引き継ぐ
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      // group/groupTypeは新しい値を使用（カスタムグループへの割り当て更新）
      tabsToSave.push({ 
        ...tab, 
        id: existing.id, 
        screenshot,
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
    const request = index.openCursor(null, 'prev'); // 降順
    
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
 * URL/タイトルで検索（オプション付き）
 */
export async function searchTabs(
  query: string,
  options?: {
    caseSensitive?: boolean;  // 大文字小文字を区別
    wholeWord?: boolean;      // 単語単位で検索
    useRegex?: boolean;       // 正規表現モード
  }
): Promise<SavedTab[]> {
  const allTabs = await getAllTabs();
  
  if (!query.trim()) {
    return allTabs;
  }
  
  const caseSensitive = options?.caseSensitive ?? false;
  const wholeWord = options?.wholeWord ?? false;
  const useRegex = options?.useRegex ?? false;
  
  // 検索マッチ関数を生成
  const matchFn = createMatchFunction(query, { caseSensitive, wholeWord, useRegex });
  
  if (!matchFn) {
    // 無効な正規表現の場合は空配列を返す
    return [];
  }
  
  return allTabs.filter(tab => 
    matchFn(tab.url) || matchFn(tab.title)
  );
}

/**
 * 検索マッチ関数を生成
 * 無効な正規表現の場合はnullを返す
 */
function createMatchFunction(
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
): ((text: string) => boolean) | null {
  const { caseSensitive, wholeWord, useRegex } = options;
  
  if (useRegex) {
    // 正規表現モード
    try {
      let pattern = query;
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = caseSensitive ? '' : 'i';
      const regex = new RegExp(pattern, flags);
      return (text: string) => regex.test(text);
    } catch {
      // 無効な正規表現
      return null;
    }
  } else {
    // 通常検索モード
    if (wholeWord) {
      // 単語境界を使用
      try {
        const escapedQuery = escapeRegExp(query);
        const pattern = `\\b${escapedQuery}\\b`;
        const flags = caseSensitive ? '' : 'i';
        const regex = new RegExp(pattern, flags);
        return (text: string) => regex.test(text);
      } catch {
        return null;
      }
    } else {
      // シンプルな部分一致
      if (caseSensitive) {
        return (text: string) => text.includes(query);
      } else {
        const lowerQuery = query.toLowerCase();
        return (text: string) => text.toLowerCase().includes(lowerQuery);
      }
    }
  }
}

/**
 * 正規表現の特殊文字をエスケープ
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * グループ内の全タブを削除（ドメインまたはカスタムグループ）
 */
export async function deleteTabsByGroup(group: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('group');
    const request = index.openCursor(IDBKeyRange.only(group));

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

// ==============================
// カスタムグループ関連の関数
// ==============================

/**
 * カスタムグループを作成
 */
export async function createCustomGroup(name: string): Promise<CustomGroupMeta> {
  const db = await openDB();
  const now = Date.now();
  const group: CustomGroupMeta = {
    name,
    createdAt: now,
    updatedAt: now,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const request = store.add(group);

    request.onsuccess = () => resolve(group);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 全カスタムグループを取得
 */
export async function getAllCustomGroups(): Promise<CustomGroupMeta[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readonly');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // 新しい順
    
    const results: CustomGroupMeta[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value as CustomGroupMeta);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * カスタムグループ名を変更
 */
export async function renameCustomGroup(oldName: string, newName: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CUSTOM_GROUPS_STORE, STORE_NAME], 'readwrite');
    const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const tabStore = transaction.objectStore(STORE_NAME);
    
    // 古いグループを取得
    const getRequest = groupStore.get(oldName);
    getRequest.onsuccess = () => {
      const oldGroup = getRequest.result as CustomGroupMeta | undefined;
      if (!oldGroup) {
        reject(new Error(`グループ "${oldName}" が見つかりません`));
        return;
      }
      
      // 新しいグループを作成
      const newGroup: CustomGroupMeta = {
        name: newName,
        createdAt: oldGroup.createdAt,
        updatedAt: Date.now(),
      };
      groupStore.add(newGroup);
      
      // 古いグループを削除
      groupStore.delete(oldName);
      
      // タブのグループ名を更新
      const tabIndex = tabStore.index('group');
      const tabCursor = tabIndex.openCursor(IDBKeyRange.only(oldName));
      tabCursor.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tab = cursor.value as SavedTab;
          tab.group = newName;
          cursor.update(tab);
          cursor.continue();
        }
      };
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * カスタムグループを削除（タブはドメイングループに戻す）
 */
export async function deleteCustomGroup(name: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CUSTOM_GROUPS_STORE, STORE_NAME], 'readwrite');
    const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const tabStore = transaction.objectStore(STORE_NAME);
    
    // グループを削除
    groupStore.delete(name);
    
    // タブをドメイングループに戻す
    const tabIndex = tabStore.index('group');
    const tabCursor = tabIndex.openCursor(IDBKeyRange.only(name));
    tabCursor.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        tab.group = tab.domain;
        tab.groupType = 'domain';
        cursor.update(tab);
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * タブをカスタムグループに割り当て
 */
export async function assignTabToCustomGroup(tabId: string, groupName: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(tabId);

    request.onsuccess = () => {
      const tab = request.result as SavedTab | undefined;
      if (tab) {
        tab.group = groupName;
        tab.groupType = 'custom';
        store.put(tab);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * タブをドメイングループに戻す
 */
export async function removeTabFromCustomGroup(tabId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(tabId);

    request.onsuccess = () => {
      const tab = request.result as SavedTab | undefined;
      if (tab) {
        tab.group = tab.domain;
        tab.groupType = 'domain';
        store.put(tab);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ==============================
// 一括操作関連の関数
// ==============================

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
 * 複数タブを一括でカスタムグループに移動
 */
export async function assignMultipleTabsToGroup(tabIds: string[], groupName: string): Promise<void> {
  if (tabIds.length === 0) return;
  
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    let pending = tabIds.length;
    
    for (const tabId of tabIds) {
      const request = store.get(tabId);
      request.onsuccess = () => {
        const tab = request.result as SavedTab | undefined;
        if (tab) {
          tab.group = groupName;
          tab.groupType = 'custom';
          store.put(tab);
        }
        pending--;
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 複数タブをカスタムグループから削除（ドメイングループに戻す）
 */
export async function removeMultipleTabsFromGroup(tabIds: string[]): Promise<void> {
  if (tabIds.length === 0) return;
  
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    for (const tabId of tabIds) {
      const request = store.get(tabId);
      request.onsuccess = () => {
        const tab = request.result as SavedTab | undefined;
        if (tab) {
          tab.group = tab.domain;
          tab.groupType = 'domain';
          store.put(tab);
        }
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

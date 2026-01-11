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
  BACKUPS_STORE_NAME,
  TRASH_STORE_NAME,
  type SavedTab,
  type CustomGroupMeta,
  type GroupType,
  type TrashedTab,
} from './dbSchema';
import browser from './browserApi';
import type { UrlNormalizationRule } from './settings';

// 型を再エクスポート（後方互換性のため）
export type { SavedTab, CustomGroupMeta, GroupType, TrashedTab };

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
        
        // インデックスが存在しない場合のみ作成
        if (!tabStore.indexNames.contains('group')) {
          tabStore.createIndex('group', 'group', { unique: false });
        }
        if (!tabStore.indexNames.contains('groupType')) {
          tabStore.createIndex('groupType', 'groupType', { unique: false });
        }
        
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
      
      // バージョン3: バックアップ機能対応
      if (oldVersion < 3) {
        // バックアップストアを作成
        if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
          const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
          backupStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }

      // バージョン4: 複数カスタムグループ対応
      if (oldVersion < 4) {
        const tabStore = transaction.objectStore(STORE_NAME);
        
        // customGroups インデックスを作成 (multiEntry: true で配列内要素での検索を可能にする)
        if (!tabStore.indexNames.contains('customGroups')) {
          tabStore.createIndex('customGroups', 'customGroups', { unique: false, multiEntry: true });
        }
        
        // 既存データのマイグレーション
        const cursorRequest = tabStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
            // groupType が custom の場合、group フィールドの内容を customGroups 配列の初期値とする
            if (!tab.customGroups) {
              if (tab.groupType === 'custom' && tab.group) {
                tab.customGroups = [tab.group];
              } else {
                tab.customGroups = [];
              }
              cursor.update(tab);
            }
            cursor.continue();
          }
        };
      }

      // バージョン5: カスタムグループの表示順序対応
      if (oldVersion < 5) {
        const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);
        
        // sortOrder インデックスを作成
        if (!groupStore.indexNames.contains('sortOrder')) {
          groupStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        }
        
        // 既存のカスタムグループにsortOrderを設定（createdAt順で番号付け）
        const allGroups: Array<{ name: string; createdAt: number; updatedAt: number; sortOrder?: number }> = [];
        const cursorRequest = groupStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            allGroups.push(cursor.value);
            cursor.continue();
          } else {
            // 全グループを取得したら、createdAt順でソートしてsortOrderを設定
            allGroups.sort((a, b) => a.createdAt - b.createdAt);
            allGroups.forEach((group, index) => {
              if (group.sortOrder === undefined) {
                group.sortOrder = index;
                groupStore.put(group);
              }
            });
          }
        };
      }

      // バージョン6: URL正規化対応
      if (oldVersion < 6) {
        const tabStore = transaction.objectStore(STORE_NAME);
        
        // canonicalUrl インデックスを作成
        if (!tabStore.indexNames.contains('canonicalUrl')) {
          tabStore.createIndex('canonicalUrl', 'canonicalUrl', { unique: false });
        }
        
        // 既存データのマイグレーション (canonicalUrl に url をセット)
        const cursorRequest = tabStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
            if (!tab.canonicalUrl) {
              tab.canonicalUrl = tab.url;
              cursor.update(tab);
            }
            cursor.continue();
          }
        };
      }

      // バージョン7: ゴミ箱機能対応
      if (oldVersion < 7) {
        // ゴミ箱ストアを作成
        if (!db.objectStoreNames.contains(TRASH_STORE_NAME)) {
          const trashStore = db.createObjectStore(TRASH_STORE_NAME, { keyPath: 'id' });
          trashStore.createIndex('trashedAt', 'trashedAt', { unique: false });
          trashStore.createIndex('domain', 'domain', { unique: false });
        }
      }
    };
  });
}

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
  
  // 保存対象のURLで既存タブを検索し、IDを取得
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByCanonicalUrl(tab.canonicalUrl);
    if (existing) {
      // 既存タブがあればそのIDを引き継ぐ（上書き用）
      // 新しいスクリーンショットが空の場合は既存のスクリーンショットを引き継ぐ
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      // 既存の名称やグループ設定を保持
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
  
  // 保存対象のURLで既存タブを検索し、IDを取得
  const tabsToSave: SavedTab[] = [];
  for (const tab of tabs) {
    const existing = await findTabByCanonicalUrl(tab.canonicalUrl);
    if (existing) {
      // 既存タブがあればそのIDを引き継ぐ（上書き用）
      // 新しいスクリーンショットが空の場合は既存のスクリーンショットを引き継ぐ
      const screenshot = tab.screenshot.size > 0 ? tab.screenshot : existing.screenshot;
      // 既存のcustomGroupsに新しいグループをマージ（重複排除）
      const mergedCustomGroups = [...new Set([...(existing.customGroups || []), ...(tab.customGroups || [])])];
      // 表示名、group/groupTypeは既存の設定を維持（ドメイングループからの所属を壊さない）
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
    matchFn(tab.url) || matchFn(tab.title) || (tab.displayName && matchFn(tab.displayName))
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
        // 更新を適用
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
  /** 統合されたタブの数 */
  mergedCount: number;
  /** 変換詳細 */
  details: Array<{
    /** 正規化後のURL */
    normalizedUrl: string;
    /** 保持されたタブのID */
    keptTabId: string;
    /** 保持されたタブのURL */
    keptUrl: string;
    /** 削除されたタブのURL */
    removedUrls: string[];
  }>;
}

/**
 * 既存の全タブに正規化ルールを適用し、重複を統合する
 */
export async function applyNormalizationToExisting(rules: UrlNormalizationRule[]): Promise<NormalizationApplyResult> {
  const { applyUrlNormalization } = await import('./utils/url.js');
  const allTabs = await getAllTabs();
  
  // canonicalUrl でグループ化
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
        // 保存日時が最新のものを探す
        tabs.sort((a, b) => b.savedAt - a.savedAt);
        const [latest, ...others] = tabs;
        
        // 最新のものを更新
        store.put(latest);
        
        // 削除されるURLを収集
        const removedUrls: string[] = [];
        for (const other of others) {
          store.delete(other.id);
          removedUrls.push(other.url);
          mergedCount++;
        }
        
        // 統合情報を記録
        details.push({
          normalizedUrl: canonicalUrl,
          keptTabId: latest.id,
          keptUrl: latest.url,
          removedUrls,
        });
      } else {
        // 1つだけの場合も canonicalUrl を更新
        store.put(tabs[0]);
      }
    }
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
  
  // 次のsortOrderを計算（既存の最大値 + 1）
  const existingGroups = await getAllCustomGroups();
  const maxSortOrder = existingGroups.reduce((max, g) => Math.max(max, g.sortOrder ?? 0), -1);
  
  const group: CustomGroupMeta = {
    name,
    createdAt: now,
    updatedAt: now,
    sortOrder: maxSortOrder + 1,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const request = store.add(group);

    request.onsuccess = () => resolve(group);
    request.onerror = () => reject(request.error);
  }).then((result) => {
    browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
    return result as CustomGroupMeta;
  });
}

/**
 * 全カスタムグループを取得（sortOrder順）
 */
export async function getAllCustomGroups(): Promise<CustomGroupMeta[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readonly');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    
    // sortOrderインデックスが存在すればそれを使用、なければgetAll
    let request: IDBRequest;
    if (store.indexNames.contains('sortOrder')) {
      const index = store.index('sortOrder');
      request = index.openCursor(null, 'next'); // sortOrder昇順
    } else {
      // マイグレーション前のフォールバック
      const index = store.index('createdAt');
      request = index.openCursor(null, 'prev'); // createdAt降順
    }
    
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
  
  return new Promise<void>((resolve, reject) => {
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
      
      // 新しいグループを作成（sortOrderを保持）
      const newGroup: CustomGroupMeta = {
        name: newName,
        createdAt: oldGroup.createdAt,
        updatedAt: Date.now(),
        sortOrder: oldGroup.sortOrder ?? 0,
      };
      groupStore.add(newGroup);
      
      // 古いグループを削除
      groupStore.delete(oldName);
      
      // タブのグループ名を更新
      const tabCursor = tabStore.openCursor();
      tabCursor.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tab = cursor.value as SavedTab;
          let changed = false;
          
          // レガシーフィールドの更新
          if (tab.group === oldName) {
            tab.group = newName;
            changed = true;
          }
          
          // 新しい配列フィールドの更新
          if (tab.customGroups && tab.customGroups.includes(oldName)) {
            tab.customGroups = tab.customGroups.map(g => g === oldName ? newName : g);
            changed = true;
          }
          
          if (changed) {
            cursor.update(tab);
          }
          cursor.continue();
        }
      };
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).then(() => {
    browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
  });
}

/**
 * カスタムグループを削除（タブはドメイングループに戻す）
 */
export async function deleteCustomGroup(name: string): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CUSTOM_GROUPS_STORE, STORE_NAME], 'readwrite');
    const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const tabStore = transaction.objectStore(STORE_NAME);
    
    // グループを削除
    groupStore.delete(name);
    
    // タブを修正
    const tabCursor = tabStore.openCursor();
    tabCursor.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        let changed = false;
        
        // レガシーフィールドの更新
        if (tab.group === name) {
          tab.group = tab.domain;
          tab.groupType = 'domain';
          changed = true;
        }
        
        // 新しい配列フィールドからの削除
        if (tab.customGroups && tab.customGroups.includes(name)) {
          tab.customGroups = tab.customGroups.filter(g => g !== name);
          changed = true;
        }
        
        if (changed) {
          cursor.update(tab);
        }
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).then(() => {
    browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
  });
}

/**
 * カスタムグループの表示順序を更新
 * @param groupNames 新しい順序でのグループ名の配列
 */
export async function updateCustomGroupOrder(groupNames: string[]): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    
    // 各グループのsortOrderを配列のインデックスに合わせて更新
    groupNames.forEach((name, index) => {
      const getRequest = store.get(name);
      getRequest.onsuccess = () => {
        const group = getRequest.result as CustomGroupMeta | undefined;
        if (group) {
          group.sortOrder = index;
          group.updatedAt = Date.now();
          store.put(group);
        }
      };
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).then(() => {
    browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
  });
}

/**
 * カスタムグループの色を更新
 * @param groupName グループ名
 * @param color 色（HEX形式）、undefinedで色を削除
 */
export async function updateCustomGroupColor(groupName: string, color: string | undefined): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const getRequest = store.get(groupName);
    
    getRequest.onsuccess = () => {
      const group = getRequest.result as CustomGroupMeta | undefined;
      if (group) {
        group.color = color;
        group.updatedAt = Date.now();
        store.put(group);
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).then(() => {
    browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
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
        // レガシーフィールドの更新
        tab.group = groupName;
        tab.groupType = 'custom';
        
        // 新しい配列フィールドの更新
        if (!tab.customGroups) {
          tab.customGroups = [groupName];
        } else if (!tab.customGroups.includes(groupName)) {
          tab.customGroups.push(groupName);
        }
        
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
export async function removeTabFromCustomGroup(tabId: string, groupName?: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(tabId);

    request.onsuccess = () => {
      const tab = request.result as SavedTab | undefined;
      if (tab) {
        if (groupName) {
          // 特定のグループから削除
          if (tab.customGroups) {
            tab.customGroups = tab.customGroups.filter(g => g !== groupName);
          }
          
          // 表示中のメイングループが削除対象なら、残りのグループのいずれか、またはドメインに戻す
          if (tab.group === groupName) {
            if (tab.customGroups && tab.customGroups.length > 0) {
              tab.group = tab.customGroups[0];
              tab.groupType = 'custom';
            } else {
              tab.group = tab.domain;
              tab.groupType = 'domain';
            }
          }
        } else {
          // 全てのカスタムグループから削除
          tab.group = tab.domain;
          tab.groupType = 'domain';
          tab.customGroups = [];
        }
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
    
    for (const tabId of tabIds) {
      const request = store.get(tabId);
      request.onsuccess = () => {
        const tab = request.result as SavedTab | undefined;
        if (tab) {
          // レガシーフィールドの更新
          tab.group = groupName;
          tab.groupType = 'custom';
          
          // 新しい配列フィールドの更新
          if (!tab.customGroups) {
            tab.customGroups = [groupName];
          } else if (!tab.customGroups.includes(groupName)) {
            tab.customGroups.push(groupName);
          }
          
          store.put(tab);
        }
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 複数タブをカスタムグループから削除（ドメイングループに戻す）
 */
export async function removeMultipleTabsFromGroup(tabIds: string[], groupName?: string): Promise<void> {
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
          if (groupName) {
            // 特定のグループから削除
            if (tab.customGroups) {
              tab.customGroups = tab.customGroups.filter(g => g !== groupName);
            }
            
            if (tab.group === groupName) {
              if (tab.customGroups && tab.customGroups.length > 0) {
                tab.group = tab.customGroups[0];
                tab.groupType = 'custom';
              } else {
                tab.group = tab.domain;
                tab.groupType = 'domain';
              }
            }
          } else {
            // 全てのカスタムグループから削除
            tab.group = tab.domain;
            tab.groupType = 'domain';
            tab.customGroups = [];
          }
          store.put(tab);
        }
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ==============================
// ゴミ箱関連の関数
// ==============================

/**
 * タブをゴミ箱に移動
 * @param id タブID
 * @param retentionDays 保持期間（0の場合は即時完全削除）
 */
export async function moveTabToTrash(id: string, retentionDays: number = 7): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, TRASH_STORE_NAME], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE_NAME);
    
    const getRequest = tabStore.get(id);
    
    getRequest.onsuccess = () => {
      const tab = getRequest.result as SavedTab | undefined;
      if (!tab) {
        return; // タブが見つからない場合は何もしない
      }
      
      // 期間が0日の場合は即時完全削除
      if (retentionDays === 0) {
        tabStore.delete(id);
        return;
      }
      
      // ゴミ箱用のデータを作成
      const trashedTab: TrashedTab = {
        ...tab,
        trashedAt: Date.now(),
        originalGroup: tab.group,
        originalGroupType: tab.groupType,
        originalCustomGroups: tab.customGroups,
      };
      
      // ゴミ箱に追加
      trashStore.put(trashedTab);
      
      // 元のストアから削除
      tabStore.delete(id);
    };
    
    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 複数のタブをゴミ箱に移動
 */
export async function moveTabsToTrash(ids: string[], retentionDays: number = 7): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, TRASH_STORE_NAME], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE_NAME);
    
    for (const id of ids) {
      const getRequest = tabStore.get(id);
      
      getRequest.onsuccess = () => {
        const tab = getRequest.result as SavedTab | undefined;
        if (!tab) return;
        
        // 期間が0日の場合は即時完全削除
        if (retentionDays === 0) {
          tabStore.delete(id);
          return;
        }
        
        // ゴミ箱用のデータを作成
        const trashedTab: TrashedTab = {
          ...tab,
          trashedAt: Date.now(),
          originalGroup: tab.group,
          originalGroupType: tab.groupType,
          originalCustomGroups: tab.customGroups,
        };
        
        trashStore.put(trashedTab);
        tabStore.delete(id);
      };
    }
    
    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * グループ内の全タブをゴミ箱に移動
 */
export async function moveGroupToTrash(groupName: string, retentionDays: number = 7): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, TRASH_STORE_NAME], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE_NAME);
    const request = tabStore.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        const matches = 
          (tab.groupType === 'custom' && (tab.customGroups?.includes(groupName) || tab.group === groupName)) ||
          (tab.groupType === 'domain' && (tab.group === groupName || tab.domain === groupName));
          
        if (matches) {
          // 期間が0日の場合は即時完全削除
          if (retentionDays === 0) {
            cursor.delete();
          } else {
            // ゴミ箱にコピー
            const trashedTab: TrashedTab = {
              ...tab,
              trashedAt: Date.now(),
              originalGroup: tab.group,
              originalGroupType: tab.groupType,
              originalCustomGroups: tab.customGroups,
            };
            trashStore.put(trashedTab);
            cursor.delete();
          }
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * ゴミ箱からタブを復元
 */
export async function restoreTabFromTrash(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, TRASH_STORE_NAME], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE_NAME);
    
    const getRequest = trashStore.get(id);
    
    getRequest.onsuccess = () => {
      const trashedTab = getRequest.result as TrashedTab | undefined;
      if (!trashedTab) return;
      
      // 元のタブデータを復元
      const restoredTab: SavedTab = {
        id: trashedTab.id,
        url: trashedTab.url,
        canonicalUrl: trashedTab.canonicalUrl,
        title: trashedTab.title,
        displayName: trashedTab.displayName,
        domain: trashedTab.domain,
        group: trashedTab.originalGroup,
        groupType: trashedTab.originalGroupType,
        customGroups: trashedTab.originalCustomGroups,
        favIconUrl: trashedTab.favIconUrl,
        screenshot: trashedTab.screenshot,
        lastAccessed: trashedTab.lastAccessed,
        savedAt: trashedTab.savedAt,
      };
      
      // タブストアに追加
      tabStore.put(restoredTab);
      
      // ゴミ箱から削除
      trashStore.delete(id);
    };
    
    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 複数のタブをゴミ箱から復元
 */
export async function restoreTabsFromTrash(ids: string[]): Promise<void> {
  for (const id of ids) {
    await restoreTabFromTrash(id);
  }
}

/**
 * ゴミ箱の全タブを復元
 */
export async function restoreAllFromTrash(): Promise<void> {
  const trashedTabs = await getTrashedTabs();
  const ids = trashedTabs.map(tab => tab.id);
  await restoreTabsFromTrash(ids);
}

/**
 * ゴミ箱内の全タブを取得（削除日時の降順）
 */
export async function getTrashedTabs(): Promise<TrashedTab[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const index = store.index('trashedAt');
    const request = index.openCursor(null, 'prev'); // 降順
    
    const results: TrashedTab[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        results.push(cursor.value as TrashedTab);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * ゴミ箱内のタブ数を取得
 */
export async function getTrashCount(): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readonly');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * ゴミ箱からタブを完全削除
 */
export async function deleteFromTrash(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 複数のタブをゴミ箱から完全削除
 */
export async function deleteMultipleFromTrash(ids: string[]): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    
    for (const id of ids) {
      store.delete(id);
    }

    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * ゴミ箱を空にする
 */
export async function emptyTrash(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 期限切れのゴミ箱タブを削除
 * @param retentionDays 保持期間（日）
 * @returns 削除されたタブ数
 */
export async function deleteExpiredTrash(retentionDays: number): Promise<number> {
  const db = await openDB();
  const expirationTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE_NAME);
    const index = store.index('trashedAt');
    const range = IDBKeyRange.upperBound(expirationTime);
    const request = index.openCursor(range);
    
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      if (deletedCount > 0) {
        browser.runtime.sendMessage({ type: 'trash-changed' }).catch(() => {});
      }
      resolve(deletedCount);
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

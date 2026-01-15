/**
 * storage/dbCore.ts - IndexedDB接続とマイグレーションの管理
 */

import {
  DB_NAME,
  DB_VERSION,
  TABS_STORE_NAME,
  CUSTOM_GROUPS_STORE_NAME,
  BACKUPS_STORE_NAME,
  TRASH_STORE_NAME,
  type CustomGroupMeta,
} from '../dbSchema';

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
export async function openDB(): Promise<IDBDatabase> {
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
        if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE)) {
          const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE, { keyPath: 'name' });
          groupStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        const tabStore = transaction.objectStore(STORE_NAME);
        if (!tabStore.indexNames.contains('group')) {
          tabStore.createIndex('group', 'group', { unique: false });
        }
        if (!tabStore.indexNames.contains('groupType')) {
          tabStore.createIndex('groupType', 'groupType', { unique: false });
        }
        
        const cursorRequest = tabStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
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
        if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
          const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
          backupStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }

      // バージョン4: 複数カスタムグループ対応
      if (oldVersion < 4) {
        const tabStore = transaction.objectStore(STORE_NAME);
        if (!tabStore.indexNames.contains('customGroups')) {
          tabStore.createIndex('customGroups', 'customGroups', { unique: false, multiEntry: true });
        }
        
        const cursorRequest = tabStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
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
        if (!groupStore.indexNames.contains('sortOrder')) {
          groupStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        }
        
        const allGroups: CustomGroupMeta[] = [];
        const cursorRequest = groupStore.openCursor();
        cursorRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            allGroups.push(cursor.value as CustomGroupMeta);
            cursor.continue();
          } else {
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
        if (!tabStore.indexNames.contains('canonicalUrl')) {
          tabStore.createIndex('canonicalUrl', 'canonicalUrl', { unique: false });
        }
        
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
        if (!db.objectStoreNames.contains(TRASH_STORE_NAME)) {
          const trashStore = db.createObjectStore(TRASH_STORE_NAME, { keyPath: 'id' });
          trashStore.createIndex('trashedAt', 'trashedAt', { unique: false });
          trashStore.createIndex('domain', 'domain', { unique: false });
        }
      }

      // バージョン8: グループ個別ソートとタブ個別ソートキー対応
      if (oldVersion < 8) {
        const tabStore = transaction.objectStore(STORE_NAME);
        const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);

        const tabCursor = tabStore.openCursor();
        tabCursor.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const tab = cursor.value;
            if (tab.favIconUrl !== undefined) {
              tab.faviconUrl = tab.favIconUrl;
              delete tab.favIconUrl;
            }
            cursor.update(tab);
            cursor.continue();
          }
        };

        const groupCursor = groupStore.openCursor();
        groupCursor.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.continue();
          }
        };
      }
    };
  });
}

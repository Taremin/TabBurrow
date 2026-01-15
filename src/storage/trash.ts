/**
 * storage/trash.ts - ゴミ箱関連の操作
 */

import {
  TRASH_STORE_NAME,
  TABS_STORE_NAME,
  type SavedTab,
  type TrashedTab,
} from '../dbSchema';
import { openDB } from './dbCore';
import browser from '../browserApi';

const TRASH_STORE = TRASH_STORE_NAME;
const STORE_NAME = TABS_STORE_NAME;

/**
 * タブをゴミ箱に移動
 */
export async function moveTabToTrash(id: string, retentionDays: number = 7): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE);
    
    const getRequest = tabStore.get(id);
    
    getRequest.onsuccess = () => {
      const tab = getRequest.result as SavedTab | undefined;
      if (!tab) return;
      
      if (retentionDays === 0) {
        tabStore.delete(id);
        return;
      }
      
      const now = Date.now();
      const trashedTab: TrashedTab = {
        ...tab,
        trashedAt: now,
        originalGroup: tab.group,
        originalGroupType: tab.groupType,
        originalCustomGroups: tab.customGroups || [],
      };
      
      trashStore.put(trashedTab);
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
    const transaction = db.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE);
    
    for (const id of ids) {
      const getRequest = tabStore.get(id);
      getRequest.onsuccess = () => {
        const tab = getRequest.result as SavedTab | undefined;
        if (!tab) return;
        
        if (retentionDays === 0) {
          tabStore.delete(id);
          return;
        }
        
        const trashedTab: TrashedTab = {
          ...tab,
          trashedAt: Date.now(),
          originalGroup: tab.group,
          originalGroupType: tab.groupType,
          originalCustomGroups: tab.customGroups || [],
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
    const transaction = db.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE);
    const request = tabStore.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        const matches = 
          (tab.groupType === 'custom' && (tab.customGroups?.includes(groupName) || tab.group === groupName)) ||
          (tab.groupType === 'domain' && (tab.group === groupName || tab.domain === groupName));
          
        if (matches) {
          if (retentionDays === 0) {
            cursor.delete();
          } else {
            const trashedTab: TrashedTab = {
              ...tab,
              trashedAt: Date.now(),
              originalGroup: tab.group,
              originalGroupType: tab.groupType,
              originalCustomGroups: tab.customGroups || [],
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
    const transaction = db.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const tabStore = transaction.objectStore(STORE_NAME);
    const trashStore = transaction.objectStore(TRASH_STORE);
    
    const getRequest = trashStore.get(id);
    getRequest.onsuccess = () => {
      const trashedTab = getRequest.result as TrashedTab | undefined;
      if (!trashedTab) return;
      
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
        faviconUrl: trashedTab.faviconUrl,
        screenshot: trashedTab.screenshot,
        lastAccessed: trashedTab.lastAccessed,
        savedAt: trashedTab.savedAt,
        sortKey: trashedTab.sortKey,
      };
      
      tabStore.put(restoredTab);
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
 * ゴミ箱内の全タブを取得（削除日時の降順）
 */
export async function getTrashedTabs(): Promise<TrashedTab[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE, 'readonly');
    const store = transaction.objectStore(TRASH_STORE);
    const index = store.index('trashedAt');
    const request = index.openCursor(null, 'prev');
    
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
 * ゴミ箱内のタブ数を取得
 */
export async function getTrashCount(): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE, 'readonly');
    const store = transaction.objectStore(TRASH_STORE);
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
    const transaction = db.transaction(TRASH_STORE, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE);
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
    const transaction = db.transaction(TRASH_STORE, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE);
    
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
    const transaction = db.transaction(TRASH_STORE, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE);
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
 */
export async function deleteExpiredTrash(retentionDays: number): Promise<number> {
  const db = await openDB();
  const expirationTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TRASH_STORE, 'readwrite');
    const store = transaction.objectStore(TRASH_STORE);
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

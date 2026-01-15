/**
 * storage/groups.ts - カスタムグループ関連の操作
 */

import {
  CUSTOM_GROUPS_STORE_NAME,
  TABS_STORE_NAME,
  type CustomGroupMeta,
  type SavedTab,
} from '../dbSchema';
import { openDB } from './dbCore';
import browser from '../browserApi';
import { type CustomSortKeyOrder, type ItemSortType } from '../settings';

const CUSTOM_GROUPS_STORE = CUSTOM_GROUPS_STORE_NAME;
const STORE_NAME = TABS_STORE_NAME;

/**
 * 全カスタムグループを取得（sortOrder順）
 */
export async function getAllCustomGroups(): Promise<CustomGroupMeta[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readonly');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    
    let request: IDBRequest;
    if (store.indexNames.contains('sortOrder')) {
      const index = store.index('sortOrder');
      request = index.openCursor(null, 'next');
    } else {
      const index = store.index('createdAt');
      request = index.openCursor(null, 'prev');
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
 * カスタムグループを作成
 */
export async function createCustomGroup(name: string): Promise<CustomGroupMeta> {
  const db = await openDB();
  const now = Date.now();
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
 * カスタムグループ名を変更
 */
export async function renameCustomGroup(oldName: string, newName: string): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CUSTOM_GROUPS_STORE, STORE_NAME], 'readwrite');
    const groupStore = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const tabStore = transaction.objectStore(STORE_NAME);
    
    const getRequest = groupStore.get(oldName);
    getRequest.onsuccess = () => {
      const oldGroup = getRequest.result as CustomGroupMeta | undefined;
      if (!oldGroup) {
        reject(new Error(`グループ "${oldName}" が見つかりません`));
        return;
      }
      
      const newGroup: CustomGroupMeta = {
        name: newName,
        createdAt: oldGroup.createdAt,
        updatedAt: Date.now(),
        sortOrder: oldGroup.sortOrder ?? 0,
        color: oldGroup.color,
        itemSort: oldGroup.itemSort,
        customSortKeyOrder: oldGroup.customSortKeyOrder,
      };
      groupStore.add(newGroup);
      groupStore.delete(oldName);
      
      const tabCursor = tabStore.openCursor();
      tabCursor.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const tab = cursor.value as SavedTab;
          let changed = false;
          
          if (tab.group === oldName) {
            tab.group = newName;
            changed = true;
          }
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
    
    groupStore.delete(name);
    
    const tabCursor = tabStore.openCursor();
    tabCursor.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const tab = cursor.value as SavedTab;
        let changed = false;
        
        if (tab.group === name) {
          tab.group = tab.domain;
          tab.groupType = 'domain';
          changed = true;
        }
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
 */
export async function updateCustomGroupOrder(groupNames: string[]): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    
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
        tab.group = groupName;
        tab.groupType = 'custom';
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
          tab.group = groupName;
          tab.groupType = 'custom';
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

/**
 * カスタムグループの個別アイテムソート順を更新
 */
export async function updateCustomGroupItemSort(groupName: string, itemSort: string | undefined): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const getRequest = store.get(groupName);

    getRequest.onsuccess = () => {
      const group = getRequest.result as CustomGroupMeta | undefined;
      if (group) {
        group.itemSort = itemSort;
        group.updatedAt = Date.now();
        store.put(group);
      }
    };

    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * カスタムグループの個別カスタムソートキー順を更新
 */
export async function updateCustomGroupCustomSortKeyOrder(groupName: string, order: CustomSortKeyOrder | undefined): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE);
    const getRequest = store.get(groupName);

    getRequest.onsuccess = () => {
      const group = getRequest.result as CustomGroupMeta | undefined;
      if (group) {
        group.customSortKeyOrder = order;
        group.updatedAt = Date.now();
        store.put(group);
      }
    };

    transaction.oncomplete = () => {
      browser.runtime.sendMessage({ type: 'custom-groups-changed' }).catch(() => {});
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * ピン留めドメイングループの個別アイテムソート順を更新（browser.storage.local）
 */
export async function updatePinnedDomainGroupSort(domain: string, itemSort: ItemSortType | undefined): Promise<void> {
  const { getSettings, saveSettings } = await import('../settings');
  const settings = await getSettings();
  const pinnedGroups = (settings.pinnedDomainGroups || []).map(g => {
    if (g.domain === domain) {
      return { ...g, itemSort };
    }
    return g;
  });
  await saveSettings({ pinnedDomainGroups: pinnedGroups });
  browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
}

/**
 * ピン留めドメイングループの個別カスタムソートキー順を更新（browser.storage.local）
 */
export async function updatePinnedDomainGroupCustomSortKeyOrder(domain: string, order: CustomSortKeyOrder | undefined): Promise<void> {
  const { getSettings, saveSettings } = await import('../settings');
  const settings = await getSettings();
  const pinnedGroups = (settings.pinnedDomainGroups || []).map(g => {
    if (g.domain === domain) {
      return { ...g, customSortKeyOrder: order };
    }
    return g;
  });
  await saveSettings({ pinnedDomainGroups: pinnedGroups });
  browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
}

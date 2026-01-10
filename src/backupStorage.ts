/**
 * TabBurrow - バックアップストレージ層
 * タブ情報の定期バックアップと復元を管理
 */

import {
  DB_NAME,
  DB_VERSION,
  TABS_STORE_NAME,
  CUSTOM_GROUPS_STORE_NAME,
  BACKUPS_STORE_NAME,
  type SavedTab,
  type CustomGroupMeta,
  type BackupTab,
  type BackupRecord,
} from './dbSchema';
import { getAllTabs, getAllCustomGroups, saveTabs, deleteAllTabs } from './storage';

// バックアップ関連の型を再エクスポート
export type { BackupTab, BackupRecord };

let dbInstance: IDBDatabase | null = null;

/**
 * データベースインスタンスをリセット（テスト用）
 */
export function resetBackupDBInstance(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * IndexedDBデータベースを開く（バックアップ用）
 */
async function openBackupDB(): Promise<IDBDatabase> {
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
      
      // バックアップストアを作成（DB_VERSION 3以降）
      if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
        const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
        backupStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * バックアップを作成
 * - 全タブと全カスタムグループを取得してバックアップレコードを作成
 */
export async function createBackup(): Promise<BackupRecord> {
  const db = await openBackupDB();
  
  // 現在のタブとカスタムグループを取得
  const tabs = await getAllTabs();
  const customGroups = await getAllCustomGroups();
  
  // タブをバックアップ用にコピー
  const backupTabs: BackupTab[] = tabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    displayName: tab.displayName,
    domain: tab.domain,
    group: tab.group,
    groupType: tab.groupType,
    customGroups: tab.customGroups,
    favIconUrl: tab.favIconUrl,
    screenshot: tab.screenshot,
    lastAccessed: tab.lastAccessed,
    savedAt: tab.savedAt,
  }));
  
  const now = Date.now();
  const backup: BackupRecord = {
    id: `backup-${now}`,
    createdAt: now,
    version: DB_VERSION,
    tabCount: backupTabs.length,
    customGroups: customGroups,
    tabs: backupTabs,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUPS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BACKUPS_STORE_NAME);
    const request = store.add(backup);

    request.onsuccess = () => resolve(backup);
    request.onerror = () => reject(request.error);
  });
}

/**
 * バックアップ一覧を取得（日時降順）
 * メタデータのみ返す（tabsは含まない）
 */
export async function listBackups(): Promise<Omit<BackupRecord, 'tabs'>[]> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUPS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKUPS_STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // 降順
    
    const results: Omit<BackupRecord, 'tabs'>[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const record = cursor.value as BackupRecord;
        // tabsを除いたメタデータのみ返す
        results.push({
          id: record.id,
          createdAt: record.createdAt,
          version: record.version,
          tabCount: record.tabCount,
          customGroups: record.customGroups,
        });
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * 指定したバックアップを取得
 */
export async function getBackup(backupId: string): Promise<BackupRecord | null> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUPS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKUPS_STORE_NAME);
    const request = store.get(backupId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 指定したバックアップから復元
 * @param backupId バックアップID
 * @param mode 'merge' | 'overwrite'
 * @returns 復元結果
 */
export async function restoreFromBackup(
  backupId: string, 
  mode: 'merge' | 'overwrite'
): Promise<{ restored: number; skipped: number }> {
  const backup = await getBackup(backupId);
  if (!backup) {
    throw new Error(`バックアップが見つかりません: ${backupId}`);
  }
  
  if (mode === 'overwrite') {
    // 既存データを全削除
    await deleteAllTabs();
    // カスタムグループも削除して再作成
    await clearAndRestoreCustomGroups(backup.customGroups);
  }
  
  // タブをSavedTab形式に変換
  const tabsToRestore: SavedTab[] = backup.tabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    displayName: tab.displayName,
    domain: tab.domain,
    group: tab.group,
    groupType: tab.groupType,
    customGroups: tab.customGroups,
    favIconUrl: tab.favIconUrl,
    screenshot: tab.screenshot,
    lastAccessed: tab.lastAccessed,
    savedAt: tab.savedAt,
  }));
  
  if (mode === 'overwrite') {
    // 全タブを保存
    await saveTabs(tabsToRestore);
    return { restored: tabsToRestore.length, skipped: 0 };
  } else {
    // マージモード: 既存タブと統合（重複URLはスキップ）
    const existingTabs = await getAllTabs();
    const existingUrls = new Set(existingTabs.map(t => t.url));
    
    const newTabs = tabsToRestore.filter(t => !existingUrls.has(t.url));
    if (newTabs.length > 0) {
      await saveTabs(newTabs);
    }
    
    return { 
      restored: newTabs.length, 
      skipped: tabsToRestore.length - newTabs.length 
    };
  }
}

/**
 * カスタムグループを全削除して復元
 */
async function clearAndRestoreCustomGroups(groups: CustomGroupMeta[]): Promise<void> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOM_GROUPS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CUSTOM_GROUPS_STORE_NAME);
    
    // まず全削除
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      // その後復元
      for (const group of groups) {
        store.add(group);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * 古いバックアップを削除（世代管理）
 * @param keepCount 保持する世代数（-1 = 無制限、0 = 全削除）
 */
export async function pruneOldBackups(keepCount: number): Promise<void> {
  if (keepCount < 0) {
    // 無制限の場合は何もしない
    return;
  }
  
  const backups = await listBackups();
  
  if (keepCount === 0) {
    // 全削除
    for (const backup of backups) {
      await deleteBackup(backup.id);
    }
    return;
  }
  
  // keepCount以降のバックアップを削除
  const toDelete = backups.slice(keepCount);
  for (const backup of toDelete) {
    await deleteBackup(backup.id);
  }
}

/**
 * 指定したバックアップを削除
 */
export async function deleteBackup(backupId: string): Promise<void> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUPS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(BACKUPS_STORE_NAME);
    const request = store.delete(backupId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Blob を DataURL に変換
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  if (blob.size === 0) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * バックアップをエクスポート用JSONに変換
 * - Blob を DataURL に変換してシリアライズ可能にする
 */
export async function exportBackupAsJson(backupId: string): Promise<string> {
  const backup = await getBackup(backupId);
  if (!backup) {
    throw new Error(`バックアップが見つかりません: ${backupId}`);
  }
  
  // タブのスクリーンショットをDataURLに変換
  const tabsWithDataUrl = await Promise.all(
    backup.tabs.map(async (tab) => ({
      ...tab,
      screenshot: await blobToDataUrl(tab.screenshot),
    }))
  );
  
  const exportData = {
    ...backup,
    tabs: tabsWithDataUrl,
    exportedAt: Date.now(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * バックアップをダウンロード
 */
export async function downloadBackup(backupId: string): Promise<void> {
  const jsonData = await exportBackupAsJson(backupId);
  const backup = await getBackup(backupId);
  if (!backup) {
    throw new Error(`バックアップが見つかりません: ${backupId}`);
  }
  
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date(backup.createdAt);
  const filename = `tabburrow-backup-${date.toISOString().slice(0, 10)}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * バックアップ数を取得
 */
export async function getBackupCount(): Promise<number> {
  const db = await openBackupDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BACKUPS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(BACKUPS_STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

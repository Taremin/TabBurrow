/**
 * E2Eテスト用ヘルパー関数
 */
import type { Page } from '@playwright/test';

/**
 * タブ管理画面のセレクター
 */
export const tabsPageSelectors = {
  // ヘッダー
  header: '.header',
  searchInput: 'input[placeholder]',
  settingsLink: 'a[href="options.html"]',
  
  // タブリスト
  tabList: '.tab-list',
  tabCard: '.tab-card',
  tabTitle: '.tab-title',
  tabUrl: '.tab-url',
  
  // グループ
  groupHeader: '.group-header',
  groupTitle: '.group-title',
  
  // ボタン
  deleteButton: '.delete-btn',
  openButton: '.open-btn',
  
  // 確認ダイアログ
  confirmDialog: '.confirm-dialog',
  confirmButton: '.confirm-btn',
  cancelButton: '.cancel-btn',
};

/**
 * 設定画面のセレクター
 */
export const optionsPageSelectors = {
  // コンテナ
  container: '.container',
  header: '.header',
  
  // 設定セクション
  settingsSection: '.settings-section',
  
  // 言語設定
  localeSelect: 'select[name="locale"]',
  
  // テーマ設定
  themeRadio: 'input[name="theme"]',
  
  // 自動クローズ設定
  autoCloseEnabled: 'input[name="autoCloseEnabled"]',
  autoCloseSeconds: 'input[name="autoCloseSeconds"]',
  
  // 保存ボタン
  submitButton: 'button[type="submit"]',
  
  // タブ管理リンク
  tabManagerLink: 'a[href="tabs.html"]',
};

/**
 * 指定時間待機する
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ページが完全に読み込まれるまで待機
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
}

/**
 * テスト用のタブデータを作成（IndexedDB直接挿入）
 * dbSchema.tsのSavedTab型に準拠したデータを作成
 */
export async function createTestTabData(page: Page, tabData: {
  url: string;
  title: string;
  domain?: string;
  group?: string;
  groupType?: 'domain' | 'custom';
}): Promise<void> {
  // dbSchema.tsと同じ定数を使用
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 3;
  const TABS_STORE_NAME = 'tabs';
  const CUSTOM_GROUPS_STORE_NAME = 'customGroups';
  const BACKUPS_STORE_NAME = 'backups';
  
  // IndexedDBに直接テストデータを挿入
  await page.evaluate(async ({ data, dbConfig }) => {
    const { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME } = dbConfig;
    
    // DBを開く
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // tabsストアを作成
          if (!db.objectStoreNames.contains(TABS_STORE_NAME)) {
            const store = db.createObjectStore(TABS_STORE_NAME, { keyPath: 'id' });
            store.createIndex('domain', 'domain', { unique: false });
            store.createIndex('savedAt', 'savedAt', { unique: false });
            store.createIndex('url', 'url', { unique: false });
            store.createIndex('title', 'title', { unique: false });
            store.createIndex('group', 'group', { unique: false });
            store.createIndex('groupType', 'groupType', { unique: false });
          }
          
          // customGroupsストアを作成
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
            groupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // backupsストアを作成
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
            backupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };
        
        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    };

    const db = await openDB();
    
    // URLからドメインを抽出
    let domain = data.domain;
    if (!domain) {
      try {
        domain = new URL(data.url).hostname;
      } catch {
        domain = 'unknown';
      }
    }
    
    // SavedTab型に準拠したオブジェクトを作成
    const tab = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      url: data.url,
      title: data.title,
      domain: domain,
      group: data.group || domain,
      groupType: data.groupType || 'domain',
      favIconUrl: '',
      screenshot: new Blob([]),
      lastAccessed: Date.now(),
      savedAt: Date.now(),
    };
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([TABS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TABS_STORE_NAME);
      store.add(tab);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { 
    data: tabData, 
    dbConfig: { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, BACKUPS_STORE_NAME } 
  });
}

/**
 * 大量のテスト用タブデータを一括作成（IndexedDB直接挿入）
 * パフォーマンステスト用に最適化
 */
export async function createBulkTestTabData(page: Page, count: number, options: {
  domainPrefix?: string;
  domainCount?: number;
} = {}): Promise<void> {
  // dbSchema.tsと同じ定数を使用
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 3;
  const TABS_STORE_NAME = 'tabs';
  const CUSTOM_GROUPS_STORE_NAME = 'customGroups';
  const BACKUPS_STORE_NAME = 'backups';
  
  const { domainPrefix = 'test', domainCount = 50 } = options;
  
  await page.evaluate(async ({ count, domainPrefix, domainCount, dbConfig }) => {
    const { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME } = dbConfig;
    
    // DBを開く
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // tabsストアを作成
          if (!db.objectStoreNames.contains(TABS_STORE_NAME)) {
            const store = db.createObjectStore(TABS_STORE_NAME, { keyPath: 'id' });
            store.createIndex('domain', 'domain', { unique: false });
            store.createIndex('savedAt', 'savedAt', { unique: false });
            store.createIndex('url', 'url', { unique: false });
            store.createIndex('title', 'title', { unique: false });
            store.createIndex('group', 'group', { unique: false });
            store.createIndex('groupType', 'groupType', { unique: false });
          }
          
          // customGroupsストアを作成
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
            groupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // backupsストアを作成
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
            backupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };
        
        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    };

    const db = await openDB();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([TABS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TABS_STORE_NAME);
      
      const now = Date.now();
      
      // 一括でデータを挿入
      for (let i = 0; i < count; i++) {
        const domainIndex = i % domainCount;
        const domain = `${domainPrefix}${domainIndex}.example.com`;
        
        const tab = {
          id: `${now}-${i}-${Math.random().toString(36).slice(2)}`,
          url: `https://${domain}/page/${i}`,
          title: `Test Page ${i} - ${domain}`,
          domain: domain,
          group: domain,
          groupType: 'domain',
          favIconUrl: '',
          screenshot: new Blob([]),
          lastAccessed: now - (count - i) * 1000, // 時間をずらして作成
          savedAt: now - (count - i) * 1000,
        };
        
        store.add(tab);
      }
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { 
    count, 
    domainPrefix, 
    domainCount,
    dbConfig: { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, BACKUPS_STORE_NAME } 
  });
}

/**
 * テスト用のタブデータをクリア
 * dbSchema.tsと同じ定数を使用
 */
export async function clearTestData(page: Page): Promise<void> {
  // dbSchema.tsと同じ定数を使用
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 3;
  const TABS_STORE_NAME = 'tabs';
  const CUSTOM_GROUPS_STORE_NAME = 'customGroups';
  const BACKUPS_STORE_NAME = 'backups';
  
  await page.evaluate(async (dbConfig) => {
    const { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME } = dbConfig;
    
    // IndexedDBの全データをクリア
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(TABS_STORE_NAME)) {
            db.createObjectStore(TABS_STORE_NAME, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
          }
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
          }
        };
      });
    };

    const db = await openDB();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME], 'readwrite');
      transaction.objectStore(TABS_STORE_NAME).clear();
      transaction.objectStore(CUSTOM_GROUPS_STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, BACKUPS_STORE_NAME });
}


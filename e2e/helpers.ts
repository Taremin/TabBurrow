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
  searchInput: '.search-input', // クラス名を維持しつつ
  settingsLink: 'a[href="options.html"]',
  dateFilterToggle: '[data-testid="date-filter-toggle"]',
  createGroupButton: '[data-testid="create-group-button"]',
  bulkSelectToggle: '[data-testid="bulk-select-toggle"]',
  bulkMoveButton: '[data-testid="bulk-move-button"]',
  bulkDeleteButton: '[data-testid="bulk-delete-button"]',
  bulkOpenTabGroupButton: '[data-testid="bulk-open-tab-group-button"]',
  
  // タブリスト
  tabList: '.tab-list',
  tabCard: '[data-testid="tab-card"]',
  tabTitle: '[data-testid="tab-title"]',
  tabUrl: '[data-testid="tab-url"]',
  
  // グループ
  groupHeader: '[data-testid="group-header"]',
  groupTitle: '.group-title',
  groupCheckbox: '[data-testid="group-checkbox"]',
  groupFilterToggle: '[data-testid="group-filter-toggle"]',
  groupFilterInput: '[data-testid="group-filter-input"]',
  groupOpenTabGroupButton: '[data-testid="group-open-tab-group-button"]',
  
  // ボタン
  groupRenameButton: '[data-testid="group-rename-button"]',
  pinButton: '[data-testid="group-pin-button"]',
  groupActionButton: '[data-testid="group-action-button"]',
  tabRenameButton: '[data-testid="tab-rename-button"]',
  tabGroupButton: '[data-testid="tab-group-button"]',
  tabDeleteButton: '[data-testid="tab-delete-button"]',
  
  // 確認ダイアログ
  confirmDialog: '.confirm-dialog',
  confirmButton: '.confirm-btn',
  cancelButton: '.cancel-btn',
  
  // その他
  screenshotPopup: '[data-testid="screenshot-popup"]',
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
  
  // 自動収納設定
  autoCloseEnabled: 'input[name="autoCloseEnabled"]',
  autoCloseSeconds: 'input[name="autoCloseSeconds"]',
  
  // セクション
  languageSection: '[data-testid="language-section"]',
  appearanceSection: '[data-testid="appearance-section"]',
  viewModeSection: '[data-testid="view-mode-section"]',
  sortSection: '[data-testid="sort-section"]',
  iconClickSection: '[data-testid="icon-click-section"]',
  autoCloseSection: '[data-testid="auto-close-section"]',
  restoreSection: '[data-testid="restore-section"]',
  linkCheckSection: '[data-testid="link-check-section"]',
  backupSection: '[data-testid="backup-section"]',
  domainGroupsSection: '[data-testid="domain-groups-section"]',
  customGroupsSection: '[data-testid="custom-groups-section"]',
  pinnedDomainGroupsSection: '[data-testid="pinned-domain-groups-section"]',
  
  // ボタン
  addRuleButton: '[data-testid="add-rule-button"]',
  conditionError: '[data-testid="condition-error"]',
  
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
  screenshot?: boolean; // スクリーンショットを含めるか
  displayName?: string; // カスタム表示名
  customGroups?: string[]; // カスタムグループ名
  savedAt?: number; // 保存日時
  lastAccessed?: number; // 最終アクセス日時
}): Promise<void> {
  // dbSchema.tsと同じ定数を使用
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 8;
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
        
        request.onerror = () => {
          console.error('[E2E Helper] openDB error:', request.error);
          reject(request.error);
        };
        
        request.onupgradeneeded = (event) => {
          console.log('[E2E Helper] openDB upgradeneeded');
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
            store.createIndex('canonicalUrl', 'canonicalUrl', { unique: false });
          }
          
          // customGroupsストアを作成
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
            groupStore.createIndex('createdAt', 'createdAt', { unique: false });
            groupStore.createIndex('sortOrder', 'sortOrder', { unique: false });
          }
          
          // backupsストアを作成
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
            backupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // trashストアを作成（DB_VERSION 7で追加）
          if (!db.objectStoreNames.contains('trash')) {
            const trashStore = db.createObjectStore('trash', { keyPath: 'id' });
            trashStore.createIndex('trashedAt', 'trashedAt', { unique: false });
            trashStore.createIndex('domain', 'domain', { unique: false });
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
    
    // スクリーンショット用のBlob生成
    let screenshotBlob: Blob;
    if (data.screenshot) {
      // ダミースクリーンショット（赤い四角）をPNG形式で生成
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText('Test', 20, 50);
      }
      screenshotBlob = await new Promise<Blob>(resolve => {
        canvas.toBlob(blob => resolve(blob!), 'image/png');
      });
    } else {
      screenshotBlob = new Blob([]);
    }
    
    // SavedTab型に準拠したオブジェクトを作成
    const tab: Record<string, unknown> = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      url: data.url,
      title: data.title,
      domain: domain,
      group: data.group || domain,
      groupType: data.groupType || 'domain',
      favIconUrl: '',
      screenshot: screenshotBlob,
      lastAccessed: data.lastAccessed || Date.now(),
      savedAt: data.savedAt || Date.now(),
      canonicalUrl: data.url, // デフォルトはURLそのまま
    };
    
    // displayNameが指定されている場合のみ追加
    if (data.displayName) {
      tab.displayName = data.displayName;
    }
    
    // customGroupsが指定されている場合のみ追加
    if (data.customGroups) {
      tab.customGroups = data.customGroups;
    }
    
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
  const DB_VERSION = 8;
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
            store.createIndex('canonicalUrl', 'canonicalUrl', { unique: false });
          }
          
          // customGroupsストアを作成
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
            groupStore.createIndex('createdAt', 'createdAt', { unique: false });
            groupStore.createIndex('sortOrder', 'sortOrder', { unique: false });
          }
          
          // backupsストアを作成
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
            backupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // trashストアを作成（DB_VERSION 7で追加）
          if (!db.objectStoreNames.contains('trash')) {
            const trashStore = db.createObjectStore('trash', { keyPath: 'id' });
            trashStore.createIndex('trashedAt', 'trashedAt', { unique: false });
            trashStore.createIndex('domain', 'domain', { unique: false });
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
          canonicalUrl: `https://${domain}/page/${i}`,
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
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 8;
  const TABS_STORE_NAME = 'tabs';
  const CUSTOM_GROUPS_STORE_NAME = 'customGroups';
  const TRASH_STORE_NAME = 'trash';

  await page.evaluate(async (config) => {
    const { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, TRASH_STORE_NAME } = config;
    
    // DBを開く（ストアがない場合に作成するため）
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(TABS_STORE_NAME)) {
            const store = db.createObjectStore(TABS_STORE_NAME, { keyPath: 'id' });
            store.createIndex('domain', 'domain', { unique: false });
          }
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
          }
          if (!db.objectStoreNames.contains(TRASH_STORE_NAME)) {
            const trashStore = db.createObjectStore(TRASH_STORE_NAME, { keyPath: 'id' });
            trashStore.createIndex('trashedAt', 'trashedAt', { unique: false });
            trashStore.createIndex('domain', 'domain', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const db = await openDB();
    const transaction = db.transaction([TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, TRASH_STORE_NAME], 'readwrite');
    transaction.objectStore(TABS_STORE_NAME).clear();
    transaction.objectStore(CUSTOM_GROUPS_STORE_NAME).clear();
    transaction.objectStore(TRASH_STORE_NAME).clear();
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, TRASH_STORE_NAME });
}

/**
 * テスト用のカスタムグループデータを作成（IndexedDB直接挿入）
 */
export async function createCustomGroupData(page: Page, groups: {
  name: string;
  sortOrder?: number;
}[]): Promise<void> {
  const DB_NAME = 'TabBurrowDB';
  const DB_VERSION = 8;
  const CUSTOM_GROUPS_STORE_NAME = 'customGroups';
  
  await page.evaluate(async ({ groups, dbConfig }) => {
    const { DB_NAME, DB_VERSION, CUSTOM_GROUPS_STORE_NAME } = dbConfig;
    
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    };

    const db = await openDB();
    const now = Date.now();
    
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([CUSTOM_GROUPS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CUSTOM_GROUPS_STORE_NAME);
      
      groups.forEach((group, index) => {
        const groupData = {
          name: group.name,
          createdAt: now - (groups.length - index) * 1000,
          updatedAt: now,
          sortOrder: group.sortOrder ?? index,
        };
        store.add(groupData);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { 
    groups, 
    dbConfig: { DB_NAME, DB_VERSION, CUSTOM_GROUPS_STORE_NAME } 
  });
}

/**
 * 翻訳キーのパターン
 * 例: "tabManager.title", "settings.language.description"
 * ドット区切りで2階層以上の英数字パターンを検出
 */
const TRANSLATION_KEY_PATTERN = /\b[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)+\b/g;

/**
 * 翻訳キーとして除外するパターン（誤検出防止）
 */
const EXCLUDE_PATTERNS = [
  // バージョン番号（例: 1.2.3）
  /^\d+\.\d+\.\d+$/,
  // ファイル名にありがちなパターン（例: index.js, app.tsx）
  /\.(js|ts|jsx|tsx|css|html|json|md|png|jpg|svg)$/i,
  // URLパス
  /^https?:\/\//,
  // npmパッケージ名（ハイフンを含む）
  /-/,
  // ドメイン名パターン（.io, .org, .com, .net などで終わる）
  /\.(io|org|com|net|co|dev|app|jp)$/i,
  // www始まりのドメイン名
  /^www\./i,
];


/**
 * 翻訳キーらしき文字列かどうかを判定
 */
function isLikelyTranslationKey(text: string): boolean {
  // 除外パターンにマッチする場合は翻訳キーではない
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }
  return true;
}

/**
 * ページ内に翻訳キーが表示されていないかチェック
 * 翻訳キーが見つかった場合は配列で返す（空配列なら問題なし）
 */
export async function findTranslationKeysInPage(page: Page): Promise<string[]> {
  // ページ内の全テキストを取得
  const textContent = await page.evaluate(() => {
    // body要素のテキストを取得（script, styleタグは除外）
    const body = document.body;
    if (!body) return '';
    
    // script, style, noscriptタグを一時的に除外
    const excludedElements = body.querySelectorAll('script, style, noscript');
    excludedElements.forEach(el => el.remove());
    
    return body.innerText || '';
  });
  
  // 翻訳キーパターンにマッチするものを抽出
  const matches = textContent.match(TRANSLATION_KEY_PATTERN) || [];
  
  // 誤検出を除外してユニークな値を返す
  const uniqueKeys = [...new Set(matches)].filter(isLikelyTranslationKey);
  
  return uniqueKeys;
}

/**
 * IndexedDBをクリアする
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  const DB_NAME = 'TabBurrowDB';
  await page.evaluate(async (name) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve(); // 既に開いている場合は無視
    });
  }, DB_NAME);
}

/**
 * ダミーのタブデータを作成する
 */
export async function createDummyTabs(page: Page, tabs: { url: string; title: string; domain?: string }[]): Promise<void> {
  for (const tab of tabs) {
    await createTestTabData(page, tab);
  }
}

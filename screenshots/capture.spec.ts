/**
 * Chromeストア用スクリーンショット取得スクリプト
 * 
 * 実行方法: npm run screenshot
 * 
 * 4枚のスクリーンショットを生成:
 * 1. タブ管理画面（グループ表示）
 * 2. タブ管理画面（検索機能）
 * 3. 設定画面（自動収納設定）
 * 4. タブ管理画面（選択モード）
 */
import { test } from '../e2e/fixtures';
import { waitForPageLoad, clearTestData } from '../e2e/helpers';
import { getExtensionUrl } from '../e2e/fixtures';
import { 
  DB_NAME, 
  DB_VERSION, 
  TABS_STORE_NAME, 
  CUSTOM_GROUPS_STORE_NAME, 
  BACKUPS_STORE_NAME 
} from '../src/dbSchema';
import type { Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// スクリーンショット出力ディレクトリ
const SCREENSHOT_DIR = path.join(__dirname, 'output');

// 推奨解像度（Chromeストア: 1280x800 または 640x400）
const VIEWPORT = { width: 1280, height: 800 };

/**
 * リアルなダミータブデータ
 * 実在するサービス風のデータを使用してスクリーンショットの見栄えを良くする
 */
const DUMMY_TABS = [
  // GitHub関連
  { url: 'https://github.com/user/awesome-project', title: 'awesome-project - A collection of useful utilities', domain: 'github.com' },
  { url: 'https://github.com/user/react-components', title: 'react-components - React UI component library', domain: 'github.com' },
  { url: 'https://github.com/user/typescript-starter', title: 'typescript-starter - TypeScript project template', domain: 'github.com' },
  
  // MDN関連
  { url: 'https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise', title: 'Promise - JavaScript | MDN', domain: 'developer.mozilla.org' },
  { url: 'https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API', title: 'IndexedDB API - Web APIs | MDN', domain: 'developer.mozilla.org' },
  
  // Stack Overflow関連
  { url: 'https://stackoverflow.com/questions/12345678/how-to-use-async-await', title: 'How to use async/await in JavaScript - Stack Overflow', domain: 'stackoverflow.com' },
  { url: 'https://stackoverflow.com/questions/23456789/react-hooks-best-practices', title: 'React Hooks best practices - Stack Overflow', domain: 'stackoverflow.com' },
  
  // Qiita関連
  { url: 'https://qiita.com/user/items/abc123', title: 'TypeScriptで型安全なコードを書く方法 - Qiita', domain: 'qiita.com' },
  { url: 'https://qiita.com/user/items/def456', title: 'React 18の新機能まとめ - Qiita', domain: 'qiita.com' },
  
  // Zenn関連
  { url: 'https://zenn.dev/user/articles/chrome-extension-guide', title: 'Chrome拡張機能開発入門ガイド', domain: 'zenn.dev' },
  { url: 'https://zenn.dev/user/articles/playwright-testing', title: 'Playwrightで始めるE2Eテスト', domain: 'zenn.dev' },
  
  // React公式
  { url: 'https://react.dev/learn/thinking-in-react', title: 'Thinking in React – React', domain: 'react.dev' },
  { url: 'https://react.dev/reference/react/useState', title: 'useState – React', domain: 'react.dev' },
  
  // TypeScript公式
  { url: 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html', title: 'Creating Types from Types | TypeScript', domain: 'www.typescriptlang.org' },
  
  // カスタムグループ: 開発メモ
  { url: 'https://notion.so/workspace/dev-notes', title: '開発メモ - Notion', domain: 'notion.so', group: '開発メモ', groupType: 'custom' as const },
  { url: 'https://docs.google.com/document/d/abc123', title: 'プロジェクト設計書 - Google Docs', domain: 'docs.google.com', group: '開発メモ', groupType: 'custom' as const },
];

/**
 * IndexedDBにダミーデータを挿入（e2e/helpers.tsのcreateTestTabDataをベースに）
 */
async function insertDummyTabs(page: Page, tabs: typeof DUMMY_TABS): Promise<void> {
  await page.evaluate(async ({ tabs, dbConfig }) => {
    const { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, BACKUPS_STORE_NAME } = dbConfig;
    
    // DBを開く
    const openDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(TABS_STORE_NAME)) {
            const store = db.createObjectStore(TABS_STORE_NAME, { keyPath: 'id' });
            store.createIndex('domain', 'domain', { unique: false });
            store.createIndex('savedAt', 'savedAt', { unique: false });
            store.createIndex('url', 'url', { unique: false });
            store.createIndex('title', 'title', { unique: false });
            store.createIndex('group', 'group', { unique: false });
            store.createIndex('groupType', 'groupType', { unique: false });
          }
          
          if (!db.objectStoreNames.contains(CUSTOM_GROUPS_STORE_NAME)) {
            const groupStore = db.createObjectStore(CUSTOM_GROUPS_STORE_NAME, { keyPath: 'name' });
            groupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          if (!db.objectStoreNames.contains(BACKUPS_STORE_NAME)) {
            const backupStore = db.createObjectStore(BACKUPS_STORE_NAME, { keyPath: 'id' });
            backupStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };
        
        request.onsuccess = () => resolve(request.result);
      });
    };

    const db = await openDB();
    const now = Date.now();
    
    // カスタムグループを先に登録
    const customGroupNames = [...new Set(tabs.filter(t => t.groupType === 'custom').map(t => t.group))];
    
    if (customGroupNames.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([CUSTOM_GROUPS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CUSTOM_GROUPS_STORE_NAME);
        
        customGroupNames.forEach((name, index) => {
          store.put({
            name,
            createdAt: now - (customGroupNames.length - index) * 86400000 // 日をずらす
          });
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
    
    // タブデータを挿入
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([TABS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TABS_STORE_NAME);
      
      tabs.forEach((tab, index) => {
        const tabData = {
          id: `${now}-${index}-${Math.random().toString(36).slice(2)}`,
          url: tab.url,
          title: tab.title,
          domain: tab.domain,
          group: tab.group || tab.domain,
          groupType: tab.groupType || 'domain',
          favIconUrl: '',
          screenshot: new Blob([]),
          lastAccessed: now - (tabs.length - index) * 3600000, // 1時間ずつずらす
          savedAt: now - (tabs.length - index) * 3600000,
        };
        
        store.add(tabData);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { 
    tabs, 
    dbConfig: { DB_NAME, DB_VERSION, TABS_STORE_NAME, CUSTOM_GROUPS_STORE_NAME, BACKUPS_STORE_NAME } 
  });
}

// テスト設定
test.describe('Chromeストア用スクリーンショット', () => {
  test('1. タブ管理画面（グループ表示）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    // Chromeストア推奨サイズに設定
    await page.setViewportSize(VIEWPORT);
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリアしてダミーデータを挿入
    await clearTestData(page);
    await insertDummyTabs(page, DUMMY_TABS);
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // UIが完全にレンダリングされるまで待機
    await page.waitForTimeout(500);
    
    // スクリーンショットを取得
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-1-grouped.png'),
      fullPage: false,
    });
  });

  test('2. タブ管理画面（検索機能）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // データをセットアップ
    await clearTestData(page);
    await insertDummyTabs(page, DUMMY_TABS);
    await page.reload();
    await waitForPageLoad(page);
    
    // 検索を実行
    const searchInput = page.locator('input').first();
    await searchInput.fill('React');
    await page.waitForTimeout(500); // 検索結果が反映されるまで待機
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-2-search.png'),
      fullPage: false,
    });
  });

  test('3. 設定画面（自動収納設定）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ページが完全にレンダリングされるまで待機
    await page.waitForTimeout(500);
    
    // 設定画面をそのままスクリーンショット（上部がよく見える状態）
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-3-settings.png'),
      fullPage: false,
    });
  });

  test('4. タブ管理画面（選択モード）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize(VIEWPORT);
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // データをセットアップ
    await clearTestData(page);
    await insertDummyTabs(page, DUMMY_TABS);
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(200);
    
    // いくつかのタブを選択
    const checkboxes = page.locator('.tab-checkbox');
    const count = await checkboxes.count();
    if (count >= 3) {
      await checkboxes.nth(0).click();
      await page.waitForTimeout(100);
      await checkboxes.nth(1).click();
      await page.waitForTimeout(100);
      await checkboxes.nth(2).click();
    }
    await page.waitForTimeout(300);
    
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-4-selection.png'),
      fullPage: false,
    });
  });
});

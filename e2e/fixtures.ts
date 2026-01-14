/**
 * Playwright E2Eテスト用フィクスチャ
 * 拡張機能をロードした状態でテストを実行するための設定
 */
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 拡張機能のビルドディレクトリ（Chrome用）
const EXTENSION_PATH = path.join(__dirname, '..', 'dist', 'chrome');

/**
 * 拡張機能テスト用のカスタムフィクスチャ
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  initializeTest: void;
}, {
  // workerスコープのフィクスチャ定義
  workerContext: BrowserContext;
  workerExtensionId: string;
}>({
  // --- Worker Scope Fixtures ---
  
  // 拡張機能をロードしたコンテキストをWorkerプロセスごとに1回作成
  workerContext: [async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  }, { scope: 'worker' }],

  // 拡張機能のIDをWorkerプロセスごとに1回取得
  workerExtensionId: [async ({ workerContext }, use) => {
    // Service Workerが登録されるまで待機
    let serviceWorker = workerContext.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await workerContext.waitForEvent('serviceworker');
    }
    
    // Service WorkerのURLから拡張機能IDを抽出
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  }, { scope: 'worker' }],

  // --- Test Scope Fixtures ---

  // Workerスコープのコンテキストを各テストで利用
  context: async ({ workerContext }, use) => {
    await use(workerContext);
  },

  // WorkerスコープのIDを各テストで利用
  extensionId: async ({ workerExtensionId }, use) => {
    await use(workerExtensionId);
  },

  // 各テストの開始前に状態を初期化
  initializeTest: [async ({ context, extensionId }, use) => {
    // 拡張機能のストレージをリセットするためのページ
    const page = await context.newPage();
    
    try {
      // 拡張機能のコンテキストで実行する必要があるため、options.htmlなどを開く
      // タイムアウトを短くし、waitUntilを最小限にする
      await page.goto(getExtensionUrl(extensionId, 'options.html'), { 
        waitUntil: 'commit', // ヘッダー受信時点で十分
        timeout: 5000 
      });
      
      await page.evaluate(async (dbName) => {
        // IndexedDBの削除 (TabBurrowDB)
        // Promiseが解決されない場合に備えてタイムアウトを設ける
        const deleteDB = () => new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
          setTimeout(resolve, 1000);
        });
        
        await deleteDB();
        
        // chrome.storage.local のクリア
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await new Promise<void>((resolve) => {
            chrome.storage.local.clear(() => resolve());
          });
        }
      }, 'TabBurrowDB');
    } catch (e) {
      // 初期化失敗はログに留め、テスト実行を優先する
      console.warn('Test state initialization warning:', e);
    } finally {
      await page.close();
    }

    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';

/**
 * 拡張機能のページURLを取得
 */
export function getExtensionUrl(extensionId: string, page: string): string {
  return `chrome-extension://${extensionId}/${page}`;
}

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
    
    // テスト終了後に開いたページをクリーンアップする
    // 全てのページを閉じるとブラウザ自体が終了してしまうため、最後の1枚は残す（about:blank に遷移させる）
    const pages = workerContext.pages();
    for (let i = 0; i < pages.length; i++) {
      try {
        if (i > 0) {
          await pages[i].close();
        } else {
          // 最初の1枚は about:blank に戻すことで、拡張機能のページなどが開いたままになるのを防ぐ
          await pages[i].goto('about:blank');
        }
      } catch {
        // すでに閉じられている場合などのエラーは無視
      }
    }
  },

  // WorkerスコープのIDを各テストで利用
  extensionId: async ({ workerExtensionId }, use) => {
    await use(workerExtensionId);
  },

  // 各テストの開始前に状態を初期化
  initializeTest: [async ({ workerContext, workerExtensionId }, use) => {
    // 拡張機能のコンテキストで実行するためのページを作成
    const page = await workerContext.newPage();
    
    try {
      // 拡張機能のページにアクセス
      await page.goto(getExtensionUrl(workerExtensionId, 'options.html'), { 
        waitUntil: 'commit',
        timeout: 5000 
      });
      
      await page.evaluate(async () => {
        // 1. chrome.storage.local のクリア
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await new Promise<void>((resolve) => {
            chrome.storage.local.clear(() => resolve());
          });
        }

        // 2. IndexedDB (TabBurrowDB) の各ストアをクリア
        // deleteDatabaseはロックの影響を受けやすいため、各ストアを明示的にクリアする
        const DB_NAME = 'TabBurrowDB';
        const STORES = ['tabs', 'customGroups', 'trash', 'backups'];
        
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(DB_NAME);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        try {
          const existingStores = Array.from(db.objectStoreNames);
          const storesToClear = STORES.filter(s => existingStores.includes(s));
          
          if (storesToClear.length > 0) {
            const transaction = db.transaction(storesToClear, 'readwrite');
            for (const storeName of storesToClear) {
              transaction.objectStore(storeName).clear();
            }
            await new Promise<void>((resolve, reject) => {
              transaction.oncomplete = () => resolve();
              transaction.onerror = () => reject(transaction.error);
            });
          }
        } finally {
          db.close();
        }
      });
    } catch (e) {
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

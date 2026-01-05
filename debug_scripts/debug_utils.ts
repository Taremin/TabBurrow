import { Page } from '@playwright/test';

// src/dbSchema.ts からの型定義のサブセット (テストデータ投入用)
interface SavedTab {
  id: string;
  url: string;
  title: string;
  displayName?: string;
  domain: string;
  group: string;
  groupType: 'domain' | 'custom';
  favIconUrl: string;
  screenshot?: Blob | any; // IDBにはBlobとして入るがテストデータでは調整が必要かも
  lastAccessed: number;
  savedAt: number;
}

interface SeedOptions {
  dbName?: string;
  dbVersion?: number;
  storeName?: string;
}

/**
 * IndexedDBにタブデータを投入する
 */
export async function seedTabsData(page: Page, tabs: Partial<SavedTab>[], options: SeedOptions = {}) {
  const {
    dbName = 'TabBurrowDB',
    dbVersion = 5,
    storeName = 'tabs'
  } = options;

  await page.evaluate(async ({ tabs, dbName, dbVersion, storeName }) => {
    const request = indexedDB.open(dbName, dbVersion);
    
    await new Promise((resolve, reject) => {
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        // まず既存データをクリア
        store.clear();

        // データの投入
        for (const tab of tabs) {
            // デフォルト値の補完
            const TabData = {
                id: tab.id || Date.now().toString() + Math.random().toString(36).slice(2),
                url: tab.url || 'https://example.com',
                title: tab.title || 'Example Title',
                domain: tab.domain || 'example.com',
                group: tab.group || 'example.com',
                groupType: tab.groupType || 'domain',
                favIconUrl: tab.favIconUrl || '',
                savedAt: tab.savedAt || Date.now(),
                lastAccessed: tab.lastAccessed || Date.now(),
                ...tab
            };
            store.add(TabData);
        }

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
  }, { tabs, dbName, dbVersion, storeName });
}

/**
 * ビューモードを切り替える
 */
export async function toggleViewMode(page: Page, mode: 'compact' | 'normal') {
  const toggle = page.locator('[data-testid="view-mode-toggle"]');
  await toggle.click();

  if (mode === 'compact') {
    const compactBtn = page.locator('.view-mode-menu-item').filter({ hasText: /コンパクト|Compact/ });
    await compactBtn.click();
  } else {
    const normalBtn = page.locator('.view-mode-menu-item').filter({ hasText: /通常表示|Normal/ });
    await normalBtn.click();
  }
  
  // トランジション待ち
  await page.waitForTimeout(500);
}

/**
 * スクリーンショットを撮る
 * 保存先を debug_scripts/screenshots/ に固定する
 */
export async function takeScreenshot(page: Page, name: string) {
  // 拡張子がない場合は付ける
  const filename = name.endsWith('.png') ? name : `${name}.png`;
  // パスを構築 (Playwrightはプロジェクトルートからの相対パスで保存するが、
  // ここでは debug_scripts/screenshots/ に保存したい)
  // configのtestDirがdebug_scriptsになっている場合、そこからの相対になる可能性があるが、
  // path: オプションは常にCWD(プロジェクトルート)からの相対パスとして解釈されることが多い。
  // 念のため debug_scripts/screenshots/ を指定する。
  await page.screenshot({ path: `debug_scripts/screenshots/${filename}` });
}

/**
 * ページ内のコンソールログとエラーをターミナルに出力する
 */
export function setupDebugConsole(page: Page) {
  page.on('console', msg => console.log(`PAGE LOG: [${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.error(`PAGE ERROR: ${err.message}`));
}

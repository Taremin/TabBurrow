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
}>({
  // 拡張機能をロードしたコンテキストを作成
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },
  
  // 拡張機能のIDを取得
  extensionId: async ({ context }, use) => {
    // Service Workerが登録されるまで待機
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    
    // Service WorkerのURLから拡張機能IDを抽出
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';

/**
 * 拡張機能のページURLを取得
 */
export function getExtensionUrl(extensionId: string, page: string): string {
  return `chrome-extension://${extensionId}/${page}`;
}

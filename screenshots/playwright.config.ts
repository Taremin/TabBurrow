/**
 * スクリーンショット取得用Playwright設定
 * 
 * 既存のE2E設定をベースに、screenshotsディレクトリを対象とする
 */
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 拡張機能のビルドディレクトリ
const CHROME_EXTENSION_PATH = path.join(__dirname, '..', 'dist', 'chrome');

export default defineConfig({
  // スクリーンショット専用ディレクトリ
  testDir: '.',
  
  // テストIDのパターン
  testMatch: '**/*.spec.ts',
  
  // 各テストのタイムアウト
  timeout: 60000, // スクリーンショット取得には少し長めに
  
  // テストの実行設定
  fullyParallel: false,
  retries: 0,
  workers: 1,
  
  // レポーターはシンプルに
  reporter: 'list',
  
  // 共通設定
  use: {
    screenshot: 'off', // 自動スクリーンショットは無効
    trace: 'off',
    video: 'off',
  },
  
  // プロジェクト設定
  projects: [
    {
      name: 'chromium',
      use: {
        headless: false,
        launchOptions: {
          args: [
            `--disable-extensions-except=${CHROME_EXTENSION_PATH}`,
            `--load-extension=${CHROME_EXTENSION_PATH}`,
          ],
        },
      },
    },
  ],
});

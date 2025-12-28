/**
 * Playwright Debug Configuration
 * デバッグスクリプト専用の設定
 */
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 拡張機能のビルドディレクトリ
const CHROME_EXTENSION_PATH = path.join(__dirname, 'dist', 'chrome');

export default defineConfig({
  // テストディレクトリ (デバッグスクリプト用)
  testDir: './debug_scripts',
  
  // テストIDのパターン
  testMatch: '**/*.spec.ts',
  
  // 各テストのタイムアウト
  timeout: 30000,
  
  // テストの実行設定
  fullyParallel: false, // 拡張機能テストは並列実行しない
  retries: 0,
  workers: 1,
  
  // レポーター
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // 共通設定
  use: {
    // スクリーンショット設定
    screenshot: 'on', // デバッグ時は常に撮りたい
    // トレース設定
    trace: 'on-first-retry',
    // ビデオ録画
    video: 'on-first-retry',
  },
  
  // プロジェクト設定
  // 注意: Firefox拡張機能テストはPlaywrightで未サポート
  // https://github.com/microsoft/playwright/issues/7297
  projects: [
    {
      name: 'chromium',
      use: {
        // デバッグ時はヘッドフルモード
        headless: false,
        // 拡張機能をロードするためのブラウザ引数
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

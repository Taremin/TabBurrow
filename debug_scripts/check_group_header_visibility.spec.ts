import { test, chromium, type BrowserContext, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedTabsData, takeScreenshot, setupDebugConsole } from './debug_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '..', 'dist', 'chrome');

test('custom group header visibility check', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const page = await context.newPage();
  setupDebugConsole(page);

  // 拡張機能IDの取得
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const extensionId = serviceWorker.url().split('/')[2];

  // テストデータの投入
  const testTabs = [
    {
      id: 'tab-1',
      url: 'https://google.com',
      title: 'Google',
      group: 'Google',
      groupType: 'domain' as const,
    },
    {
      id: 'tab-2',
      url: 'https://github.com',
      title: 'GitHub',
      group: 'Development',
      groupType: 'custom' as const,
      customGroups: ['Development'],
    },
    {
      id: 'tab-3',
      url: 'https://stackoverflow.com',
      title: 'Stack Overflow',
      group: 'Development',
      groupType: 'custom' as const,
      customGroups: ['Development'],
    }
  ];

  // タブ管理ページに移動 (IndexedDBへのアクセス許可のため)
  await page.goto(`chrome-extension://${extensionId}/tabs.html`);
  await page.waitForLoadState('domcontentloaded');

  // テストデータの投入
  await seedTabsData(page, testTabs);

  // 再読み込みまたは遷移
  await page.reload();
  await page.waitForLoadState('networkidle');

  // グループが表示されるのを待つ
  await expect(page.locator('.group-header')).toHaveCount(2);

  // スクリーンショット撮影
  await takeScreenshot(page, 'group_header_visibility_light');

  // ダークモードでも確認（もし可能なら）
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(500);
  await takeScreenshot(page, 'group_header_visibility_dark');

  await context.close();
});

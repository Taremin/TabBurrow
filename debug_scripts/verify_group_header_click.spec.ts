import { test, chromium, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDebugConsole, takeScreenshot, seedTabsData } from './debug_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '..', 'dist', 'chrome');

test('group header click area expansion check', async () => {
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
  
  await page.goto(`chrome-extension://${extensionId}/tabs.html`);
  await page.waitForLoadState('domcontentloaded');

  // テストデータの投入
  const testTabs = [
    {
      id: 'tab-1',
      url: 'https://example.com/page1',
      title: 'Example Page 1',
      group: 'example.com',
      groupType: 'domain' as const,
    },
    {
      id: 'tab-2',
      url: 'https://example.com/page2',
      title: 'Example Page 2',
      group: 'example.com',
      groupType: 'domain' as const,
    }
  ];
  await seedTabsData(page, testTabs);

  // seedTabsData の中で別ページ（example.comなど）に飛ばされている可能性があるため、
  // 確実にタブ管理ページに戻る
  await page.goto(`chrome-extension://${extensionId}/tabs.html`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.group-header');

  // グループヘッダーを取得
  const header = page.locator('.group-header').first();
  const groupName = await header.locator('.group-domain').innerText();
  console.log(`Checking group: ${groupName}`);

  // 1. ヘッダーの空白部分（の代わりに、矢印アイコン）をクリックして折りたたみが切り替わるか確認
  const isInitiallyCollapsed = await header.evaluate(el => el.classList.contains('collapsed'));
  const initialClasses = await header.evaluate(el => el.className);
  console.log(`Initial status: collapsed=${isInitiallyCollapsed}, classes="${initialClasses}"`);

  // 矢印アイコンをクリック
  const icon = header.locator('.group-collapse-icon');
  console.log(`Icon present: ${await icon.count() > 0}`);
  await icon.click();
  
  // 少し待ってからクラスを再確認
  await page.waitForTimeout(1000);
  
  const classesAfterClick = await header.evaluate(el => el.className);
  const isCollapsedAfterClick = await header.evaluate(el => el.classList.contains('collapsed'));
  console.log(`After icon click: collapsed=${isCollapsedAfterClick}, classes="${classesAfterClick}"`);
  
  expect(isCollapsedAfterClick).not.toBe(isInitiallyCollapsed);

  // 2. 削除ボタンをクリックして、折りたたみが切り替わらないことを確認
  const deleteButton = header.locator('.group-delete');
  const isCollapsedBeforeDelete = isCollapsedAfterClick;
  
  console.log(`Clicking delete button...`);
  await deleteButton.click();
  await page.waitForTimeout(1000);
  
  const isCollapsedAfterDelete = await header.evaluate(el => el.classList.contains('collapsed'));
  console.log(`After delete click: collapsed=${isCollapsedAfterDelete}`);
  expect(isCollapsedAfterDelete).toBe(isCollapsedBeforeDelete);

  // 3. 名前をクリックして切り替わるか確認
  const domainSpan = header.locator('.group-domain');
  console.log(`Clicking domain span...`);
  
  // 削除ボタンクリックで ConfirmDialog が出ている可能性があるため、エスケープキーを押してダイアログを閉じる
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await domainSpan.click();
  await page.waitForTimeout(1000);
  
  const isCollapsedAfterTitleClick = await header.evaluate(el => el.classList.contains('collapsed'));
  console.log(`After title click: collapsed=${isCollapsedAfterTitleClick}`);
  expect(isCollapsedAfterTitleClick).not.toBe(isCollapsedAfterDelete);

  await takeScreenshot(page, 'group_header_click_test_final');
  await context.close();
});

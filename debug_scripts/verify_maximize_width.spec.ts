import { test, chromium, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { takeScreenshot, setupDebugConsole } from './debug_utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '..', 'dist', 'chrome');

test.setTimeout(180000);

test('Maximize Width Mode toggle verify', async () => {
  console.log('Starting test: Maximize Width Mode verify');
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
  console.log('Extension ID:', extensionId);

  // 1. 設定画面を開く
  console.log('Opening settings page...');
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('load');

  // ラベルとカスタムチェックボックスが表示されるのを待つ
  console.log('Waiting for the checkbox ui...');
  const checkboxLabel = page.locator('label', { hasText: /横幅を最大まで使用する|Use maximum width/ });
  await expect(checkboxLabel).toBeVisible({ timeout: 15000 });
  await checkboxLabel.scrollIntoViewIfNeeded();

  const checkbox = page.locator('[data-testid="maximize-width-checkbox"]');
  const customCheckbox = checkboxLabel.locator('.checkbox-custom');
  
  // ONにする
  console.log('Checking current state...');
  const isChecked = await checkbox.isChecked();
  if (!isChecked) {
    console.log('Clicking visible checkbox element...');
    await customCheckbox.click();
    // 反映待ち
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  }
  
  console.log('Clicking save button...');
  const saveBtn = page.locator('button[type="submit"]');
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();
  
  console.log('Waiting for save confirmation...');
  await page.waitForSelector('.save-status:has-text("保存しました"), .save-status:has-text("saved")', { timeout: 15000 });

  // 2. タブ管理画面を開く
  console.log('Opening tab manager...');
  const tabManagerPage = await context.newPage();
  await tabManagerPage.goto(`chrome-extension://${extensionId}/tabs.html`);
  await tabManagerPage.waitForLoadState('load');

  // 3. 検証
  console.log('Verifying maximize-width class...');
  const container = tabManagerPage.locator('.container');
  await expect(container).toHaveClass(/maximize-width/, { timeout: 15000 });
  
  const maxWidth = await container.evaluate((el) => window.getComputedStyle(el).maxWidth);
  console.log(`Max width (ON): ${maxWidth}`);
  expect(maxWidth).toBe('none');

  await takeScreenshot(tabManagerPage, 'tab_manager_maximize_width_on');

  // 4. OFFに戻して検証
  console.log('Toggling off and saving...');
  await page.bringToFront();
  const isCheckedNow = await checkbox.isChecked();
  if (isCheckedNow) {
    await customCheckbox.click();
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });
  }
  await saveBtn.click();
  await page.waitForSelector('.save-status:has-text("保存しました"), .save-status:has-text("saved")', { timeout: 15000 });

  console.log('Checking result in tab manager...');
  await tabManagerPage.bringToFront();
  
  await expect(container).not.toHaveClass(/maximize-width/, { timeout: 15000 });
  
  const maxWidthOff = await container.evaluate((el) => window.getComputedStyle(el).maxWidth);
  console.log(`Max width (OFF): ${maxWidthOff}`);
  expect(maxWidthOff).toBe('1400px');
  
  await takeScreenshot(tabManagerPage, 'tab_manager_maximize_width_off');

  await context.close();
  console.log('Test completed successfully');
});

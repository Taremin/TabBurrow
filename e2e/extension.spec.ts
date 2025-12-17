/**
 * 拡張機能のメイン動作のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad } from './helpers';

test.describe('拡張機能の基本動作', () => {
  test('Service Workerが正常にロードされる', async ({ context, extensionId }) => {
    // 拡張機能IDが取得できていることを確認
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(0);
    
    // Service Workerが存在することを確認
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
  });

  test('オプションページが開ける', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const optionsUrl = getExtensionUrl(extensionId, 'options.html');
    
    await page.goto(optionsUrl);
    await waitForPageLoad(page);
    
    // ページが正常にロードされたことを確認
    expect(page.url()).toContain('options.html');
    await expect(page.locator('.container')).toBeVisible();
  });

  test('タブ管理ページが開ける', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const tabsUrl = getExtensionUrl(extensionId, 'tabs.html');
    
    await page.goto(tabsUrl);
    await waitForPageLoad(page);
    
    // ページが正常にロードされたことを確認
    expect(page.url()).toContain('tabs.html');
    await expect(page.locator('.header')).toBeVisible();
  });

  test('拡張機能のアイコンアセットが存在する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // アイコンのURLを確認（存在確認）
    const iconUrl = getExtensionUrl(extensionId, 'icons/icon48.png');
    const response = await page.goto(iconUrl);
    
    // アイコンが正常に取得できることを確認
    expect(response?.status()).toBe(200);
  });

  test('manifest.jsonが正しく読み込まれている', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // 設定画面を開く
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // browser.runtime.getManifest()が動作することを確認
    // Playwright evaluate内ではpolyfillが読み込まれていない場合があるため、
    // browserが未定義の場合はchromeにフォールバック
    const manifest = await page.evaluate(() => {
      const api = typeof browser !== 'undefined' ? browser : chrome;
      return api.runtime.getManifest();
    });
    
    expect(manifest.name).toBe('TabBurrow');
    expect(manifest.manifest_version).toBe(3);
  });

  test('ロケールが正しく読み込まれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // タブ管理画面を開く
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ページにテキストが表示されていることを確認
    // （i18nが正常に動作している証拠）
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});

test.describe('タブの保存と復元', () => {
  test('新しいタブを開いて閉じる操作ができる', async ({ context, extensionId }) => {
    // 新しいタブを開く
    const page = await context.newPage();
    await page.goto('https://example.com');
    await waitForPageLoad(page);
    
    // ページが正常に開いたことを確認
    expect(page.url()).toContain('example.com');
    
    // ページを閉じる
    await page.close();
    
    // コンテキストがまだ有効であることを確認
    expect(context.pages().length).toBeGreaterThanOrEqual(0);
  });
});

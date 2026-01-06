/**
 * ドメイングループ ピン機能のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors, waitForPageLoad, createTestTabData, clearTestData } from './helpers';

test.describe('ドメイングループのピン機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // データのクリアと初期データの作成
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);

    // テストデータを作成（複数ドメイン）
    await createTestTabData(page, { url: 'https://example.com/1', title: 'Example 1' });
    await createTestTabData(page, { url: 'https://test.org/1', title: 'Test 1' });
    await createTestTabData(page, { url: 'https://demo.net/1', title: 'Demo 1' });
    
    await page.reload();
    await waitForPageLoad(page);
    await page.close();
  });

  test('ドメイングループヘッダーにピンボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // ドメイングループヘッダーを見つける
    const domainGroupHeader = page.locator(`${tabsPageSelectors.groupHeader}.domain-group`).first();
    await domainGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await domainGroupHeader.hover();

    // ピンボタンが存在することを確認
    const pinButton = domainGroupHeader.locator(tabsPageSelectors.pinButton);
    await expect(pinButton).toBeVisible();
  });

  test('ピンボタンをクリックするとグループがピン留めされる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // example.comのグループをピン留め
    const exampleGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await exampleGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await exampleGroupHeader.hover();

    const pinButton = exampleGroupHeader.locator('.group-pin');
    await pinButton.click();

    // ピン留めアイコンが表示されることを確認
    await expect(exampleGroupHeader.locator('.group-pin-icon')).toBeVisible();
    
    // ピンボタンにpinnedクラスがあることを確認
    await expect(exampleGroupHeader.locator(`${tabsPageSelectors.pinButton}.pinned`)).toBeVisible();
  });

  test('ピン留めグループはリロード後も維持される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // example.comのグループをピン留め
    const exampleGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await exampleGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await exampleGroupHeader.hover();
    await exampleGroupHeader.locator(tabsPageSelectors.pinButton).click();
    await expect(exampleGroupHeader.locator('.group-pin-icon')).toBeVisible();

    // リロード
    await page.reload();
    await waitForPageLoad(page);

    // ピン状態が維持されていることを確認
    const reloadedHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await expect(reloadedHeader.locator('.group-pin-icon')).toBeVisible();
  });

  test('ピン留め解除ができる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // ピン留め
    const exampleGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await exampleGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await exampleGroupHeader.hover();
    await exampleGroupHeader.locator(tabsPageSelectors.pinButton).click();
    await expect(exampleGroupHeader.locator('.group-pin-icon')).toBeVisible();

    // ピン留め解除
    await exampleGroupHeader.locator(tabsPageSelectors.pinButton).click();
    
    // ピンアイコンが消えることを確認
    await expect(exampleGroupHeader.locator('.group-pin-icon')).not.toBeVisible();
  });

  test('カスタムグループにはピンボタンが表示されない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // カスタムグループ作成と同時にタブを追加
    await createTestTabData(page, { 
      url: 'https://custom-test.com/1', 
      title: 'Custom Group Test Tab',
      group: 'PinTestCustomGroup',
      groupType: 'custom'
    });

    await page.reload();
    await waitForPageLoad(page);

    // カスタムグループヘッダーを確認
    const customGroupHeader = page.locator(`${tabsPageSelectors.groupHeader}.custom-group`).first();
    await customGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await customGroupHeader.hover();

    // ピンボタンがないことを確認
    await expect(customGroupHeader.locator(tabsPageSelectors.pinButton)).not.toBeVisible();
  });
});

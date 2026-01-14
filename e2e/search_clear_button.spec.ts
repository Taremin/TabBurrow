/**
 * 検索入力欄のクリアボタンに関するE2Eテスト
 */
import { test, expect } from './fixtures';
import { createTestTabData, tabsPageSelectors } from './helpers';

test.describe('検索クリアボタン', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    // タブ管理画面を開く
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await page.waitForLoadState('networkidle');

    // テストデータを投入
    await createTestTabData(page, {
      title: 'Example Page 1', 
      url: 'https://example.com/page1'
    });
    await createTestTabData(page, {
      title: 'Example Page 2', 
      url: 'https://example.com/page2'
    });
    await createTestTabData(page, {
      title: 'Google', 
      url: 'https://google.com'
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
  });

  test('検索入力後にクリアボタンが表示される', async ({ page }) => {
    const searchInput = page.locator(tabsPageSelectors.searchInput);
    const clearButton = page.locator('.clear-search');

    // 入力前はクリアボタンが非表示
    await expect(clearButton).not.toBeVisible();

    // 検索入力
    await searchInput.fill('Example');
    await page.waitForTimeout(100);

    // クリアボタンが表示される
    await expect(clearButton).toBeVisible();
  });

  test('クリアボタンクリックで検索がクリアされる', async ({ page }) => {
    const searchInput = page.locator(tabsPageSelectors.searchInput);
    const clearButton = page.locator('.clear-search');

    // 検索入力
    await searchInput.fill('Example');
    await page.waitForTimeout(500); // debounce待ち

    // 検索が適用されていることを確認（Googleが非表示）
    // tabTitleセレクターを使用して検証
    const googleTab = page.locator(tabsPageSelectors.tabCard).filter({ hasText: 'Google' });
    await expect(googleTab).not.toBeVisible();

    // クリアボタンをクリック
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    
    // 入力が空になるのを待つ
    await expect(searchInput).toHaveValue('');
    
    // クリアボタンが非表示になるのを待つ
    await expect(clearButton).not.toBeVisible();

    // 検索がクリアされ、全てのタブが表示される
    await expect(googleTab).toBeVisible();
  });

  test('クリアボタンが検索オプションボタンと重ならない', async ({ page }) => {
    const searchInput = page.locator(tabsPageSelectors.searchInput);
    const clearButton = page.locator('.clear-search');
    const searchOptions = page.locator('.search-options');

    // 検索入力してクリアボタンを表示
    await searchInput.fill('test');
    await page.waitForTimeout(100);

    // 両方の要素の位置を取得
    const clearButtonBox = await clearButton.boundingBox();
    const searchOptionsBox = await searchOptions.boundingBox();

    // 位置が取得できることを確認
    expect(clearButtonBox).not.toBeNull();
    expect(searchOptionsBox).not.toBeNull();

    if (clearButtonBox && searchOptionsBox) {
      // クリアボタンの右端が検索オプションの左端より左にあること（重ならない）
      expect(clearButtonBox.x + clearButtonBox.width).toBeLessThanOrEqual(searchOptionsBox.x);
    }
  });

  test('クリアボタンにaria-labelが設定されている', async ({ page }) => {
    const searchInput = page.locator(tabsPageSelectors.searchInput);
    const clearButton = page.locator('.clear-search');

    // 検索入力
    await searchInput.fill('test');
    await page.waitForTimeout(100);

    // aria-labelが設定されていることを確認
    await expect(clearButton).toHaveAttribute('aria-label');
    const ariaLabel = await clearButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});

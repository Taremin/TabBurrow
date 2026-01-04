import { test, expect, getExtensionUrl } from './fixtures';
import { clearTestData } from './helpers';

test.describe('一時的なソート順変更機能 (簡易検証)', () => {
  test('ソート順UIが表示され操作できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const url = getExtensionUrl(extensionId, 'tabs.html');
    
    // DBクリア (既存の安定したヘルパーを使用)
    await page.goto(url);
    await clearTestData(page);
    await page.reload();

    // 表示モードメニューを開く
    const toggle = page.locator('[data-testid="view-mode-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    
    // メニューが表示されるまで待機
    const menu = page.locator('.view-mode-menu');
    await expect(menu).toBeVisible();

    // セレクトボックスが表示されていることを確認
    const groupSortSelect = page.locator('.view-mode-menu-section:has-text("グループ順"), .view-mode-menu-section:has-text("Group Order")').locator('select');
    await expect(groupSortSelect).toBeVisible();

    const itemSortSelect = page.locator('.view-mode-menu-section:has-text("タブ順"), .view-mode-menu-section:has-text("Tab Order")').locator('select');
    await expect(itemSortSelect).toBeVisible();

    // 選択肢を選択してみる
    await groupSortSelect.selectOption('domain-asc');
    await itemSortSelect.selectOption('title-asc');

    // 選択状態が維持されていることを確認
    expect(await groupSortSelect.inputValue()).toBe('domain-asc');
    expect(await itemSortSelect.inputValue()).toBe('title-asc');

    // メニューを閉じて開き直しても状態が維持されているか確認
    await page.mouse.click(0, 0); // 外側をクリックして閉じる
    await expect(menu).not.toBeVisible();
    
    await toggle.click();
    await expect(menu).toBeVisible();
    expect(await groupSortSelect.inputValue()).toBe('domain-asc');
    expect(await itemSortSelect.inputValue()).toBe('title-asc');
  });
});

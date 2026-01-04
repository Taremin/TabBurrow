import { test, expect, getExtensionUrl } from './fixtures';
import { clearTestData, createTestTabData } from './helpers';

test.describe('一時的なソート順変更機能', () => {
  test('タブ管理画面でソート順を一時的に変更できる (最終検証)', async ({ context, extensionId }) => {
    const page = await context.newPage();
    const url = getExtensionUrl(extensionId, 'tabs.html');
    
    // 1. 準備
    await page.goto(url);
    await clearTestData(page);
    await page.reload();

    await createTestTabData(page, { url: 'https://z.com/1', title: 'Z Page 1' });
    await createTestTabData(page, { url: 'https://z.com/2', title: 'Z Page 2' });
    await createTestTabData(page, { url: 'https://a.com/1', title: 'A Page 1' });
    
    await page.reload();
    await page.waitForSelector('.tab-card');

    // 2. 表示モードメニューを開き「グループ順」を変更
    await page.click('[data-testid="view-mode-toggle"]');
    await page.waitForSelector('.view-mode-menu');

    const groupSortSelect = page.locator('.view-mode-menu-section:has-text("グループ順"), .view-mode-menu-section:has-text("Group Order")').locator('select');
    await groupSortSelect.selectOption('domain-asc');
    await page.waitForTimeout(1000);

    // 3. 「タブ順」を変更
    const itemSortSelect = page.locator('.view-mode-menu-section:has-text("タブ順"), .view-mode-menu-section:has-text("Tab Order")').locator('select');
    await itemSortSelect.selectOption('title-desc');
    await page.waitForTimeout(1000);

    // 4. 検証: 全体でタブカードの順番を確認 (a.com, z.com/2, z.com/1 の順になるはず)
    const titles = await page.locator('.tab-card .tab-title span').allTextContents();
    console.log('All titles after sort:', titles);
    
    // a.com のドメイングループが最初、z.com が次 (domain-asc)
    // z.com 内では Z Page 2 が先 (title-desc)
    expect(titles[0]).toBe('A Page 1');
    expect(titles[1]).toBe('Z Page 2');
    expect(titles[2]).toBe('Z Page 1');

    // 5. 元に戻るか確認
    await page.reload();
    await page.waitForSelector('.tab-card');
    const firstGroup = await page.locator('.group-domain').first().textContent();
    expect(firstGroup).toBe('z.com'); // count-desc
  });
});

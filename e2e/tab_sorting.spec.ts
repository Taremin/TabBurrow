import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors as selectors, createTestTabData, clearTestData, waitForPageLoad } from './helpers';

test.describe('Tab Sorting', () => {
  test('Sort tabs by sort key in a custom group', async ({ page, extensionId }) => {
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);

    // Create a custom group
    const groupName = 'SortTestGroup';
    // Create tabs in the SAME custom group
    await createTestTabData(page, { url: 'https://b.com', title: 'Beta Tab', domain: 'b.com', customGroups: [groupName] });
    await createTestTabData(page, { url: 'https://a.com', title: 'Alpha Tab', domain: 'a.com', customGroups: [groupName] });
    
    await page.reload();
    await waitForPageLoad(page);
    await page.waitForSelector(selectors.tabCard);

    // 2. Set sort keys
    const tabs = page.locator(selectors.tabCard);
    
    // Hover to reveal buttons
    await tabs.nth(0).hover();
    await tabs.nth(0).locator('[data-testid="tab-edit-button"]').click();
    await page.fill('[data-testid="edit-tab-sort-key"]', 'Z');
    await page.click('[data-testid="confirm-edit-tab"]');

    await tabs.nth(1).hover();
    await tabs.nth(1).locator('[data-testid="tab-edit-button"]').click();
    await page.fill('[data-testid="edit-tab-sort-key"]', 'A');
    await page.click('[data-testid="confirm-edit-tab"]');

    // 3. Verify order
    // Playwright's expect.toHaveText has built-in retry and will wait until the condition is met.
    // This resolves race conditions between DB update and React re-render.
    await expect(tabs.nth(0).locator(selectors.tabTitle)).toHaveText('Alpha Tab');
    await expect(tabs.nth(1).locator(selectors.tabTitle)).toHaveText('Beta Tab');
  });

  test('Group specific sort order in pinned group - all options', async ({ page, extensionId }) => {
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    
    const domain = 'example.com';
    // Create tabs with specific properties to test all sort orders
    // Use large time gaps to ensure deterministic sort by savedAt
    const now = Date.now();
    await createTestTabData(page, { url: 'https://example.com/1', title: 'C Tab', domain, savedAt: now - 3000, lastAccessed: now - 1000 });
    await createTestTabData(page, { url: 'https://example.com/2', title: 'A Tab', domain, savedAt: now - 1000, lastAccessed: now - 3000 });
    await createTestTabData(page, { url: 'https://example.com/3', title: 'B Tab', domain, savedAt: now - 2000, lastAccessed: now - 2000 });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // Pin the group first to show sort button
    const firstGroup = page.locator(selectors.groupHeader).first();
    await firstGroup.hover();
    await firstGroup.locator(selectors.pinButton).click();
    await expect(firstGroup.locator(selectors.pinButton)).toHaveClass(/pinned/);
    
    const sortButton = firstGroup.locator('[data-testid="group-item-sort-button"]');

    // Helper to change sort and verify
    const testSort = async (optionId: string, expectedFirstTitle: string) => {
      await sortButton.click();
      await page.locator(`.group-sort-menu [data-testid="group-sort-option-${optionId}"]`).click();
      // Wait for immediate re-render (no reload needed)
      await expect(page.locator(selectors.tabCard).nth(0).locator(selectors.tabTitle)).toContainText(expectedFirstTitle);
    };

    // 1. Title Asc: A, B, C
    await testSort('title-asc', 'A Tab');
    // 2. Title Desc: C, B, A
    await testSort('title-desc', 'C Tab');
    // 3. Saved Desc (Newest first): 2 (1s), 3 (2s), 1 (3s) -> 2: A Tab
    await testSort('saved-desc', 'A Tab');
    // 4. Saved Asc (Oldest first): 1 (3s), 3 (2s), 2 (1s) -> 1: C Tab
    await testSort('saved-asc', 'C Tab');
    // 5. Accessed Desc (Newest first): 1 (1s), 3 (2s), 2 (3s) -> 1: C Tab
    await testSort('accessed-desc', 'C Tab');
    // 6. Accessed Asc (Oldest first): 2 (3s), 3 (2s), 1 (1s) -> 2: A Tab
    await testSort('accessed-asc', 'A Tab');
  });

  test('Group Header Buttons Order', async ({ page, extensionId }) => {
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);

    const groupName = 'OrderTestGroup';
    await createTestTabData(page, { url: 'https://example.com', title: 'Tab', domain: 'example.com', customGroups: [groupName] });
    await page.reload();
    await waitForPageLoad(page);

    const groupHeader = page.locator(selectors.groupHeader).first();
    const actions = groupHeader.locator('.group-actions');

    // 順序を確認
    const rawOrder = await actions.locator('button, .group-sort-wrapper, .color-picker-trigger').evaluateAll(elements => {
      return elements.map(el => {
        if (el.classList.contains('group-sort-wrapper') || el.querySelector('[data-testid="group-item-sort-button"]')) return 'sort';
        if (el.getAttribute('data-testid') === 'group-filter-toggle') return 'filter';
        if (el.getAttribute('data-testid') === 'group-rename-button') return 'rename';
        if (el.classList.contains('color-picker-trigger')) return 'palette';
        return 'other';
      }).filter(type => type !== 'other');
    });

    // 重複を除去
    const order = rawOrder.filter((item, index) => rawOrder.indexOf(item) === index);

    // 期待される順序: sort, palette, filter, rename
    const relevantOrder = order.filter(t => ['sort', 'palette', 'filter', 'rename'].includes(t));
    expect(relevantOrder).toEqual(['sort', 'palette', 'filter', 'rename']);
  });
});

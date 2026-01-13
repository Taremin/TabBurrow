import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors as selectors, createTestTabData, clearTestData, waitForPageLoad } from './helpers';

test.describe('Group Header Layout', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
  });

  test('Custom Group buttons order should be [Sort][Palette][Filter][Rename]', async ({ page }) => {
    const groupName = 'LayoutTestGroup';
    await createTestTabData(page, { url: 'https://example.com', title: 'Tab', domain: 'example.com', customGroups: [groupName] });
    await page.reload();
    await waitForPageLoad(page);

    const groupHeader = page.locator(selectors.groupHeader).first();
    const actions = groupHeader.locator('.group-actions');

    // ボタンのインデックスを取得して順序を確認
    const sortBtn = actions.locator('[data-testid="group-item-sort-button"]');
    const filterToggle = actions.locator('[data-testid="group-filter-toggle"]');
    const renameBtn = actions.locator('[data-testid="group-rename-button"]');
    const colorPicker = actions.locator('[data-testid="color-picker-trigger"]');

    // 存在確認
    await expect(sortBtn).toBeVisible();
    await expect(filterToggle).toBeVisible();
    await expect(renameBtn).toBeVisible();
    await expect(colorPicker).toBeVisible();

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

  test('Pinned Domain Group buttons order should be [Pin][Sort][Palette][Filter][Rename]', async ({ page }) => {
    const domain = 'example.com';
    await createTestTabData(page, { url: 'https://example.com', title: 'Tab', domain });
    await page.reload();
    await waitForPageLoad(page);

    const groupHeader = page.locator(selectors.groupHeader).first();
    
    // ピン留めする
    await groupHeader.hover();
    await groupHeader.locator(selectors.pinButton).click();
    await expect(groupHeader.locator(selectors.pinButton)).toHaveClass(/pinned/);

    const actions = groupHeader.locator('.group-actions');

    // 順序を確認
    const rawOrder = await actions.locator('button, .group-sort-wrapper, .color-picker-trigger').evaluateAll(elements => {
      return elements.map(el => {
        if (el.getAttribute('data-testid') === 'group-pin-button') return 'pin';
        if (el.classList.contains('group-sort-wrapper') || el.querySelector('[data-testid="group-item-sort-button"]')) return 'sort';
        if (el.getAttribute('data-testid') === 'group-filter-toggle') return 'filter';
        if (el.getAttribute('data-testid') === 'group-rename-button') return 'rename';
        if (el.classList.contains('color-picker-trigger')) return 'palette';
        return 'other';
      }).filter(type => type !== 'other');
    });

    // 重複を除去
    const order = rawOrder.filter((item, index) => rawOrder.indexOf(item) === index);

    const relevantOrder = order.filter(t => ['pin', 'sort', 'palette', 'filter', 'rename'].includes(t));
    expect(relevantOrder).toEqual(['pin', 'sort', 'palette', 'filter', 'rename']);
  });
});

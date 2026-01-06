import { test, expect, getExtensionUrl } from './fixtures';
import { clearTestData, createTestTabData, createCustomGroupData, waitForPageLoad, tabsPageSelectors } from './helpers';

test.describe('タブカードの削除メニュー機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // 既存データをクリア
    await clearTestData(page);

    // カスタムグループの作成
    await createCustomGroupData(page, [{ name: 'Test Group', sortOrder: 0 }]);

    // 1. カスタムグループ「Test Group」に所属するタブ
    await createTestTabData(page, {
      url: 'https://example.com/custom',
      title: 'Custom Tab',
      domain: 'example.com',
      group: 'example.com',
      groupType: 'domain',
      customGroups: ['Test Group'],
    });

    // 2. どのカスタムグループにも所属しないタブ (ドメイングループ用)
    await createTestTabData(page, {
      url: 'https://other.com/normal',
      title: 'Normal Tab',
      domain: 'other.com',
      group: 'other.com',
      groupType: 'domain',
    });

    // ページをリロードして反映
    await page.reload();
    await waitForPageLoad(page);
  });

  test('カスタムグループ内ではゴミ箱ボタンをクリックすると削除メニューが表示される', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await waitForPageLoad(page);
    
    // Custom Tab を探す
    const tabCard = page.locator(tabsPageSelectors.tabCard, { hasText: 'Custom Tab' });
    await expect(tabCard).toBeVisible();
    await expect(tabCard).toHaveAttribute('data-group-type', 'custom');
    
    // ホバーしてアクションを表示
    await tabCard.hover();
    
    // ゴミ箱ボタンをクリック
    const deleteBtn = tabCard.locator(tabsPageSelectors.tabDeleteButton);
    await deleteBtn.click();

    // 削除メニューが表示されることを確認
    const deleteMenu = page.locator('.delete-menu-portal');
    await expect(deleteMenu).toBeVisible();
    await expect(deleteMenu.getByTestId('remove-from-group')).toBeVisible();
    await expect(deleteMenu.getByTestId('delete-tab')).toBeVisible();
  });

  test('「グループから外す」をクリックすると、そのグループからのみ削除される', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await waitForPageLoad(page);
    
    const tabCard = page.locator(tabsPageSelectors.tabCard, { hasText: 'Custom Tab' });
    await tabCard.hover();
    await tabCard.locator(tabsPageSelectors.tabDeleteButton).click();

    const menu = page.locator('.delete-menu-portal');
    await expect(menu).toBeVisible();
    
    // 「グループから外す」をクリック
    await menu.getByTestId('remove-from-group').click();

    // カスタムグループ（Test Group）からタブが消えることを確認
    await expect(page.locator(tabsPageSelectors.groupHeader, { hasText: 'Test Group' })).toHaveCount(0);

    // ドメイングループ（example.com）には出現することを確認
    const domainGroupSectionHeader = page.locator(tabsPageSelectors.groupHeader, { hasText: /example\.com/ });
    await expect(domainGroupSectionHeader).toBeVisible();
    
    await expect(page.locator(tabsPageSelectors.tabCard, { hasText: 'Custom Tab' })).toBeVisible();
  });

  test('「タブを削除」をクリックすると、システムから完全に削除される', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await waitForPageLoad(page);
    
    const tabCard = page.locator(tabsPageSelectors.tabCard, { hasText: 'Custom Tab' });
    await tabCard.hover();
    await tabCard.locator(tabsPageSelectors.tabDeleteButton).click();

    const menu = page.locator('.delete-menu-portal');
    await expect(menu).toBeVisible();

    // 「タブを削除」をクリック
    await menu.getByTestId('delete-tab').click();

    // タブが完全に消えることを確認
    await expect(page.locator(tabsPageSelectors.tabCard, { hasText: 'Custom Tab' })).toHaveCount(0);
  });

  test('ドメイングループ内ではゴミ箱ボタンをクリックすると即座に削除される', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await waitForPageLoad(page);
    
    const tabCard = page.locator(tabsPageSelectors.tabCard, { hasText: 'Normal Tab' });
    await expect(tabCard).toBeVisible();
    
    await tabCard.hover();
    await tabCard.locator(tabsPageSelectors.tabDeleteButton).click();

    // 削除メニューが表示されないことを確認
    const deleteMenu = page.locator('.delete-menu-portal');
    await expect(deleteMenu).not.toBeVisible();

    // タブが削除されたことを確認
    await expect(page.locator(tabsPageSelectors.tabCard, { hasText: 'Normal Tab' })).toHaveCount(0);
  });
});

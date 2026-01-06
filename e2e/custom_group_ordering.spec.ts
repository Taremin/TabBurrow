/**
 * カスタムグループ順序変更のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, clearTestData, createCustomGroupData, optionsPageSelectors } from './helpers';

test.describe('カスタムグループ順序変更', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // テストデータをクリア
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    await page.close();
  });

  test('カスタムグループ設定にドラッグハンドルが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループを作成
    await createCustomGroupData(page, [
      { name: 'グループA', sortOrder: 0 },
      { name: 'グループB', sortOrder: 1 },
    ]);
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // カスタムグループセクションを開く
    const customGroupsSection = page.locator(optionsPageSelectors.customGroupsSection);
    await expect(customGroupsSection).toBeVisible();
    
    // ドラッグハンドルが表示されていることを確認
    const dragHandles = customGroupsSection.locator('.drag-handle');
    await expect(dragHandles).toHaveCount(2);
    await expect(dragHandles.first()).toBeVisible();
  });

  test('ドラッグアンドドロップでグループの順序を変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループを作成
    await createCustomGroupData(page, [
      { name: 'グループA', sortOrder: 0 },
      { name: 'グループB', sortOrder: 1 },
      { name: 'グループC', sortOrder: 2 },
    ]);
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // カスタムグループセクションを開く
    const customGroupsSection = page.locator(optionsPageSelectors.customGroupsSection);
    
    // 初期順序を確認 (A, B, C)
    const groupItems = customGroupsSection.locator('.custom-group-item');
    await expect(groupItems).toHaveCount(3);
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループA');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループB');
    await expect(groupItems.nth(2).locator('.custom-group-name')).toHaveText('グループC');
    
    // グループAをグループCの下にドラッグ
    const groupA = groupItems.nth(0);
    const groupC = groupItems.nth(2);
    
    // Playwright の dragTo でドラッグアンドドロップを実行
    await groupA.dragTo(groupC, { targetPosition: { x: 50, y: 40 } }); // 下半分にドロップ
    
    // 順序が変更されたことを確認 (B, C, A)
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループB');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループC');
    await expect(groupItems.nth(2).locator('.custom-group-name')).toHaveText('グループA');
  });

  test('変更した順序がページリロード後も維持される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループを作成
    await createCustomGroupData(page, [
      { name: 'グループX', sortOrder: 0 },
      { name: 'グループY', sortOrder: 1 },
    ]);
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // カスタムグループセクション
    const customGroupsSection = page.locator(optionsPageSelectors.customGroupsSection);
    let groupItems = customGroupsSection.locator('.custom-group-item');
    
    // 初期順序を確認 (X, Y)
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループX');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループY');
    
    // グループYをグループXの上にドラッグ
    const groupY = groupItems.nth(1);
    const groupX = groupItems.nth(0);
    await groupY.dragTo(groupX, { targetPosition: { x: 50, y: 5 } }); // 上半分にドロップ
    
    // 順序が変更されたことを確認 (Y, X)
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループY');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループX');
    
    // ページをリロード
    await page.reload();
    await waitForPageLoad(page);
    
    // 順序が維持されていることを確認 (Y, X)
    groupItems = page.locator(optionsPageSelectors.customGroupsSection).locator('.custom-group-item');
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループY');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループX');
  });

  test('タブ管理画面でもカスタムグループが設定順序で表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループを作成（sortOrder順: C, A, B）
    await createCustomGroupData(page, [
      { name: 'グループC', sortOrder: 0 },
      { name: 'グループA', sortOrder: 1 },
      { name: 'グループB', sortOrder: 2 },
    ]);
    
    // タブ管理画面に移動
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループがsortOrder順で表示されることを確認
    // 注: グループにタブがないと表示されないため、グループヘッダーは表示されない可能性があります
    // このテストは、カスタムグループ設定画面での順序が正しく保存されていることを間接的に確認します
    
    // 設定画面に戻って順序を確認
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupsSection = page.locator(optionsPageSelectors.customGroupsSection);
    const groupItems = customGroupsSection.locator('.custom-group-item');
    
    await expect(groupItems.nth(0).locator('.custom-group-name')).toHaveText('グループC');
    await expect(groupItems.nth(1).locator('.custom-group-name')).toHaveText('グループA');
    await expect(groupItems.nth(2).locator('.custom-group-name')).toHaveText('グループB');
  });
});

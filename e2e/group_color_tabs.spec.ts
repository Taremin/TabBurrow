/**
 * タブ管理画面でのグループ色変更機能のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createCustomGroupData, createTestTabData, clearTestData } from './helpers';

test.describe('タブ管理画面 - カスタムグループ色変更', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    
    // テスト用にカスタムグループを作成（色付きで）
    await createCustomGroupData(page, [
      { name: 'テストグループ', sortOrder: 0 },
    ]);
    
    // カスタムグループにタブを追加
    await createTestTabData(page, {
      url: 'https://test-custom.example.com/page1',
      title: 'カスタムグループのタブ',
      groupType: 'custom',
      group: 'テストグループ',
      customGroups: ['テストグループ'],
    });
    
    await page.reload();
    await waitForPageLoad(page);
    await page.close();
  });

  test('カスタムグループヘッダーにカラーピッカーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    await expect(groupHeader).toBeVisible();
    
    // カラーピッカートリガーボタンがあることを確認
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await expect(colorPickerTrigger).toBeVisible();
  });

  test('カラーピッカーをクリックするとポップオーバーが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // ポップオーバーが表示される
    const popover = page.locator('.color-picker-popover');
    await expect(popover).toBeVisible();
    
    // プリセットカラーが表示される
    const presetColors = popover.locator('.color-preset-item');
    await expect(presetColors).toHaveCount(10); // 9色 + 色なし
  });

  test('カラーピッカークリック時にグループが折りたたまれない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    
    // グループ内のタブカードが表示されていることを確認（グループが展開されている）
    const tabCard = page.locator('[data-testid="tab-card"]').first();
    await expect(tabCard).toBeVisible();
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // ポップオーバーが表示される
    await expect(page.locator('.color-picker-popover')).toBeVisible();
    
    // グループ内のタブカードがまだ表示されていることを確認（折りたたまれていない）
    await expect(tabCard).toBeVisible();
    
    // ポップオーバーを閉じる（外部クリック）
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // それでもタブカードは表示されている（折りたたまれていない）
    await expect(tabCard).toBeVisible();
  });

  test('色を選択するとグループにカラーバーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    
    // 初期状態ではカラーバーがないことを確認
    await expect(groupHeader.locator('.group-color-bar')).toHaveCount(0);
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // 赤いプリセットカラーをクリック
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // ポップオーバーが閉じる
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // カラーバーが表示される
    const colorBar = groupHeader.locator('.group-color-bar');
    await expect(colorBar).toBeVisible();
  });

  test('色の変更が永続化される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // カスタムグループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // 赤いプリセットカラーをクリック
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // ポップオーバーが閉じるまで待機
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // カラーバーが表示されることを確認（色が適用されたら）
    const colorBar = groupHeader.locator('.group-color-bar');
    await expect(colorBar).toBeVisible();
    
    // 少し待機して保存が完了するのを待つ
    await page.waitForTimeout(500);
    
    // ページをリロード
    await page.reload();
    await waitForPageLoad(page);
    
    // カラーバーがまだ表示されていることを確認
    const reloadedGroupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'テストグループ'
    });
    const reloadedColorBar = reloadedGroupHeader.locator('.group-color-bar');
    await expect(reloadedColorBar).toBeVisible();
  });

  test('ドメイングループにはカラーピッカーが表示されない（ピン留めされていない場合）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ドメイングループ用のタブを追加
    await createTestTabData(page, {
      url: 'https://domain-group-test.example.com/page1',
      title: 'ドメイングループのタブ',
      domain: 'domain-group-test.example.com',
      groupType: 'domain',
      group: 'domain-group-test.example.com',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // ドメイングループのヘッダーを探す
    const domainGroupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'domain-group-test.example.com'
    });
    await expect(domainGroupHeader).toBeVisible();
    
    // ピン留めされていないドメイングループにはカラーピッカーがないことを確認
    const colorPickerTrigger = domainGroupHeader.locator('.color-picker-trigger');
    await expect(colorPickerTrigger).toHaveCount(0);
  });
});

test.describe('タブ管理画面 - ピン留めドメイングループ色変更', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    
    // ドメイングループ用のタブを作成
    await createTestTabData(page, {
      url: 'https://pinned-domain.example.com/page1',
      title: 'ピン留めドメインのタブ',
      domain: 'pinned-domain.example.com',
      groupType: 'domain',
      group: 'pinned-domain.example.com',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    await page.close();
  });

  test('ピン留めするとカラーピッカーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ドメイングループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'pinned-domain.example.com'
    });
    await expect(groupHeader).toBeVisible();
    
    // ピン留め前はカラーピッカーがないことを確認
    let colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await expect(colorPickerTrigger).toHaveCount(0);
    
    // ピン留めボタンをクリック
    const pinButton = groupHeader.locator('[data-testid="group-pin-button"]');
    await pinButton.click();
    
    // 少し待機
    await page.waitForTimeout(300);
    
    // ピン留め後はカラーピッカーが表示されることを確認
    colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await expect(colorPickerTrigger).toBeVisible();
  });

  test('ピン留めドメイングループの色を変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ドメイングループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'pinned-domain.example.com'
    });
    
    // まずピン留め
    const pinButton = groupHeader.locator('[data-testid="group-pin-button"]');
    await pinButton.click();
    await page.waitForTimeout(300);
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // 色を選択
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // ポップオーバーが閉じる
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // カラーバーが表示される
    const colorBar = groupHeader.locator('.group-color-bar');
    await expect(colorBar).toBeVisible();
  });

  test('ピン留めドメイングループの色変更が永続化される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ドメイングループのヘッダーを探す
    const groupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'pinned-domain.example.com'
    });
    
    // まずピン留め
    const pinButton = groupHeader.locator('[data-testid="group-pin-button"]');
    await pinButton.click();
    await page.waitForTimeout(300);
    
    // カラーピッカートリガーをクリック
    const colorPickerTrigger = groupHeader.locator('.color-picker-trigger');
    await colorPickerTrigger.click();
    
    // 色を選択
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // ポップオーバーが閉じるまで待機
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // ページをリロード
    await page.reload();
    await waitForPageLoad(page);
    
    // カラーバーがまだ表示されていることを確認
    const reloadedGroupHeader = page.locator('[data-testid="group-header"]').filter({
      hasText: 'pinned-domain.example.com'
    });
    const colorBar = reloadedGroupHeader.locator('.group-color-bar');
    await expect(colorBar).toBeVisible();
  });
});

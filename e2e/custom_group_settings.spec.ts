import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad } from './helpers';

test.describe('カスタムグループ設定', () => {
  test('カスタムグループのドメイングループ表示設定を変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ hasText: /カスタムグループ|Custom Groups/ });
    
    // チェックボックスを探す (ラベルテキストを含むlabel要素内のinput)
    const labelPattern = /カスタムグループのタブをドメイングループにも表示する|Show custom grouped tabs in domain groups/;
    const checkboxLabel = customGroupSection.locator('label').filter({ hasText: labelPattern });
    const checkbox = checkboxLabel.locator('input[type="checkbox"]');
    
    // inputはCSSで隠されている可能性があるため、ラベルの可視性をチェック
    await expect(checkboxLabel).toBeVisible();
    
    // 初期状態はチェックされていないはず（デフォルトfalse）
    await expect(checkbox).not.toBeChecked();
    
    // チェックを入れる
    await checkboxLabel.click();
    
    // 保存ボタンが有効になるはず
    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toBeEnabled();
    
    // 保存する
    await saveButton.click();
    
    // 保存完了メッセージなどを待つ（またはボタンが無効になるのを待つ）
    await expect(saveButton).toBeDisabled();
    
    // リロードして設定が保存されているか確認
    await page.reload();
    await waitForPageLoad(page);
    
    const reloadedSection = page.locator('.settings-section').filter({ hasText: /カスタムグループ|Custom Groups/ });
    const reloadedCheckboxLabel = reloadedSection.locator('label').filter({ hasText: labelPattern });
    const reloadedCheckbox = reloadedCheckboxLabel.locator('input[type="checkbox"]');
    await expect(reloadedCheckbox).toBeChecked();
  });
});

test.describe('タブ管理画面での設定切り替え', () => {
  test('表示モードメニューから設定を切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 表示モード切替ボタンをクリック
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();
    
    // メニューが表示される
    const viewModeMenu = page.locator('.view-mode-menu');
    await expect(viewModeMenu).toBeVisible();
    
    // カスタムグループ設定項目を探す
    const settingLabel = /カスタムグループのタブをドメイングループにも表示する|Show custom grouped tabs in domain groups/;
    const settingButton = viewModeMenu.locator('button').filter({ hasText: settingLabel });
    await expect(settingButton).toBeVisible();
    
    // クリックして切り替え
    await settingButton.click();
    
    // メニューが閉じる
    await expect(viewModeMenu).not.toBeVisible();
    
    // 設定が保存されていることを確認 - オプション画面で確認
    const optionsPage = await context.newPage();
    await optionsPage.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(optionsPage);
    
    const customGroupSection = optionsPage.locator('.settings-section').filter({ hasText: /カスタムグループ|Custom Groups/ });
    const labelPattern = /カスタムグループのタブをドメイングループにも表示する|Show custom grouped tabs in domain groups/;
    const checkboxLabel = customGroupSection.locator('label').filter({ hasText: labelPattern });
    const checkbox = checkboxLabel.locator('input[type="checkbox"]');
    
    await expect(checkbox).toBeChecked();
  });
});

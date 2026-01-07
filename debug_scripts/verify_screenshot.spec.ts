/**
 * スクリーンショット機能の検証
 */
import { test, expect, getExtensionUrl } from '../e2e/fixtures';
import { optionsPageSelectors, waitForPageLoad } from '../e2e/helpers';

test.describe('スクリーンショット機能検証', () => {
  test('設定画面にスクリーンショット設定が表示され、変更・保存できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // スクリーンショットセクションが表示されているか
    const section = page.locator(optionsPageSelectors.backupSection).locator('xpath=./following-sibling::section').first();
    // もしくは data-testid を使う（実装で追加したはず）
    const screenshotSection = page.locator('[data-testid="screenshot-section"]');
    await expect(screenshotSection).toBeVisible();
    
    // デフォルト値の確認
    const enabledCheckbox = screenshotSection.locator('#screenshotEnabled');
    const intervalInput = screenshotSection.locator('#screenshotUpdateInterval');
    
    await expect(enabledCheckbox).toBeChecked();
    await expect(intervalInput).toHaveValue('5'); // デフォルト5分
    
    // 設定変更
    await page.locator('label:has(#screenshotEnabled)').click();
    await intervalInput.fill('10');
    
    // 保存ボタンが有効になるか
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
    
    // 保存実行
    await submitButton.click();
    
    // リロードして反映されているか確認
    await page.reload();
    await waitForPageLoad(page);
    
    await expect(page.locator('#screenshotEnabled')).not.toBeChecked();
    await expect(page.locator('#screenshotUpdateInterval')).toHaveValue('10');
  });

  test('タブ管理画面でスクリーンショットが正しく表示される（プレースホルダーまたはキャッシュ）', async ({ context, extensionId }) => {
    const page = await context.newPage();
    // 拡張機能のメイン画面（tabs.html）へ移動
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // タブカードが表示されるまで待つ（ダミーデータがある前提、もしくはない場合はエラーにならないことを確認）
    // 通常のE2Eテスト環境ではデータが空の可能性がある
  });
});

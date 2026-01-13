import { test, expect, getExtensionUrl } from './fixtures';
import { createTestTabData, clearTestData, waitForPageLoad } from './helpers';

/**
 * フォーカス復帰機能のテスト
 * 
 * 注意: Playwrightの launchPersistentContext 環境では、
 * 複数のテストでブラウザコンテキストが共有されるため、
 * このテストでは1つのテストケース内で全ての検証を行います。
 */
test.describe('フォーカス復帰機能', () => {
    test('設定のON/OFFと保存が正しく動作する', async ({ context, extensionId }) => {
        const page = await context.newPage();
        await page.goto(getExtensionUrl(extensionId, 'options.html'));
        await waitForPageLoad(page);
        
        // 1. チェックボックスがデフォルトでオフであることを確認（CSSで非表示なのでtoBeAttachedを使用）
        const checkbox = page.getByTestId('return-focus-checkbox');
        await expect(checkbox).toBeAttached();
        await expect(checkbox).not.toBeChecked({ timeout: 5000 });
        
        // 2. ラベルをクリックしてオンにする（CSSでカスタマイズされたチェックボックス対応）
        const checkboxLabel = page.locator('label:has([data-testid="return-focus-checkbox"])');
        await checkboxLabel.click();
        
        // 3. チェックボックスがオンになったことを確認
        await expect(checkbox).toBeChecked();
        
        // 4. 更新ボタンをクリック
        await page.getByRole('button', { name: /更新|Update/ }).click();
        await page.waitForTimeout(1000);
        
        // 5. ページをリロードして設定が保存されていることを確認
        await page.reload();
        await waitForPageLoad(page);
        
        // 6. チェックボックスがオンのままであることを確認
        const checkboxAfterReload = page.getByTestId('return-focus-checkbox');
        await expect(checkboxAfterReload).toBeChecked({ timeout: 5000 });
        
        // 7. テスト用データを作成してタブ管理画面が正しく動作することを確認
        await clearTestData(page);
        await createTestTabData(page, { 
            url: 'https://example.com/1', 
            title: 'Example 1',
        });
        
        // 8. タブ管理画面に移動
        await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
        await waitForPageLoad(page);
        
        // 9. タブカードが表示されていることを確認
        await page.waitForSelector('[data-testid="tab-card"]', { timeout: 10000 });
        const tabCards = page.locator('[data-testid="tab-card"]');
        await expect(tabCards.first()).toBeVisible();
        
        // 設定がオンの状態でタブ管理画面が正常に動作していることを確認完了
        // (実際のopenerTabId設定はブラウザAPIへの呼び出しで行われるため、
        //  ここではUIが正しく機能していることを検証)
    });
});

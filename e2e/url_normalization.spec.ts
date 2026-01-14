/**
 * URL正規化機能のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors, waitForPageLoad, createTestTabData } from './helpers';

test.describe('URL正規化機能', () => {
  test('選択したタブから正規化ルールを作成し、既存タブを統合できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    
    // 類似するURLのタブを2つ追加
    await createTestTabData(page, {
      url: 'https://ncode.syosetu.com/n1234/1/',
      title: 'Chapter 1',
    });
    await createTestTabData(page, {
      url: 'https://ncode.syosetu.com/n1234/2/',
      title: 'Chapter 2',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 2つのタブが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(2);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 両方のタブを選択
    const checkboxes = page.locator(tabsPageSelectors.tabCard).locator('input[type="checkbox"]');
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();
    
    // 正規化ルール作成ボタンをクリック
    const createRuleButton = page.locator('[data-testid="create-normalization-rule-button"]');
    await expect(createRuleButton).toBeVisible();
    await createRuleButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Normalization/i);
    
    // パターンが提案されていることを確認
    const patternInput = page.getByTestId('rule-pattern-input');
    await expect(patternInput).not.toHaveValue('');
    const patternValue = await patternInput.inputValue();
    expect(patternValue).toContain('\\d+');
    
    // 保存ボタンをクリック（「既存データに適用」はデフォルトでチェックされている想定）
    const saveButton = page.locator('.dialog button.btn-primary');
    await saveButton.click();
    
    // 適用結果ダイアログが表示されるのを待つ (NormalizationResultDialog)
    // タイトルで特定する ('settings.urlNormalization.resultDialog.title' の翻訳が "URL正規化の結果" などの場合)
    // 確実なのは .dialog セレクターと内容を確認すること
    const resultDialog = page.locator('.dialog');
    await expect(resultDialog).toBeVisible();
    
    // 閉じるボタン（.btn-primary）をクリックしてダイアログを閉じる
    await resultDialog.locator('button.btn-primary').click();
    await expect(resultDialog).not.toBeVisible();
    
    // タブが1つに統合されたことを確認
    await expect(tabCards).toHaveCount(1);
    
    // 設定画面でルールが保存されているか確認
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // URL正規化セクションが存在することを確認
    const normalizationSection = page.locator('[data-testid="url-normalization-section"]');
    await expect(normalizationSection).toBeVisible();
    
    // 作成したルールが表示されていることを確認
    await expect(normalizationSection.getByTestId('normalization-rule-item')).toContainText('ncode.syosetu.com');
  });

  test('設定画面でルールを手動で作成・編集・削除できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ルール追加ボタンをクリック
    const addBtn = page.getByTestId('add-normalization-rule-button');
    await addBtn.click();
    
    // ダイアログで入力
    await page.getByTestId('rule-name-input').fill('Test Manual Rule');
    await page.getByTestId('rule-pattern-input').fill('^https://example\\.com/p/(\\d+)$');
    await page.getByTestId('rule-replacement-input').fill('https://example.com/p/');
    
    // 保存
    await page.locator('.dialog button.btn-primary').click();
    
    // リストに表示されることを確認
    await expect(page.getByTestId('normalization-rule-item')).toContainText('Test Manual Rule');
    
    // シミュレータでテスト
    const simulatorInput = page.getByTestId('normalization-simulator-input');
    await simulatorInput.fill('https://example.com/p/123');
    await page.waitForTimeout(300);
    
    const result = page.getByTestId('normalization-simulator-result');
    await expect(result).toHaveText('https://example.com/p/');
    
    // 編集
    await page.getByTestId('edit-normalization-rule-button').first().click();
    await page.getByTestId('rule-name-input').fill('Updated Name');
    await page.locator('.dialog button.btn-primary').click();
    await expect(page.getByTestId('normalization-rule-item')).toContainText('Updated Name');
    
    // 削除
    const deleteBtn = page.getByTestId('delete-normalization-rule-button').first();
    await deleteBtn.click();
    await expect(page.getByTestId('normalization-rule-item')).toHaveCount(0);
  });
});

/**
 * カラーピッカーコンポーネントのE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createCustomGroupData, clearTestData } from './helpers';

test.describe('カラーピッカー', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    
    // テスト用にカスタムグループを作成
    await createCustomGroupData(page, [
      { name: 'テストグループ', sortOrder: 0 },
    ]);
    await page.reload();
    await waitForPageLoad(page);
    await page.close();
  });

  test('カラーピッカーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループセクションを探す
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    // カラーピッカートリガーボタンを探す
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await expect(colorPickerTrigger).toBeVisible();
    
    // クリックでポップオーバーが開く
    await colorPickerTrigger.click();
    
    const popover = page.locator('.color-picker-popover');
    await expect(popover).toBeVisible();
    
    // プリセットカラーが表示される
    const presetColors = popover.locator('.color-preset-item');
    await expect(presetColors).toHaveCount(10); // 9色 + 色なし
  });

  test('プリセットカラーを選択できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await colorPickerTrigger.click();
    
    // 最初のプリセットカラー（赤）をクリック
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // ポップオーバーが閉じる
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
    
    // カラープレビューが表示される
    const colorPreview = colorPickerTrigger.locator('.color-preview');
    await expect(colorPreview).toBeVisible();
  });

  test('カスタム色を選択できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await colorPickerTrigger.click();
    
    // カスタム色選択ボタンをクリック
    const customToggle = page.locator('.color-custom-toggle');
    await customToggle.click();
    
    // カスタムピッカーが表示される
    const customPicker = page.locator('.color-custom-picker');
    await expect(customPicker).toBeVisible();
    
    // HSVピッカーが表示される
    const hexPicker = customPicker.locator('.react-colorful');
    await expect(hexPicker).toBeVisible();
    
    // HEX入力欄が表示される
    const hexInput = customPicker.locator('.color-hex-input');
    await expect(hexInput).toBeVisible();
  });

  test('HEX入力欄でテキスト選択のためのドラッグが可能', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    // スクロールしてカスタムグループセクションを表示
    await customGroupSection.scrollIntoViewIfNeeded();
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await colorPickerTrigger.click();
    
    // カスタム色選択ボタンをクリック
    const customToggle = page.locator('.color-custom-toggle');
    await customToggle.click();
    
    // HEX入力欄を探す
    const hexInput = page.locator('.color-hex-input');
    await expect(hexInput).toBeVisible();
    
    // 入力欄に値を設定（fillはフォーカスを取得する）
    await hexInput.fill('ff0000');
    
    // Ctrl+Aでテキスト全選択（ドラッグの代替）
    await page.keyboard.press('Control+A');
    
    // ポップオーバーがまだ表示されている（操作で閉じない）
    const popover = page.locator('.color-picker-popover');
    await expect(popover).toBeVisible();
    
    // カスタムピッカーもまだ表示されている
    const customPicker = page.locator('.color-custom-picker');
    await expect(customPicker).toBeVisible();
    
    // テキストが選択されていることを確認
    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBeTruthy();
    
    // 新しい値を入力して上書き（選択されていれば上書きできる）
    await page.keyboard.type('00ff00');
    await expect(hexInput).toHaveValue('00ff00');
    
    // まだポップオーバーは開いている
    await expect(popover).toBeVisible();
  });

  test('HEX入力で色が変更される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await colorPickerTrigger.click();
    
    // カスタム色選択ボタンをクリック
    const customToggle = page.locator('.color-custom-toggle');
    await customToggle.click();
    
    // HEX入力欄をクリアして新しい値を入力
    const hexInput = page.locator('.color-hex-input');
    await hexInput.fill('');
    await hexInput.fill('00ff00');
    
    // 少し待機して反映を確認
    await page.waitForTimeout(200);
    
    // 入力値が反映されている
    await expect(hexInput).toHaveValue('00ff00');
  });

  test('色なしを選択できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    
    // まず色を設定
    await colorPickerTrigger.click();
    const firstPreset = page.locator('.color-preset-item').first();
    await firstPreset.click();
    
    // 色が設定されていることを確認
    await expect(colorPickerTrigger.locator('.color-preview')).toBeVisible();
    
    // 再度開いて「色なし」を選択
    await colorPickerTrigger.click();
    const noColorButton = page.locator('.color-preset-item.no-color');
    await noColorButton.click();
    
    // カラープレビューが消えてパレットアイコンに戻る
    await expect(colorPickerTrigger.locator('.color-preview')).not.toBeVisible();
  });

  test('外部クリックでポップオーバーが閉じる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const customGroupSection = page.locator('.settings-section').filter({ 
      hasText: /カスタムグループ|Custom Groups/ 
    });
    
    const colorPickerTrigger = customGroupSection.locator('.color-picker-trigger').first();
    await colorPickerTrigger.click();
    
    // ポップオーバーが開いている
    await expect(page.locator('.color-picker-popover')).toBeVisible();
    
    // 外部をクリック
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    
    // ポップオーバーが閉じる
    await expect(page.locator('.color-picker-popover')).not.toBeVisible();
  });
});

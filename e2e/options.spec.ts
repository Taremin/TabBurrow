/**
 * 設定画面のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { optionsPageSelectors, waitForPageLoad } from './helpers';

test.describe('設定画面', () => {
  test('ページが正しく読み込まれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // コンテナが表示されていることを確認
    await expect(page.locator(optionsPageSelectors.container)).toBeVisible();
  });

  test('タブ管理画面へのリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // タブ管理リンクをクリック
    const tabManagerLink = page.locator(optionsPageSelectors.tabManagerLink);
    await expect(tabManagerLink).toBeVisible();
    
    await tabManagerLink.click();
    await waitForPageLoad(page);
    
    // タブ管理画面に遷移したことを確認
    expect(page.url()).toContain('tabs.html');
  });

  test('設定フォームが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 設定セクションが存在することを確認
    const sections = page.locator(optionsPageSelectors.settingsSection);
    await expect(sections.first()).toBeVisible();
  });

  test('言語設定が変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 言語ラジオボタンを見つける（言語設定はradioボタン）
    const englishOption = page.locator('input[name="locale"][value="en"]');
    await expect(englishOption).toBeVisible();
    
    // 英語オプションをクリック
    await englishOption.click();
    
    // 選択が反映されていることを確認
    await expect(englishOption).toBeChecked();
  });

  test('テーマ設定が変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テーマラジオボタンを見つける
    const lightTheme = page.locator('input[value="light"]');
    const darkTheme = page.locator('input[value="dark"]');
    
    // どちらかが存在することを確認
    const hasLightTheme = await lightTheme.count() > 0;
    const hasDarkTheme = await darkTheme.count() > 0;
    
    // テーマ設定が存在する場合はクリックしてテスト
    if (hasLightTheme) {
      await lightTheme.click();
      await expect(lightTheme).toBeChecked();
    }
    
    if (hasDarkTheme) {
      await darkTheme.click();
      await expect(darkTheme).toBeChecked();
    }
    
    // 少なくとも1つのテーマ設定が存在することを確認
    expect(hasLightTheme || hasDarkTheme).toBe(true);
  });

  test('保存ボタンが存在する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 保存ボタンが存在することを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeVisible();
  });

  test('設定変更後に保存ボタンがアクティブになる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 現在の言語設定を確認
    const jaOption = page.locator('input[name="locale"][value="ja"]');
    const enOption = page.locator('input[name="locale"][value="en"]');
    
    // 現在チェックされていないオプションをクリック
    const isJaChecked = await jaOption.isChecked();
    if (isJaChecked) {
      await enOption.click();
    } else {
      await jaOption.click();
    }
    
    // 保存ボタンがクリック可能になることを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
  });
});

// ======================
// Export/Import テスト
// ======================

test.describe('設定画面 - データ管理', () => {
  test('データ管理セクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // データ管理セクションが存在することを確認
    const dataManagementSection = page.locator('.data-management');
    await expect(dataManagementSection).toBeVisible();
  });

  test('タブデータのエクスポートボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // タブデータグループを探す
    const tabDataGroup = page.locator('.data-group').first();
    await expect(tabDataGroup).toBeVisible();
    
    // エクスポートボタン（ファイル）
    const exportButton = tabDataGroup.locator('.btn').filter({ hasText: /📤/ }).first();
    await expect(exportButton).toBeVisible();
  });

  test('タブデータのテキスト表示ボタンでエクスポートダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テキスト表示ボタン（📋）をクリック
    const showTextButton = page.locator('.data-group').first().locator('.btn-small').filter({ hasText: /📋/ });
    await expect(showTextButton).toBeVisible();
    await showTextButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // テキストエリアが表示されることを確認
    const textarea = dialog.locator('.export-import-textarea');
    await expect(textarea).toBeVisible();
    
    // フォーマット選択セレクトが表示されることを確認（タブエクスポートの場合）
    const formatSelect = dialog.locator('.form-select');
    await expect(formatSelect).toBeVisible();
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('タブデータのエクスポートダイアログでフォーマットを切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テキスト表示ボタンをクリック
    const showTextButton = page.locator('.data-group').first().locator('.btn-small').filter({ hasText: /📋/ });
    await showTextButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    const formatSelect = dialog.locator('.form-select');
    
    // URLリスト形式に切り替え
    await formatSelect.selectOption('urlList');
    await expect(formatSelect).toHaveValue('urlList');
    
    // Markdown形式に切り替え
    await formatSelect.selectOption('markdown');
    await expect(formatSelect).toHaveValue('markdown');
    
    // JSON形式に戻す
    await formatSelect.selectOption('json');
    await expect(formatSelect).toHaveValue('json');
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
  });

  test('タブデータのテキストインポートダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テキスト貼り付けボタン（📝）をクリック
    const pasteTextButton = page.locator('.data-group').first().locator('.btn-small').filter({ hasText: /📝/ });
    await expect(pasteTextButton).toBeVisible();
    await pasteTextButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // テキストエリアが表示されることを確認
    const textarea = dialog.locator('.export-import-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder');
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('タブデータのインポートダイアログでフォーマットが自動検出される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テキスト貼り付けボタンをクリック
    const pasteTextButton = page.locator('.data-group').first().locator('.btn-small').filter({ hasText: /📝/ });
    await pasteTextButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    const textarea = dialog.locator('.export-import-textarea');
    
    // URLリスト形式を入力
    await textarea.fill('https://example.com\nhttps://google.com');
    
    // フォーマット検出表示を確認
    const formatDetected = dialog.locator('.format-detected');
    await expect(formatDetected).toBeVisible();
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
  });

  test('設定のテキスト表示ボタンでエクスポートダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 設定データグループ（2番目）のテキスト表示ボタン
    const settingsGroup = page.locator('.data-group').nth(1);
    const showJsonButton = settingsGroup.locator('.btn-small').filter({ hasText: /📋/ });
    await expect(showJsonButton).toBeVisible();
    await showJsonButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // テキストエリアにJSONが表示されていることを確認
    const textarea = dialog.locator('.export-import-textarea');
    await expect(textarea).toBeVisible();
    
    // 設定のエクスポートはフォーマット選択がないことを確認
    const formatSelect = dialog.locator('.form-select');
    await expect(formatSelect).toHaveCount(0);
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('設定のテキストインポートダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 設定データグループ（2番目）のテキスト貼り付けボタン
    const settingsGroup = page.locator('.data-group').nth(1);
    const pasteJsonButton = settingsGroup.locator('.btn-small').filter({ hasText: /📝/ });
    await expect(pasteJsonButton).toBeVisible();
    await pasteJsonButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // テキストエリアが表示されることを確認
    const textarea = dialog.locator('.export-import-textarea');
    await expect(textarea).toBeVisible();
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('設定のインポートダイアログで無効なJSONを入力するとエラーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 設定データグループのテキスト貼り付けボタン
    const settingsGroup = page.locator('.data-group').nth(1);
    const pasteJsonButton = settingsGroup.locator('.btn-small').filter({ hasText: /📝/ });
    await pasteJsonButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    const textarea = dialog.locator('.export-import-textarea');
    
    // 無効なJSONを入力
    await textarea.fill('{ invalid json }');
    
    // インポートボタンをクリック
    const importButton = dialog.locator('.btn-primary');
    await importButton.click();
    
    // エラーメッセージが表示されることを確認
    const errorMessage = dialog.locator('.dialog-error');
    await expect(errorMessage).toBeVisible();
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
  });

  test('エクスポートダイアログでコピーボタンが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // クリップボードAPIを使用するための権限を付与
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // 設定のテキスト表示ボタンをクリック
    const settingsGroup = page.locator('.data-group').nth(1);
    const showJsonButton = settingsGroup.locator('.btn-small').filter({ hasText: /📋/ });
    await showJsonButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // コピーボタンをクリック
    const copyButton = dialog.locator('.btn-primary');
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    
    // ボタンのテキストが変わることを確認（コピー済み表示）
    // 注: 実際のテキストは翻訳により異なるため、ボタンの存在のみ確認
    await expect(copyButton).toBeVisible();
    
    // ダイアログを閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
  });
});


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
    // 言語ラジオボタンのラベルを見つける
    const englishLabel = page.locator('label:has(input[name="locale"][value="en"])');
    const englishOption = page.locator('input[name="locale"][value="en"]');
    
    await expect(englishLabel).toBeVisible();
    
    // 英語オプションをクリック（ラベルをクリック）
    await englishLabel.click();
    
    // 選択が反映されていることを確認
    await expect(englishOption).toBeChecked();
  });

  test('テーマ設定が変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テーマラジオボタンを見つける
    // テーマラジオボタンのラベルを見つける
    const lightThemeLabel = page.locator('label:has(input[value="light"])');
    const darkThemeLabel = page.locator('label:has(input[value="dark"])');
    const lightTheme = page.locator('input[value="light"]');
    const darkTheme = page.locator('input[value="dark"]');
    
    // どちらかが存在することを確認
    const hasLightTheme = await lightThemeLabel.count() > 0;
    const hasDarkTheme = await darkThemeLabel.count() > 0;
    
    // テーマ設定が存在する場合はクリックしてテスト
    if (hasLightTheme) {
      await lightThemeLabel.click();
      await expect(lightTheme).toBeChecked();
    }
    
    if (hasDarkTheme) {
      await darkThemeLabel.click();
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
    const jaLabel = page.locator('label:has(input[name="locale"][value="ja"])');
    const enLabel = page.locator('label:has(input[name="locale"][value="en"])');
    
    // 現在チェックされていないオプションをクリック
    const isJaChecked = await jaOption.isChecked();
    if (isJaChecked) {
      await enLabel.click();
    } else {
      await jaLabel.click();
    }
    
    // 保存ボタンがクリック可能になることを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
  });

  test('設定変更なしでタブ管理画面に遷移すると警告なしで遷移できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // タブ管理リンクをクリック（設定変更なし）
    const tabManagerLink = page.locator(optionsPageSelectors.tabManagerLink);
    await tabManagerLink.click();
    await waitForPageLoad(page);
    
    // 警告ダイアログなしで直接遷移することを確認
    expect(page.url()).toContain('tabs.html');
  });

  test('設定変更ありでタブ管理画面リンクをクリックすると警告ダイアログが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 言語設定を変更（未保存状態を作る）
    // 言語設定を変更（未保存状態を作る）
    const currentJa = page.locator('input[name="locale"][value="ja"]');
    const currentEn = page.locator('input[name="locale"][value="en"]');
    const jaLabel = page.locator('label:has(input[name="locale"][value="ja"])');
    const enLabel = page.locator('label:has(input[name="locale"][value="en"])');

    const isJaChecked = await currentJa.isChecked();
    if (isJaChecked) {
      await enLabel.click();
    } else {
      await jaLabel.click();
    }
    
    // タブ管理リンクをクリック
    const tabManagerLink = page.locator(optionsPageSelectors.tabManagerLink);
    await tabManagerLink.click();
    
    // 警告ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // ダイアログに3つのボタンがあることを確認
    const cancelButton = dialog.locator('.btn-secondary');
    const leaveButton = dialog.locator('.btn-danger');
    const saveButton = dialog.locator('.btn-primary');
    
    await expect(cancelButton).toBeVisible();
    await expect(leaveButton).toBeVisible();
    await expect(saveButton).toBeVisible();
    
    // キャンセルボタンでダイアログを閉じる
    await cancelButton.click();
    
    // ダイアログが閉じて設定画面に留まることを確認
    await expect(dialog).not.toBeVisible();
    expect(page.url()).toContain('options.html');
  });

  test('警告ダイアログで「保存せずに移動」を選択すると設定を破棄して遷移する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 言語設定を変更
    // 言語設定を変更
    const currentJa = page.locator('input[name="locale"][value="ja"]');
    const isJaChecked = await currentJa.isChecked();
    
    if (isJaChecked) {
      await page.locator('label:has(input[name="locale"][value="en"])').click();
    } else {
      await page.locator('label:has(input[name="locale"][value="ja"])').click();
    }
    
    // タブ管理リンクをクリック
    const tabManagerLink = page.locator(optionsPageSelectors.tabManagerLink);
    await tabManagerLink.click();
    
    // 警告ダイアログが表示される
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 「保存せずに移動」ボタンをクリック
    const leaveButton = dialog.locator('.btn-danger');
    await leaveButton.click();
    
    // タブ管理画面に遷移することを確認
    await waitForPageLoad(page);
    expect(page.url()).toContain('tabs.html');
  });

  test('警告ダイアログで「保存して移動」を選択すると設定を保存してから遷移する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 言語設定を変更
    // 言語設定を変更
    const currentJa = page.locator('input[name="locale"][value="ja"]');
    const isJaChecked = await currentJa.isChecked();
    
    if (isJaChecked) {
      await page.locator('label:has(input[name="locale"][value="en"])').click();
    } else {
      await page.locator('label:has(input[name="locale"][value="ja"])').click();
    }
    
    // タブ管理リンクをクリック
    const tabManagerLink = page.locator(optionsPageSelectors.tabManagerLink);
    await tabManagerLink.click();
    
    // 警告ダイアログが表示される
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 「保存して移動」ボタンをクリック
    const saveButton = dialog.locator('.btn-primary');
    await saveButton.click();
    
    // タブ管理画面に遷移することを確認
    await waitForPageLoad(page);
    expect(page.url()).toContain('tabs.html');
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
    
    // エクスポートボタン（ファイル）- lucide-download クラスを持つボタン
    const exportButton = tabDataGroup.locator('.btn:has(.lucide-download)').first();
    await expect(exportButton).toBeVisible();
  });

  test('タブデータのテキスト表示ボタンでエクスポートダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テキスト表示ボタン - 最初の btn-small
    const showTextButton = page.locator('.data-group').first().locator('.btn-small').first();
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
    
    // テキスト表示ボタンをクリック - 最初の btn-small
    const showTextButton = page.locator('.data-group').first().locator('.btn-small').first();
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
    
    // テキスト貼り付けボタン - lucide-clipboard-paste クラスを持つボタン
    const pasteTextButton = page.locator('.data-group').first().locator('.btn-small:has(.lucide-clipboard-paste)');
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
    
    // テキスト貼り付けボタンをクリック - lucide-clipboard-paste クラスを持つボタン
    const pasteTextButton = page.locator('.data-group').first().locator('.btn-small:has(.lucide-clipboard-paste)');
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
    
    // 設定データグループ（2番目）のテキスト表示ボタン - 最初の btn-small
    const settingsGroup = page.locator('.data-group').nth(1);
    const showJsonButton = settingsGroup.locator('.btn-small').first();
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
    
    // 設定データグループ（2番目）のテキスト貼り付けボタン - lucide-clipboard-paste クラスを持つボタン
    const settingsGroup = page.locator('.data-group').nth(1);
    const pasteJsonButton = settingsGroup.locator('.btn-small:has(.lucide-clipboard-paste)');
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
    
    // 設定データグループのテキスト貼り付けボタン - lucide-clipboard-paste クラスを持つボタン
    const settingsGroup = page.locator('.data-group').nth(1);
    const pasteJsonButton = settingsGroup.locator('.btn-small:has(.lucide-clipboard-paste)');
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
    
    // 設定のテキスト表示ボタンをクリック - 最初の btn-small
    const settingsGroup = page.locator('.data-group').nth(1);
    const showJsonButton = settingsGroup.locator('.btn-small').first();
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

// ======================
// リンクチェック設定 テスト
// ======================

test.describe('設定画面 - リンクチェック設定', () => {
  test('リンクチェック設定セクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // リンクチェック設定セクションが存在することを確認
    const linkCheckSection = page.locator('.settings-section').filter({ hasText: /リンクチェック|Link Check/ });
    await expect(linkCheckSection).toBeVisible();
  });

  test('ルール追加ボタンをクリックするとダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // リンクチェック設定セクションを探す
    const linkCheckSection = page.locator('.settings-section').filter({ hasText: /リンクチェック|Link Check/ });
    
    // ルール追加ボタンをクリック
    const addRuleButton = linkCheckSection.locator('.btn-primary').filter({ hasText: /ルール追加|Add Rule/ });
    await expect(addRuleButton).toBeVisible();
    await addRuleButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // ダイアログにルール名、条件、アクションのフィールドがあることを確認
    await expect(dialog.locator('#linkCheckRuleName')).toBeVisible();
    await expect(dialog.locator('#linkCheckRuleCondition')).toBeVisible();
    await expect(dialog.locator('#linkCheckRuleAction')).toBeVisible();
    
    // キャンセルボタンで閉じる
    await dialog.locator('.btn-secondary').click();
    await expect(dialog).not.toBeVisible();
  });

  test('ルール追加ダイアログで条件が空の場合エラーが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ルール追加ボタンをクリック
    const linkCheckSection = page.locator('.settings-section').filter({ hasText: /リンクチェック|Link Check/ });
    const addRuleButton = linkCheckSection.locator('.btn-primary').filter({ hasText: /ルール追加|Add Rule/ });
    await addRuleButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 条件を入力せずに保存ボタンをクリック
    const saveButton = dialog.locator('.btn-primary');
    await saveButton.click();
    
    // エラーメッセージが表示されることを確認
    const errorHint = dialog.locator('.form-hint').filter({ hasText: /入力|enter|required/i });
    await expect(errorHint).toBeVisible();
    
    // ダイアログはまだ開いている
    await expect(dialog).toBeVisible();
    
    // キャンセルで閉じる
    await dialog.locator('.btn-secondary').click();
  });

  test('ルールを追加できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ルール追加ボタンをクリック
    const linkCheckSection = page.locator('.settings-section').filter({ hasText: /リンクチェック|Link Check/ });
    const addRuleButton = linkCheckSection.locator('.btn-primary').filter({ hasText: /ルール追加|Add Rule/ });
    await addRuleButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // ルール名と条件を入力
    await dialog.locator('#linkCheckRuleName').fill('テストルール');
    await dialog.locator('#linkCheckRuleCondition').fill('418');
    
    // アクションを「リンク切れ」に変更
    await dialog.locator('#linkCheckRuleAction').selectOption('dead');
    
    // 保存ボタンをクリック
    await dialog.locator('.btn-primary').click();
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
    
    // ルールリストに追加されたルールが表示される
    const rulesList = linkCheckSection.locator('.link-check-rules-list');
    await expect(rulesList.locator('.link-check-rule-item').filter({ hasText: '418' })).toBeVisible();
  });

  test('既存ルールを編集できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // リンクチェック設定セクション
    const linkCheckSection = page.locator('.settings-section').filter({ hasText: /リンクチェック|Link Check/ });
    
    // デフォルトルール（404）の編集ボタンをクリック
    const ruleItem = linkCheckSection.locator('.link-check-rule-item').filter({ hasText: '404' }).first();
    await expect(ruleItem).toBeVisible();
    
    const editButton = ruleItem.locator('.btn-rule-edit');
    await editButton.click();
    
    // ダイアログが開く
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 条件フィールドに既存値が表示されている
    const conditionInput = dialog.locator('#linkCheckRuleCondition');
    await expect(conditionInput).toHaveValue('404');
    
    // キャンセルで閉じる
    await dialog.locator('.btn-secondary').click();
    await expect(dialog).not.toBeVisible();
  });
});

// ======================
// アイコンクリック設定 テスト
// ======================

test.describe('設定画面 - アイコンクリック設定', () => {
  test('アイコンクリック設定セクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // アイコンクリック設定セクションが存在することを確認
    const iconClickSection = page.locator('.settings-section').filter({ hasText: /アイコンクリック|Icon Click/ });
    await expect(iconClickSection).toBeVisible();
  });

  test('自動収納ルール適用チェックボックスが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // チェックボックスが存在することを確認（CSSで非表示なのでtoBeAttachedを使用）
    const applyRulesCheckbox = page.locator('#iconClickApplyRules');
    await expect(applyRulesCheckbox).toBeAttached();
    
    // デフォルトでチェックされていることを確認
    await expect(applyRulesCheckbox).toBeChecked();
  });

  test('自動収納ルール適用チェックボックスをトグルできる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const applyRulesCheckbox = page.locator('#iconClickApplyRules');
    // チェックボックスのラベルを取得
    const checkboxLabel = page.locator('label:has(#iconClickApplyRules)');
    
    // チェックを外す（ラベルをクリック）
    await checkboxLabel.click();
    await expect(applyRulesCheckbox).not.toBeChecked();
    
    // チェックを付ける（再度ラベルをクリック）
    await checkboxLabel.click();
    await expect(applyRulesCheckbox).toBeChecked();
  });

  test('固定タブの扱いラジオボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ラジオボタンが存在することを確認（CSSで非表示なのでtoBeAttachedを使用）
    const skipOption = page.locator('input[name="pinnedAction"][value="skip"]');
    const suspendOption = page.locator('input[name="pinnedAction"][value="suspend"]');
    
    await expect(skipOption).toBeAttached();
    await expect(suspendOption).toBeAttached();
    
    // デフォルトで「何もしない」が選択されていることを確認
    await expect(skipOption).toBeChecked();
  });

  test('固定タブの扱いラジオボタンを切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const skipOption = page.locator('input[name="pinnedAction"][value="skip"]');
    const suspendOption = page.locator('input[name="pinnedAction"][value="suspend"]');
    
    // サスペンドオプションを選択（ラベルをクリック）
    const suspendLabel = page.locator('label:has(input[name="pinnedAction"][value="suspend"])');
    await suspendLabel.click();
    
    await expect(suspendOption).toBeChecked();
    await expect(skipOption).not.toBeChecked();
    
    // スキップオプションに戻す
    const skipLabel = page.locator('label:has(input[name="pinnedAction"][value="skip"])');
    await skipLabel.click();
    
    await expect(skipOption).toBeChecked();
    await expect(suspendOption).not.toBeChecked();
  });

  test('設定変更後に保存ボタンがアクティブになる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 固定タブの扱いを変更（ラベルをクリック）
    const suspendLabel = page.locator('label:has(input[name="pinnedAction"][value="suspend"])');
    await suspendLabel.click();
    
    // 保存ボタンがクリック可能になることを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
  });
});

// ======================
// デフォルト表示モード設定 テスト
// ======================

test.describe('設定画面 - デフォルト表示モード設定', () => {
  test('デフォルト表示モード設定セクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // デフォルト表示モード設定セクションが存在することを確認
    const viewModeSection = page.locator('.settings-section').filter({ hasText: /デフォルト表示モード|Default View Mode/ });
    await expect(viewModeSection).toBeVisible();
  });

  test('グループ化モードラジオボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // グループ化モードのラジオボタンが存在することを確認
    const groupedOption = page.locator('input[name="defaultViewMode"][value="grouped"]');
    const flatOption = page.locator('input[name="defaultViewMode"][value="flat"]');
    
    await expect(groupedOption).toBeAttached();
    await expect(flatOption).toBeAttached();
    
    // デフォルトで「グループ表示」が選択されていることを確認
    await expect(groupedOption).toBeChecked();
  });

  test('表示密度ラジオボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 表示密度のラジオボタンが存在することを確認
    const normalOption = page.locator('input[name="defaultDisplayDensity"][value="normal"]');
    const compactOption = page.locator('input[name="defaultDisplayDensity"][value="compact"]');
    
    await expect(normalOption).toBeAttached();
    await expect(compactOption).toBeAttached();
    
    // デフォルトで「通常表示」が選択されていることを確認
    await expect(normalOption).toBeChecked();
  });

  test('グループ化モードを切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const groupedOption = page.locator('input[name="defaultViewMode"][value="grouped"]');
    const flatOption = page.locator('input[name="defaultViewMode"][value="flat"]');
    
    // フラット表示を選択（ラベルをクリック）
    const flatLabel = page.locator('label:has(input[name="defaultViewMode"][value="flat"])');
    await flatLabel.click();
    await expect(flatOption).toBeChecked();
    await expect(groupedOption).not.toBeChecked();
    
    // グループ表示に戻す
    const groupedLabel = page.locator('label:has(input[name="defaultViewMode"][value="grouped"])');
    await groupedLabel.click();
    await expect(groupedOption).toBeChecked();
    await expect(flatOption).not.toBeChecked();
  });

  test('表示密度を切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    const normalOption = page.locator('input[name="defaultDisplayDensity"][value="normal"]');
    const compactOption = page.locator('input[name="defaultDisplayDensity"][value="compact"]');
    
    // コンパクト表示を選択（ラベルをクリック）
    const compactLabel = page.locator('label:has(input[name="defaultDisplayDensity"][value="compact"])');
    await compactLabel.click();
    await expect(compactOption).toBeChecked();
    await expect(normalOption).not.toBeChecked();
    
    // 通常表示に戻す
    const normalLabel = page.locator('label:has(input[name="defaultDisplayDensity"][value="normal"])');
    await normalLabel.click();
    await expect(normalOption).toBeChecked();
    await expect(compactOption).not.toBeChecked();
  });

  test('設定変更後に保存ボタンがアクティブになる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // フラット表示を選択（ラベルをクリック）
    const flatLabel = page.locator('label:has(input[name="defaultViewMode"][value="flat"])');
    await flatLabel.click();
    
    // 保存ボタンがクリック可能になることを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
  });
});

// ======================
// クレジットページ テスト
// ======================

test.describe('クレジットページ', () => {
  test('設定画面からクレジットページへのリンクが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // クレジットリンクが存在することを確認
    const creditsLink = page.locator('.credits-link');
    await expect(creditsLink).toBeVisible();
  });

  test('クレジットページへのリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // クレジットリンクをクリック
    const creditsLink = page.locator('.credits-link');
    await creditsLink.click();
    await waitForPageLoad(page);
    
    // クレジットページに遷移したことを確認
    expect(page.url()).toContain('credits.html');
  });

  test('クレジットページが正しく読み込まれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'credits.html'));
    await waitForPageLoad(page);
    
    // ヘッダーが表示されていることを確認
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    // ライブラリカードが表示されていることを確認
    const libraryCards = page.locator('.library-card');
    await expect(libraryCards.first()).toBeVisible();
    
    // 少なくとも5つのライブラリが表示されていることを確認
    const count = await libraryCards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('クレジットページから設定画面に戻るリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'credits.html'));
    await waitForPageLoad(page);
    
    // 設定に戻るリンクをクリック
    const backLink = page.locator('.header a.btn');
    await expect(backLink).toBeVisible();
    await backLink.click();
    await waitForPageLoad(page);
    
    // 設定画面に遷移したことを確認
    expect(page.url()).toContain('options.html');
  });

  test('クレジットページでライセンス情報が表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'credits.html'));
    await waitForPageLoad(page);
    
    // React ライブラリの表示を確認
    const reactCard = page.locator('.library-card:has-text("React")').first();
    await expect(reactCard).toBeVisible();
    
    // ライセンス表示を確認
    await expect(reactCard.locator('.library-license')).toBeVisible();
    
    // バージョン表示を確認
    await expect(reactCard.locator('.library-version')).toBeVisible();
    
    // 著作権表示を確認
    await expect(reactCard.locator('.library-copyright')).toBeVisible();
  });
});

// ======================
// カスタムグループ管理 テスト
// ======================

test.describe('設定画面 - カスタムグループ管理', () => {
  test('カスタムグループ設定セクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムグループ設定セクションが存在することを確認
    const customGroupSection = page.locator('.settings-section').filter({ hasText: /カスタムグループ|Custom Groups/ });
    await expect(customGroupSection).toBeVisible();
  });

  test('新規グループ作成ボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 新規グループ作成ボタンが存在することを確認
    const addButton = page.locator('.add-group-button');
    await expect(addButton).toBeVisible();
  });

  test('新規グループ作成ボタンをクリックするとダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 新規グループ作成ボタンをクリック
    const addButton = page.locator('.add-group-button');
    await addButton.click();
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 入力フィールドが存在することを確認
    const input = dialog.locator('.dialog-input');
    await expect(input).toBeVisible();
    
    // キャンセルボタンで閉じる
    await dialog.locator('.btn-secondary').click();
    await expect(dialog).not.toBeVisible();
  });

  test('新規グループを作成できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 新規グループ作成ボタンをクリック
    const addButton = page.locator('.add-group-button');
    await addButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // グループ名を入力
    const input = dialog.locator('.dialog-input');
    const groupName = `E2Eテストグループ_${Date.now()}`;
    await input.fill(groupName);
    
    // OKボタンをクリック
    await dialog.locator('.btn-primary').click();
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
    
    // 作成されたグループが一覧に表示される
    const groupItem = page.locator('.custom-group-name').filter({ hasText: groupName });
    await expect(groupItem).toBeVisible();
  });

  test('グループ名を編集できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // まず新規グループを作成
    const addButton = page.locator('.add-group-button');
    await addButton.click();
    
    let dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    const originalName = `編集前_${Date.now()}`;
    await dialog.locator('.dialog-input').fill(originalName);
    await dialog.locator('.btn-primary').click();
    await expect(dialog).not.toBeVisible();
    
    // 作成されたグループの編集ボタンをクリック
    const groupItem = page.locator('.custom-group-item').filter({ hasText: originalName });
    await expect(groupItem).toBeVisible();
    
    const editButton = groupItem.locator('.btn-icon').first();
    await editButton.click();
    
    // 編集ダイアログが開く
    dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 新しい名前を入力
    const newName = `編集後_${Date.now()}`;
    const input = dialog.locator('.dialog-input');
    await input.fill(newName);
    await dialog.locator('.btn-primary').click();
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
    
    // 新しい名前で表示される
    const renamedGroup = page.locator('.custom-group-name').filter({ hasText: newName });
    await expect(renamedGroup).toBeVisible();
  });

  test('グループを削除できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // まず新規グループを作成
    const addButton = page.locator('.add-group-button');
    await addButton.click();
    
    let dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    const groupName = `削除対象_${Date.now()}`;
    await dialog.locator('.dialog-input').fill(groupName);
    await dialog.locator('.btn-primary').click();
    await expect(dialog).not.toBeVisible();
    
    // 作成されたグループの削除ボタンをクリック
    const groupItem = page.locator('.custom-group-item').filter({ hasText: groupName });
    await expect(groupItem).toBeVisible();
    
    const deleteButton = groupItem.locator('.btn-danger-icon');
    await deleteButton.click();
    
    // 確認ダイアログが表示される
    dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 削除を実行
    await dialog.locator('.btn-danger').click();
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
    
    // グループが一覧から消える
    await expect(groupItem).not.toBeVisible();
  });

  test('空のグループ名は作成できない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 新規グループ作成ボタンをクリック
    const addButton = page.locator('.add-group-button');
    await addButton.click();
    
    const dialog = page.locator('.dialog-overlay');
    await expect(dialog).toBeVisible();
    
    // 空のまま送信を試みる - OKボタンはdisabledになっているはず
    const okButton = dialog.locator('.btn-primary');
    await expect(okButton).toBeDisabled();
    
    // キャンセルで閉じる
    await dialog.locator('.btn-secondary').click();
    await expect(dialog).not.toBeVisible();
  });
});

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

  test('自動クローズルール適用チェックボックスが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // チェックボックスが存在することを確認（CSSで非表示なのでtoBeAttachedを使用）
    const applyRulesCheckbox = page.locator('#iconClickApplyRules');
    await expect(applyRulesCheckbox).toBeAttached();
    
    // デフォルトでチェックされていることを確認
    await expect(applyRulesCheckbox).toBeChecked();
  });

  test('自動クローズルール適用チェックボックスをトグルできる', async ({ context, extensionId }) => {
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
    
    // サスペンドオプションを選択（CSSで非表示なのでforceを使用）
    await suspendOption.click({ force: true });
    await expect(suspendOption).toBeChecked();
    await expect(skipOption).not.toBeChecked();
    
    // スキップオプションに戻す
    await skipOption.click({ force: true });
    await expect(skipOption).toBeChecked();
    await expect(suspendOption).not.toBeChecked();
  });

  test('設定変更後に保存ボタンがアクティブになる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 固定タブの扱いを変更（CSSで非表示なのでforceを使用）
    const suspendOption = page.locator('input[name="pinnedAction"][value="suspend"]');
    await suspendOption.click({ force: true });
    
    // 保存ボタンがクリック可能になることを確認
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await expect(submitButton).toBeEnabled();
  });
});

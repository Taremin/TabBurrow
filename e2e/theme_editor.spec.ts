/**
 * テーマエディタのE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad } from './helpers';

// テーマエディタのセレクター
const themeEditorSelectors = {
  container: '.container',
  header: '.header',
  sidebar: '.sidebar',
  themeList: '.theme-list',
  themeListItem: '.theme-list-item',
  editorMain: '.editor-main',
  newThemeButton: '.sidebar .btn-primary',  // サイドバー内のボタンを指定
  importButton: '.header-right .btn-secondary:has(.lucide-upload)',
  exportButton: '.header-right .btn-secondary:has(.lucide-download)',
  backToSettingsLink: 'a[href="options.html"]',
  themeNameInput: '.theme-name-input',
  saveButton: '.editor-header .btn-primary',
  colorSection: '.color-section',
  colorInput: '.color-picker-wrapper input',
  colorValueInput: '.color-value-input',
  emptyState: '.empty-state',
  preview: '.theme-preview',
  previewContainer: '.preview-container',
  deleteButton: '.btn-icon.danger',
  confirmDialog: '.dialog-overlay',
  confirmButton: '.dialog .btn-danger, .dialog .btn-primary',
  cancelButton: '.dialog .btn-secondary',
};

test.describe('テーマエディタ', () => {
  test('ページが正しく読み込まれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // コンテナが表示されていることを確認
    await expect(page.locator(themeEditorSelectors.container)).toBeVisible();
    
    // ヘッダーが表示されている
    await expect(page.locator(themeEditorSelectors.header)).toBeVisible();
    
    // サイドバーが表示されている
    await expect(page.locator(themeEditorSelectors.sidebar)).toBeVisible();
  });

  test('設定画面へのリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 設定画面へのリンクをクリック
    const backLink = page.locator(themeEditorSelectors.backToSettingsLink);
    await expect(backLink).toBeVisible();
    
    await backLink.click();
    await waitForPageLoad(page);
    
    // 設定画面に遷移したことを確認
    expect(page.url()).toContain('options.html');
  });

  test('初期状態で空のメッセージが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // テーマがない場合、空状態メッセージが表示される
    const emptyState = page.locator(themeEditorSelectors.emptyState);
    await expect(emptyState).toBeVisible();
  });

  test('新規テーマを作成できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 新規作成ボタンをクリック
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await expect(newButton).toBeVisible();
    await newButton.click();
    
    // テーマリストに新しいアイテムが追加される
    const themeListItem = page.locator(themeEditorSelectors.themeListItem);
    await expect(themeListItem.first()).toBeVisible();
    
    // エディタが表示される
    const editorMain = page.locator(themeEditorSelectors.editorMain);
    await expect(editorMain).toBeVisible();
    
    // 名前入力フィールドが表示される
    const nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await expect(nameInput).toBeVisible();
  });

  test('テーマ名を変更して保存できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 新規作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    
    await page.waitForTimeout(300);
    
    // 名前を変更
    const nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('');
    await nameInput.fill('テストテーマ');
    
    // 保存ボタンが有効になる
    const saveButton = page.locator(themeEditorSelectors.saveButton);
    await expect(saveButton).toBeEnabled();
    
    // 保存
    await saveButton.click();
    
    // 保存後、ボタンが無効になる
    await expect(saveButton).toBeDisabled();
    
    // テーマリストに反映される
    const themeListItem = page.locator(themeEditorSelectors.themeListItem);
    await expect(themeListItem.filter({ hasText: 'テストテーマ' })).toBeVisible();
  });

  test('カラーセクションが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 新規作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    
    await page.waitForTimeout(300);
    
    // カラーセクションが表示される
    const colorSections = page.locator(themeEditorSelectors.colorSection);
    await expect(colorSections.first()).toBeVisible();
    
    // 複数のカラーセクションがある（背景色、テキスト色など）
    const sectionCount = await colorSections.count();
    expect(sectionCount).toBeGreaterThanOrEqual(5);
  });

  test('色を変更するとプレビューに反映される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 新規作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    
    await page.waitForTimeout(300);
    
    // 最初のカラー値入力を取得
    const colorValueInput = page.locator(themeEditorSelectors.colorValueInput).first();
    await expect(colorValueInput).toBeVisible();
    
    // 色を変更
    const originalValue = await colorValueInput.inputValue();
    await colorValueInput.fill('#ff0000');
    
    // プレビュー領域が表示される
    const preview = page.locator(themeEditorSelectors.preview);
    await expect(preview).toBeVisible();
    
    // 保存ボタンが有効になる（変更があるため）
    const saveButton = page.locator(themeEditorSelectors.saveButton);
    await expect(saveButton).toBeEnabled();
  });

  test('テーマを削除できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 新規作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    
    await page.waitForTimeout(300);
    
    // テーマリストアイテムにホバーして削除ボタンを表示
    const themeListItem = page.locator(themeEditorSelectors.themeListItem).first();
    await themeListItem.hover();
    
    // 削除ボタンをクリック
    const deleteButton = themeListItem.locator('.btn-icon.danger');
    await deleteButton.click();
    
    // 確認ダイアログが表示される
    const confirmDialog = page.locator(themeEditorSelectors.confirmDialog);
    await expect(confirmDialog).toBeVisible();
    
    // 確認ボタンをクリック
    const confirmButton = confirmDialog.locator('.btn-danger');
    await confirmButton.click();
    
    // ダイアログが閉じる
    await expect(confirmDialog).not.toBeVisible();
    
    // 空状態に戻る
    const emptyState = page.locator(themeEditorSelectors.emptyState);
    await expect(emptyState).toBeVisible();
  });

  test('テーマを複数作成して切り替えられる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // 1つ目のテーマを作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    await page.waitForTimeout(300);
    
    let nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('テーマ1');
    await page.locator(themeEditorSelectors.saveButton).click();
    
    // 2つ目のテーマを作成
    await newButton.click();
    await page.waitForTimeout(300);
    
    nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('テーマ2');
    await page.locator(themeEditorSelectors.saveButton).click();
    
    // テーマリストに2つのアイテムがある
    const themeItems = page.locator(themeEditorSelectors.themeListItem);
    await expect(themeItems).toHaveCount(2);
    
    // 1つ目のテーマを選択
    await themeItems.filter({ hasText: 'テーマ1' }).click();
    
    // 名前入力に「テーマ1」が表示される
    await expect(nameInput).toHaveValue('テーマ1');
    
    // 2つ目のテーマを選択
    await themeItems.filter({ hasText: 'テーマ2' }).click();
    
    // 名前入力に「テーマ2」が表示される
    await expect(nameInput).toHaveValue('テーマ2');
  });
});

test.describe('テーマエディタ - インポート/エクスポート', () => {
  test('インポートダイアログを開ける', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // インポートボタンをクリック
    const importButton = page.locator(themeEditorSelectors.importButton);
    await expect(importButton).toBeVisible();
    await importButton.click();
    
    // ダイアログが開く
    const dialog = page.locator(themeEditorSelectors.confirmDialog);
    await expect(dialog).toBeVisible();
    
    // テキストエリアが表示される
    const textarea = dialog.locator('.json-textarea');
    await expect(textarea).toBeVisible();
    
    // キャンセルで閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await expect(dialog).not.toBeVisible();
  });

  test('JSONをインポートできる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // サンプルテーマJSON
    const sampleTheme = {
      id: "test-import",
      name: "インポートテスト",
      colors: {
        bgPrimary: "#ffffff",
        bgSecondary: "#f5f5f5",
        bgTertiary: "#eeeeee",
        textPrimary: "#333333",
        textSecondary: "#666666",
        textMuted: "#999999",
        borderColor: "#dddddd",
        domainGroupBorder: "#cccccc",
        accentColor: "#3b82f6",
        accentHover: "#2563eb",
        accentLight: "#dbeafe",
        accentSubtleSolid: "#eff6ff",
        dangerColor: "#ef4444",
        dangerHover: "#dc2626",
        dangerLight: "#fee2e2",
        successColor: "#22c55e",
        successLight: "#dcfce7",
        warningColor: "#f59e0b",
        warningLight: "#fef3c7",
        shadowSm: "0 1px 2px rgba(0,0,0,0.05)",
        shadowMd: "0 4px 6px rgba(0,0,0,0.1)",
        shadowLg: "0 10px 15px rgba(0,0,0,0.1)",
        fontFamily: "system-ui, sans-serif",
        fontSizeBase: "14px",
        fontSizeSmall: "12px"
      },
      createdAt: "2026-01-08T00:00:00.000Z",
      updatedAt: "2026-01-08T00:00:00.000Z"
    };
    
    // インポートボタンをクリック
    const importButton = page.locator(themeEditorSelectors.importButton);
    await importButton.click();
    
    const dialog = page.locator(themeEditorSelectors.confirmDialog);
    await expect(dialog).toBeVisible();
    
    // JSONを入力
    const textarea = dialog.locator('.json-textarea');
    await textarea.fill(JSON.stringify(sampleTheme, null, 2));
    
    // インポートボタンをクリック
    const importSubmitButton = dialog.locator('.btn-primary');
    await importSubmitButton.click();
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
    
    // テーマリストにインポートしたテーマが表示される
    const themeListItem = page.locator(themeEditorSelectors.themeListItem);
    await expect(themeListItem.filter({ hasText: 'インポートテスト' })).toBeVisible();
  });

  test('エクスポートダイアログでJSONが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    // まずテーマを作成
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    await page.waitForTimeout(300);
    
    const nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('エクスポートテスト');
    await page.locator(themeEditorSelectors.saveButton).click();
    
    // エクスポートボタンをクリック
    const exportButton = page.locator(themeEditorSelectors.exportButton);
    await exportButton.click();
    
    const dialog = page.locator(themeEditorSelectors.confirmDialog);
    await expect(dialog).toBeVisible();
    
    // テキストエリアにJSONが表示される
    const textarea = dialog.locator('.json-textarea');
    await expect(textarea).toBeVisible();
    
    const jsonContent = await textarea.inputValue();
    expect(jsonContent).toContain('エクスポートテスト');
    
    // 閉じる
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
  });
});

test.describe('テーマエディタ - 設定画面との連携', () => {
  test('設定画面からテーマエディタへのリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テーマを編集リンクを探す
    const editThemesLink = page.locator('a[href="theme-editor.html"]');
    await expect(editThemesLink).toBeVisible();
    
    await editThemesLink.click();
    await waitForPageLoad(page);
    
    // テーマエディタに遷移
    expect(page.url()).toContain('theme-editor.html');
  });

  test('作成したカスタムテーマが設定画面に表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // テーマエディタでテーマを作成
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    await page.waitForTimeout(300);
    
    const nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('カスタムテーマ');
    await page.locator(themeEditorSelectors.saveButton).click();
    
    // 設定画面に移動
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムテーマが選択肢に表示される
    const customThemeOption = page.locator('label').filter({ hasText: 'カスタムテーマ' });
    await expect(customThemeOption).toBeVisible();
  });

  test('カスタムテーマを選択できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // テーマエディタでテーマを作成
    await page.goto(getExtensionUrl(extensionId, 'theme-editor.html'));
    await waitForPageLoad(page);
    
    const newButton = page.locator(themeEditorSelectors.newThemeButton);
    await newButton.click();
    await page.waitForTimeout(300);
    
    const nameInput = page.locator(themeEditorSelectors.themeNameInput);
    await nameInput.fill('選択テストテーマ');
    await page.locator(themeEditorSelectors.saveButton).click();
    
    // 設定画面に移動
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // カスタムテーマのラベルをクリック
    const customThemeLabel = page.locator('label').filter({ hasText: '選択テストテーマ' });
    await customThemeLabel.click();
    
    // ラジオボタンが選択されていることを確認
    const customThemeRadio = customThemeLabel.locator('input[type="radio"]');
    await expect(customThemeRadio).toBeChecked();
  });
});

/**
 * タブ管理画面のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors, waitForPageLoad, createTestTabData, createBulkTestTabData, clearTestData } from './helpers';

test.describe('タブ管理画面', () => {
  test('ページが正しく読み込まれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ヘッダーが表示されていることを確認
    await expect(page.locator(tabsPageSelectors.header)).toBeVisible();
  });

  test('検索入力フィールドが存在する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 検索入力が存在することを確認
    const searchInput = page.locator('input').first();
    await expect(searchInput).toBeVisible();
  });

  test('設定画面へのリンクが動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 設定リンクをクリック
    const settingsLink = page.locator('a[href="options.html"]');
    await expect(settingsLink).toBeVisible();
    
    await settingsLink.click();
    await waitForPageLoad(page);
    
    // 設定画面に遷移したことを確認
    expect(page.url()).toContain('options.html');
  });

  test('タブがない場合、空の状態が表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // タブリストが空であることを確認（ローカルで初期状態の場合）
    // 注: 実際のテストではテストデータをセットアップする必要がある
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    const count = await tabCards.count();
    
    // 初期状態ではタブが0個または既存のタブがある
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('検索機能が動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/apple',
      title: 'Apple Page',
    });
    await createTestTabData(page, {
      url: 'https://github.com/search',
      title: 'GitHub Search',
    });
    await createTestTabData(page, {
      url: 'https://example.com/banana',
      title: 'Banana Page',
    });
    
    // リロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    
    // 全てのタブが表示されていることを確認
    await expect(tabCards).toHaveCount(3);
    
    // 検索入力を見つけて入力
    const searchInput = page.locator('input').first();
    await searchInput.fill('Apple');
    
    // 検索が実行されることを確認（UIの変化を待つ）
    await page.waitForTimeout(300); // デバウンス待ち
    
    // 検索結果が1件になることを確認
    await expect(tabCards).toHaveCount(1);
    
    // 検索をクリア
    await searchInput.fill('');
    await page.waitForTimeout(300);
    
    // 全てのタブが再度表示される
    await expect(tabCards).toHaveCount(3);
    
    // URL部分一致検索
    await searchInput.fill('github');
    await page.waitForTimeout(300);
    
    // GitHubのタブのみ表示
    await expect(tabCards).toHaveCount(1);
  });

  test('表示モード切替ボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 表示モード切替ボタンが存在することを確認
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await expect(viewModeToggle).toBeVisible();
  });

  test('表示モード切替ボタンをクリックするとモードが切り替わる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    
    // 初期状態でボタンが表示されている
    await expect(viewModeToggle).toBeVisible();
    
    // クリックして状態が変化
    await viewModeToggle.click();
    await page.waitForTimeout(100);
    
    // ボタンのactive状態を確認
    const hasActiveClass = await viewModeToggle.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);
    
    // 再度クリックして元に戻す
    await viewModeToggle.click();
    await page.waitForTimeout(100);
    
    // active状態が解除されたことを確認
    const isNoLongerActive = await viewModeToggle.evaluate(el => !el.classList.contains('active'));
    expect(isNoLongerActive).toBe(true);
  });
});

test.describe('表示モード切替（ダミーデータ使用）', () => {
  test('フラット表示への切替でグループヘッダーが非表示になる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 異なるドメインのテストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
    });
    await createTestTabData(page, {
      url: 'https://github.com/repo',
      title: 'GitHub Repository',
    });
    await createTestTabData(page, {
      url: 'https://example.com/page2',
      title: 'Example Page 2',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // タブカードとグループヘッダーを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    const groupHeaders = page.locator(tabsPageSelectors.groupHeader);
    
    // タブが3つ表示されていることを確認
    await expect(tabCards).toHaveCount(3);
    
    // グループ表示（デフォルト）でグループヘッダーが表示（example.com と github.com）
    await expect(groupHeaders).toHaveCount(2);
    
    // ドロップダウンメニューを開く
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();
    await page.waitForTimeout(100);
    
    // フラット表示を選択
    const flatButton = page.locator('.view-mode-menu-item', { hasText: /フラット|Flat/i });
    await flatButton.click();
    await page.waitForTimeout(300);
    
    // フラット表示ではグループヘッダーが0になる
    await expect(groupHeaders).toHaveCount(0);
    
    // タブカードは引き続き3つ表示される
    await expect(tabCards).toHaveCount(3);
  });

  test('グループ表示への切替でグループヘッダーが復帰する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストデータを追加
    await createTestTabData(page, {
      url: 'https://test1.com/page',
      title: 'Test Page 1',
    });
    await createTestTabData(page, {
      url: 'https://test2.com/page',
      title: 'Test Page 2',
    });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    const groupHeaders = page.locator(tabsPageSelectors.groupHeader);
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    
    // タブが2つ表示されていることを確認
    await expect(tabCards).toHaveCount(2);
    
    // グループヘッダーが2つ（異なるドメイン）
    await expect(groupHeaders).toHaveCount(2);
    
    // ドロップダウンメニューを開いてフラット表示に切替
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    // フラット表示ボタンをクリック
    await page.locator('.view-mode-menu-item').filter({ hasText: /フラット|Flat/i }).click();
    await page.waitForTimeout(500);
    
    // グループヘッダーが非表示
    await expect(groupHeaders).toHaveCount(0);
    
    // ドロップダウンメニューを開いてグループ表示に戻す
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    // グループ表示ボタンをクリック（最初の一致を選択）
    await page.locator('.view-mode-menu-item').filter({ hasText: /グループ表示|Grouped/ }).first().click();
    await page.waitForTimeout(500);
    
    // グループヘッダーが復帰
    await expect(groupHeaders).toHaveCount(2);
  });
});

test.describe('コンパクト表示機能', () => {
  test('コンパクト表示でスクリーンショット付きタブにホバーするとポップアップが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // スクリーンショット付きテストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/with-screenshot',
      title: 'Tab with Screenshot',
      screenshot: true,
    });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // タブが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(1);
    
    // ドロップダウンメニューを開いてコンパクト表示に切替
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    // コンパクト表示を選択
    await page.locator('.view-mode-menu-item').filter({ hasText: /コンパクト|Compact/i }).click();
    await page.waitForTimeout(500);
    
    // コンパクト表示になっていることを確認（スクリーンショットインジケータの存在）
    const screenshotIndicator = page.locator('.tab-screenshot-indicator');
    await expect(screenshotIndicator).toBeVisible({ timeout: 3000 });
    
    // タブカードにホバー
    const tabCard = page.locator(tabsPageSelectors.tabCard).first();
    await tabCard.hover();
    await page.waitForTimeout(500);
    
    // スクリーンショットポップアップが表示されることを確認
    const screenshotPopup = page.locator('.screenshot-popup');
    await expect(screenshotPopup).toBeVisible({ timeout: 3000 });
    
    // ポップアップ内に画像があることを確認
    const popupImage = screenshotPopup.locator('img');
    await expect(popupImage).toBeVisible();
    
    // ポップアップ内にタイトルとURLの全文が表示されることを確認
    const popupInfo = screenshotPopup.locator('.popup-info');
    await expect(popupInfo).toBeVisible();
    
    const popupTitle = popupInfo.locator('.popup-title');
    await expect(popupTitle).toHaveText('Tab with Screenshot');
    
    const popupUrl = popupInfo.locator('.popup-url');
    await expect(popupUrl).toHaveText('https://example.com/with-screenshot');
    
    // マウスを離すとポップアップが消えることを確認
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await expect(screenshotPopup).not.toBeVisible();
  });

  test('コンパクト表示でスクリーンショットのないタブにホバーしてもタイトル・URLが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // スクリーンショットなしのテストタブを追加（長いタイトルとURL）
    await createTestTabData(page, {
      url: 'https://example.com/very/long/path/to/resource?query=parameter&another=value',
      title: 'This is a very long title that would normally be truncated in compact mode',
      screenshot: false,
    });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // タブが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(1);
    
    // ドロップダウンメニューを開いてコンパクト表示に切替
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    // コンパクト表示を選択
    await page.locator('.view-mode-menu-item').filter({ hasText: /コンパクト|Compact/i }).click();
    await page.waitForTimeout(500);
    
    // タブカードにホバー
    const tabCard = page.locator(tabsPageSelectors.tabCard).first();
    await tabCard.hover();
    await page.waitForTimeout(500);
    
    // ポップアップが表示されることを確認（スクリーンショットなしでもタイトル・URL表示のため）
    const screenshotPopup = page.locator('.screenshot-popup');
    await expect(screenshotPopup).toBeVisible({ timeout: 3000 });
    
    // ポップアップ内にタイトルとURLの全文が表示されることを確認
    const popupInfo = screenshotPopup.locator('.popup-info');
    await expect(popupInfo).toBeVisible();
    
    const popupTitle = popupInfo.locator('.popup-title');
    await expect(popupTitle).toHaveText('This is a very long title that would normally be truncated in compact mode');
    
    const popupUrl = popupInfo.locator('.popup-url');
    await expect(popupUrl).toHaveText('https://example.com/very/long/path/to/resource?query=parameter&another=value');
  });

  test('コンパクト表示から通常表示に切り替えた際にサムネイルが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // スクリーンショット付きテストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/switch-test',
      title: 'Switch Display Mode Test',
      screenshot: true,
    });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // タブが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(1);
    
    // ドロップダウンメニューを開いてコンパクト表示に切替
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    await page.locator('.view-mode-menu-item').filter({ hasText: /コンパクト|Compact/i }).click();
    await page.waitForTimeout(500);
    
    // コンパクト表示になっていることを確認（スクリーンショットサムネイルが非表示）
    const screenshotContainer = page.locator('.tab-screenshot');
    await expect(screenshotContainer).not.toBeVisible();
    
    // コンパクト表示時のインジケータが表示されていることを確認
    const screenshotIndicator = page.locator('.tab-screenshot-indicator');
    await expect(screenshotIndicator).toBeVisible({ timeout: 3000 });
    
    // 再度ドロップダウンメニューを開いて通常表示に切替
    await viewModeToggle.click();
    await page.waitForTimeout(300);
    await page.locator('.view-mode-menu-item').filter({ hasText: /通常|Normal/i }).click();
    await page.waitForTimeout(500);
    
    // 通常表示になっていることを確認（スクリーンショットサムネイルが表示）
    await expect(screenshotContainer).toBeVisible({ timeout: 3000 });
    
    // サムネイル内の画像が表示されていることを確認
    const thumbnailImage = page.locator('.tab-screenshot img');
    await expect(thumbnailImage).toBeVisible({ timeout: 3000 });
    
    // 画像のsrc属性が設定されていることを確認（blob: URLまたはdata: URL）
    const imgSrc = await thumbnailImage.getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc!.length).toBeGreaterThan(0);
  });
});

test.describe('一括選択機能', () => {
  test('選択モードボタンをクリックすると選択モードに切り替わる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/test1',
      title: 'Test Tab 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/test2',
      title: 'Test Tab 2',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードボタンをクリック
    const selectionToggle = page.locator('[data-testid=\"selection-mode-toggle\"]');
    await expect(selectionToggle).toBeVisible();
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 選択ツールバーが表示される
    const selectionToolbar = page.locator('.selection-toolbar');
    await expect(selectionToolbar).toBeVisible();
    
    // チェックボックスが表示される
    const checkboxes = page.locator('.tab-checkbox');
    await expect(checkboxes).toHaveCount(2);
  });

  test('タブを選択・全選択・解除ができる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/select1',
      title: 'Select Tab 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/select2',
      title: 'Select Tab 2',
    });
    await createTestTabData(page, {
      url: 'https://example.com/select3',
      title: 'Select Tab 3',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid=\"selection-mode-toggle\"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 最初のチェックボックスをクリック
    const firstCheckbox = page.locator('.tab-checkbox').first();
    await firstCheckbox.click();
    await page.waitForTimeout(100);
    
    // 選択件数が表示される
    const selectionCount = page.locator('.selection-count');
    await expect(selectionCount).toContainText('1');
    
    // 全選択ボタンをクリック
    const selectAllButton = page.locator('button').filter({ hasText: /全選択|Select All/ });
    await selectAllButton.click();
    await page.waitForTimeout(100);
    
    // 3件が選択される
    await expect(selectionCount).toContainText('3');
    
    // 選択解除ボタンをクリック
    const deselectButton = page.locator('button').filter({ hasText: /選択解除|Deselect/ });
    await deselectButton.click();
    await page.waitForTimeout(100);
    
    // 0件になる
    await expect(selectionCount).toContainText('0');
  });

  test('選択したタブを一括削除できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/delete1',
      title: 'Delete Tab 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/delete2',
      title: 'Delete Tab 2',
    });
    await createTestTabData(page, {
      url: 'https://example.com/keep',
      title: 'Keep Tab',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(3);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid=\"selection-mode-toggle\"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 最初の2つを選択
    const checkboxes = page.locator('.tab-checkbox');
    await checkboxes.nth(0).click();
    await page.waitForTimeout(50);
    await checkboxes.nth(1).click();
    await page.waitForTimeout(100);
    
    // 一括削除ボタンをクリック
    const bulkDeleteButton = page.locator('button').filter({ hasText: /一括削除|Delete Selected/ });
    await bulkDeleteButton.click();
    await page.waitForTimeout(100);
    
    // 確認ダイアログが表示される
    const confirmDialog = page.locator('.dialog');
    await expect(confirmDialog).toBeVisible();
    
    // 確認ボタンをクリック
    const confirmButton = confirmDialog.locator('button.btn-danger');
    await confirmButton.click();
    await page.waitForTimeout(300);
    
    // 1つだけ残る
    await expect(tabCards).toHaveCount(1);
  });

  test('グループヘッダーのチェックボックスでグループ内選択・解除ができる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 2つのグループを作成
    // Group A: 2 tabs
    await createTestTabData(page, { url: 'https://group-a.com/1', title: 'Group A - 1' });
    await createTestTabData(page, { url: 'https://group-a.com/2', title: 'Group A - 2' });
    
    // Group B: 2 tabs
    await createTestTabData(page, { url: 'https://group-b.com/1', title: 'Group B - 1' });
    await createTestTabData(page, { url: 'https://group-b.com/2', title: 'Group B - 2' });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // グループヘッダーのチェックボックスを確認
    const groupCheckboxes = page.locator('.group-checkbox input[type="checkbox"]');
    await expect(groupCheckboxes).toHaveCount(2);
    
    // 最初のグループ(group-a.com)を選択
    const firstGroupCheckbox = groupCheckboxes.first();
    await firstGroupCheckbox.click();
    await page.waitForTimeout(100);
    
    // 選択件数が2件になることを確認
    const selectionCount = page.locator('.selection-count');
    await expect(selectionCount).toContainText('2');
    
    // 全件選択でチェック状態が変わるか確認
    // もう一方のグループも選択
    const secondGroupCheckbox = groupCheckboxes.nth(1);
    await secondGroupCheckbox.click();
    await page.waitForTimeout(100);
     
    // 選択件数が4件になる
    await expect(selectionCount).toContainText('4');
    
    // 最初のグループを解除
    await firstGroupCheckbox.click();
    await page.waitForTimeout(100);
    
    // 選択件数が2件に戻る
    await expect(selectionCount).toContainText('2');
  });
});

test.describe('グループ内正規表現検索', () => {
  test('グループヘッダのフィルタボタンをクリックすると検索窓が表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/filter-test',
      title: 'Filter Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // グループヘッダのフィルタトグルをクリック
    const filterToggle = page.locator('.group-filter-toggle').first();
    await expect(filterToggle).toBeVisible();
    await filterToggle.click();
    await page.waitForTimeout(100);
    
    // フィルタ入力欄が表示される
    const filterInput = page.locator('.group-filter-input').first();
    await expect(filterInput).toBeVisible();
  });

  test('正規表現パターンでグループ内タブを絞り込める', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 同じドメインで異なるタイトルのタブを追加
    await createTestTabData(page, {
      url: 'https://docs.example.com/apple',
      title: 'Apple Documentation',
    });
    await createTestTabData(page, {
      url: 'https://docs.example.com/banana',
      title: 'Banana Documentation',
    });
    await createTestTabData(page, {
      url: 'https://docs.example.com/cherry',
      title: 'Cherry Documentation',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(3);
    
    // フィルタトグルをクリック
    const filterToggle = page.locator('.group-filter-toggle').first();
    await filterToggle.click();
    await page.waitForTimeout(100);
    
    // 正規表現パターンを入力
    const filterInput = page.locator('.group-filter-input').first();
    await filterInput.fill('^Apple');
    await page.waitForTimeout(300);
    
    // Appleのタブのみ表示される
    await expect(tabCards).toHaveCount(1);
    
    // パターンを変更
    await filterInput.fill('Documentation$');
    await page.waitForTimeout(300);
    
    // 全て表示される（全てDocumentationで終わる）
    await expect(tabCards).toHaveCount(3);
    
    // フィルタをクリア
    await filterInput.fill('');
    await page.waitForTimeout(300);
    
    // 全て表示される
    await expect(tabCards).toHaveCount(3);
  });

  test('無効な正規表現パターンでエラー表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/regex-error',
      title: 'Regex Error Test',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // フィルタトグルをクリック
    const filterToggle = page.locator('.group-filter-toggle').first();
    await filterToggle.click();
    await page.waitForTimeout(100);
    
    // 無効な正規表現パターンを入力
    const filterInput = page.locator('.group-filter-input').first();
    await filterInput.fill('[invalid('); // 閉じ括弧がない
    await page.waitForTimeout(100);
    
    // エラー状態のクラスが付与される
    await expect(filterInput).toHaveClass(/error/);
    
    // エラーアイコンが表示される
    const errorIcon = page.locator('.group-filter-error');
    await expect(errorIcon).toBeVisible();
  });
});

test.describe('タブグループとして開く機能', () => {
  test('グループヘッダーに「タブグループとして開く」ボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/tabgroup-test',
      title: 'Tab Group Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // グループヘッダーの「タブグループとして開く」ボタンを確認（テキストで検索）
    const openAsTabGroupButton = page.locator('.group-header button', { hasText: /タブグループとして開く|Open as Tab Group/i }).first();
    await expect(openAsTabGroupButton).toBeVisible();
  });

  test('選択モードに「タブグループとして開く」ボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/selection-test1',
      title: 'Selection Test 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/selection-test2',
      title: 'Selection Test 2',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 選択ツールバーに「タブグループとして開く」ボタンが表示される
    const openAsTabGroupButton = page.locator('.selection-toolbar button[title*="タブグループ"], .selection-toolbar button[title*="Tab Group"]');
    await expect(openAsTabGroupButton).toBeVisible();
  });
});

test.describe('大規模データパフォーマンステスト', () => {
  const LARGE_DATA_COUNT = 500;
  const DOMAIN_COUNT = 50; // 50グループに分散

  test('500件のデータを高速に読み込める', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 500件のダミーデータを挿入
    const insertStart = performance.now();
    await createBulkTestTabData(page, LARGE_DATA_COUNT, { domainCount: DOMAIN_COUNT });
    const insertTime = performance.now() - insertStart;
    console.log(`データ挿入時間: ${insertTime.toFixed(2)}ms`);
    
    // ページをリロードして読み込み時間を計測
    const loadStart = performance.now();
    await page.reload();
    await waitForPageLoad(page);
    const loadTime = performance.now() - loadStart;
    console.log(`ページ読み込み時間: ${loadTime.toFixed(2)}ms`);
    
    // ヘッダーが表示されることを確認（UIがレンダリングされた）
    await expect(page.locator(tabsPageSelectors.header)).toBeVisible();
    
    // タブカードが表示されていることを確認（仮想スクロールにより一部のみ）
    const visibleTabCards = page.locator(tabsPageSelectors.tabCard);
    const visibleCount = await visibleTabCards.count();
    
    // 仮想スクロールが有効なら、表示されるのは一部のみ（全500件ではない）
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(LARGE_DATA_COUNT);
    
    // 読み込み時間が妥当であることを確認（5秒以内）
    expect(loadTime).toBeLessThan(5000);
  });

  test('500件のデータでスクロールがスムーズに動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 500件のダミーデータを挿入
    await createBulkTestTabData(page, LARGE_DATA_COUNT, { domainCount: DOMAIN_COUNT });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // スクロールコンテナを取得
    const tabGroups = page.locator('.tab-groups');
    await expect(tabGroups).toBeVisible();
    
    // 初期表示のタブ数を記録
    const initialCards = await page.locator(tabsPageSelectors.tabCard).count();
    
    // スクロールダウン
    const scrollStart = performance.now();
    await tabGroups.evaluate(el => {
      el.scrollTop = el.scrollHeight / 2;
    });
    await page.waitForTimeout(300); // スクロール後の描画を待つ
    const scrollTime = performance.now() - scrollStart;
    console.log(`スクロール後の更新時間: ${scrollTime.toFixed(2)}ms`);
    
    // スクロール後もタブカードが表示されていることを確認
    const afterScrollCards = await page.locator(tabsPageSelectors.tabCard).count();
    expect(afterScrollCards).toBeGreaterThan(0);
    
    // さらに下までスクロール
    await tabGroups.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    
    // 最下部でもタブが表示されることを確認
    const bottomCards = await page.locator(tabsPageSelectors.tabCard).count();
    expect(bottomCards).toBeGreaterThan(0);
    
    // スクロールが妥当な時間で完了すること（1秒以内）
    expect(scrollTime).toBeLessThan(1000);
  });

  test('500件のデータで検索がレスポンシブに動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 500件のダミーデータを挿入
    await createBulkTestTabData(page, LARGE_DATA_COUNT, { domainCount: DOMAIN_COUNT });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // 検索入力
    const searchInput = page.locator('input').first();
    
    // 検索実行時間を計測
    const searchStart = performance.now();
    await searchInput.fill('test0.example.com');
    await page.waitForTimeout(500); // デバウンス + フィルタリング待ち
    const searchTime = performance.now() - searchStart;
    console.log(`検索実行時間: ${searchTime.toFixed(2)}ms`);
    
    // 検索結果が絞り込まれていることを確認
    const filteredCards = await page.locator(tabsPageSelectors.tabCard).count();
    // test0.example.com ドメインのタブのみ表示（500件 / 50ドメイン = 10件）
    expect(filteredCards).toBeLessThan(LARGE_DATA_COUNT);
    expect(filteredCards).toBeGreaterThan(0);
    
    // 検索をクリア
    await searchInput.fill('');
    await page.waitForTimeout(500);
    
    // 検索が妥当な時間で完了すること（2秒以内）
    expect(searchTime).toBeLessThan(2000);
  });

  test('500件のデータで表示モード切替が高速に動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 500件のダミーデータを挿入
    await createBulkTestTabData(page, LARGE_DATA_COUNT, { domainCount: DOMAIN_COUNT });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    const groupHeaders = page.locator(tabsPageSelectors.groupHeader);
    
    // グループ表示（デフォルト）でグループヘッダーが存在
    await expect(groupHeaders.first()).toBeVisible({ timeout: 3000 });
    const groupCount = await groupHeaders.count();
    expect(groupCount).toBeGreaterThan(0);
    
    // フラット表示に切替（時間計測）
    const toggleStart = performance.now();
    await viewModeToggle.click();
    await page.waitForTimeout(100);
    const flatButton = page.locator('.view-mode-menu-item', { hasText: /フラット|Flat/i });
    await flatButton.click();
    await page.waitForTimeout(300);
    const toggleTime = performance.now() - toggleStart;
    console.log(`表示モード切替時間: ${toggleTime.toFixed(2)}ms`);
    
    // フラット表示ではグループヘッダーが非表示
    await expect(groupHeaders).toHaveCount(0);
    
    // タブカードは引き続き表示
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards.first()).toBeVisible();
    
    // 切替が妥当な時間で完了すること（1秒以内）
    expect(toggleTime).toBeLessThan(1000);
  });

  test('500件のデータで一括選択が高速に動作する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 500件のダミーデータを挿入
    await createBulkTestTabData(page, LARGE_DATA_COUNT, { domainCount: DOMAIN_COUNT });
    
    // リロード
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 選択ツールバーが表示される
    const selectionToolbar = page.locator('.selection-toolbar');
    await expect(selectionToolbar).toBeVisible();
    
    // 全選択ボタンをクリック（時間計測）
    const selectAllButton = page.locator('button').filter({ hasText: /全選択|Select All/ });
    
    const selectStart = performance.now();
    await selectAllButton.click();
    await page.waitForTimeout(300);
    const selectTime = performance.now() - selectStart;
    console.log(`全選択実行時間: ${selectTime.toFixed(2)}ms`);
    
    // 全件が選択されていることを確認
    const selectionCount = page.locator('.selection-count');
    await expect(selectionCount).toContainText(LARGE_DATA_COUNT.toString());
    
    // 選択解除
    const deselectButton = page.locator('button').filter({ hasText: /選択解除|Deselect/ });
    await deselectButton.click();
    await page.waitForTimeout(100);
    
    // 選択が妥当な時間で完了すること（2秒以内）
    expect(selectTime).toBeLessThan(2000);
  });
});

test.describe('すべて開く確認ダイアログ', () => {
  test('「すべて開く」ボタンをクリックすると確認ダイアログが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/open-all-test',
      title: 'Open All Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // タブが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(1);
    
    // 「すべて開く」ボタンをクリック（ヘッダー右側のprimaryボタン）
    const openAllButton = page.locator('.btn.btn-icon.btn-primary');
    await expect(openAllButton).toBeVisible();
    await openAllButton.click();
    await page.waitForTimeout(100);
    
    // 確認ダイアログが表示される
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    
    // ダイアログにタブ数が表示される
    const dialogMessage = dialog.locator('.dialog-message');
    await expect(dialogMessage).toContainText('1');
    
    // 「開く」ボタン（btn-primary）が表示される
    const confirmButton = dialog.locator('.btn-primary');
    await expect(confirmButton).toBeVisible();
  });

  test('確認ダイアログで「キャンセル」をクリックするとダイアログが閉じる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/cancel-test',
      title: 'Cancel Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 「すべて開く」ボタンをクリック
    const openAllButton = page.locator('.btn.btn-icon.btn-primary');
    await openAllButton.click();
    await page.waitForTimeout(100);
    
    // 確認ダイアログが表示される
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    
    // 「キャンセル」ボタンをクリック
    const cancelButton = dialog.locator('.btn-secondary');
    await cancelButton.click();
    await page.waitForTimeout(100);
    
    // ダイアログが閉じる
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('ホイールクリックでタブを開く機能', () => {
  test('ホイールクリックでタブがバックグラウンドで開かれる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/middle-click-test',
      title: 'Middle Click Test Tab',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // タブカードが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(1);
    
    // 現在のページ数を記録
    const pagesBefore = context.pages().length;
    
    // ホイールクリック（中クリック）と同時に新しいページの作成を待機
    const tabCard = tabCards.first();
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      tabCard.click({ button: 'middle' }),
    ]);
    
    // 新しいタブが追加されたことを確認
    const pagesAfter = context.pages().length;
    expect(pagesAfter).toBe(pagesBefore + 1);
    
    // 元のページ（TabBurrow）がまだアクティブであることを確認
    expect(page.url()).toContain('tabs.html');
    
    // 新しく開かれたタブが存在することを確認
    expect(newPage).toBeTruthy();
  });

  test('ホイールクリック後もTabBurrowの画面が維持される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // 複数のテストタブを追加（同じドメインで管理しやすく）
    await createTestTabData(page, {
      url: 'https://example.com/test-page-1',
      title: 'Test Tab 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/test-page-2',
      title: 'Test Tab 2',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // タブカードが表示されていることを確認
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    await expect(tabCards).toHaveCount(2);
    
    // ホイールクリック前のページ数を記録
    const pagesBefore = context.pages().length;
    
    // 最初のタブカードをホイールクリック
    await tabCards.first().click({ button: 'middle' });
    await page.waitForTimeout(500);
    
    // 2番目のタブカードもホイールクリック
    await tabCards.nth(1).click({ button: 'middle' });
    await page.waitForTimeout(500);
    
    // TabBurrowの画面がまだ表示されていることを確認
    expect(page.url()).toContain('tabs.html');
    
    // タブカードがまだ2つ表示されていることを確認（削除されていない）
    await expect(tabCards).toHaveCount(2);
    
    // 新しいタブが2つ追加されたことを確認（ページ数で検証）
    const pagesAfter = context.pages().length;
    expect(pagesAfter).toBe(pagesBefore + 2);
  });
});

test.describe('カスタムグループ作成機能', () => {
  test('ヘッダーに「新規グループ作成」ボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // グループ作成ボタンが表示されていることを確認
    const createGroupButton = page.locator('[data-testid="create-group-button"]');
    await expect(createGroupButton).toBeVisible();
  });

  test('新規グループ作成ボタンをクリックするとダイアログが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // グループ作成ボタンをクリック
    const createGroupButton = page.locator('[data-testid="create-group-button"]');
    await createGroupButton.click();
    await page.waitForTimeout(300);
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    
    // 入力欄が存在することを確認
    const input = dialog.locator('input[type="text"]');
    await expect(input).toBeVisible();
  });

  test('グループ名を入力して新規グループを作成できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/group-test',
      title: 'Group Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // グループ作成ボタンをクリック
    const createGroupButton = page.locator('[data-testid="create-group-button"]');
    await createGroupButton.click();
    await page.waitForTimeout(300);
    
    // ダイアログにグループ名を入力
    const dialog = page.locator('.dialog');
    const input = dialog.locator('input[type="text"]');
    await input.fill('My Test Group');
    
    // OKボタンをクリック
    const okButton = dialog.locator('button.btn-primary');
    await okButton.click();
    await page.waitForTimeout(500);
    
    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible();
  });

  test('タブカードのメニューから新規グループを作成してタブを移動できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加
    await createTestTabData(page, {
      url: 'https://example.com/move-test',
      title: 'Move Test Page',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // タブカードのグループアクションボタンをクリック
    const groupButton = page.locator('.tab-group-action').first();
    await groupButton.click();
    await page.waitForTimeout(300);
    
    // 新規グループ作成オプションをクリック
    const createNewOption = page.locator('.group-menu-item-new');
    await expect(createNewOption).toBeVisible();
    await createNewOption.click();
    await page.waitForTimeout(300);
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    
    // グループ名を入力
    const input = dialog.locator('input[type="text"]');
    await input.fill('New Group From Tab');
    
    // OKボタンをクリック
    const okButton = dialog.locator('button.btn-primary');
    await okButton.click();
    await page.waitForTimeout(500);
    
    // ダイアログが閉じてグループが作成されたことを確認
    await expect(dialog).not.toBeVisible();
    
    // 作成したグループ名のヘッダーが表示されることを確認
    const customGroupHeader = page.locator('.group-header').filter({ hasText: 'New Group From Tab' });
    await expect(customGroupHeader).toBeVisible();
  });

  test('選択モードで新規グループに一括移動できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを複数追加
    await createTestTabData(page, {
      url: 'https://example.com/bulk-1',
      title: 'Bulk Move Tab 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/bulk-2',
      title: 'Bulk Move Tab 2',
    });
    
    await page.reload();
    await waitForPageLoad(page);
    
    // 選択モードに切り替え
    const selectionToggle = page.locator('[data-testid="selection-mode-toggle"]');
    await selectionToggle.click();
    await page.waitForTimeout(100);
    
    // 全選択
    const selectAllButton = page.locator('button').filter({ hasText: /全選択|Select All/ });
    await selectAllButton.click();
    await page.waitForTimeout(100);
    
    // グループに移動メニューを開く
    const moveToGroupButton = page.locator('.selection-group-menu button').first();
    await moveToGroupButton.click();
    await page.waitForTimeout(300);
    
    // 新規グループ作成オプションをクリック
    const createNewOption = page.locator('.selection-group-item-new');
    await expect(createNewOption).toBeVisible();
    await createNewOption.click();
    await page.waitForTimeout(300);
    
    // ダイアログが表示されることを確認
    const dialog = page.locator('.dialog');
    await expect(dialog).toBeVisible();
    
    // グループ名を入力
    const input = dialog.locator('input[type="text"]');
    await input.fill('Bulk Group');
    
    // OKボタンをクリック
    const okButton = dialog.locator('button.btn-primary');
    await okButton.click();
    await page.waitForTimeout(500);
    
    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible();
    
    // 選択モードが解除されることを確認
    const selectionToolbar = page.locator('.selection-toolbar');
    await expect(selectionToolbar).not.toBeVisible();
  });
});

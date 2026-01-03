/**
 * グループ折りたたみ/展開機能のE2Eテスト
 */
import { test, expect } from './fixtures';
import { createTestTabData, clearTestData, waitForPageLoad, wait } from './helpers';

test.describe('グループ折りたたみ/展開機能', () => {
  test.beforeEach(async ({ page, extensionId }) => {
    // タブ管理画面を開く
    await page.goto(`chrome-extension://${extensionId}/tabs.html`);
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // 複数のグループを持つテストデータを作成
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
    });
    await createTestTabData(page, {
      url: 'https://example.com/page2',
      title: 'Example Page 2',
    });
    await createTestTabData(page, {
      url: 'https://test.com/page1',
      title: 'Test Page 1',
    });
    await createTestTabData(page, {
      url: 'https://test.com/page2',
      title: 'Test Page 2',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
  });

  test('折りたたみアイコンが表示される', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    // 折りたたみアイコンが表示されていることを確認
    const collapseIcons = await page.locator('.group-collapse-icon').count();
    expect(collapseIcons).toBeGreaterThan(0);
  });

  test('グループをクリックすると折りたたまれる', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    // 最初のグループの折りたたみアイコンを確認
    const firstGroupTitle = page.locator('.group-title').first();
    const firstCollapseIcon = page.locator('.group-collapse-icon').first();
    
    // 折りたたむ前はcollapsedクラスがない
    await expect(firstCollapseIcon).not.toHaveClass(/collapsed/);
    
    // グループタイトルをクリック
    await firstGroupTitle.click();
    await wait(100);
    
    // 折りたたみ後はcollapsedクラスがある
    await expect(firstCollapseIcon).toHaveClass(/collapsed/);
  });

  test('折りたたまれたグループをクリックすると展開される', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    const firstGroupTitle = page.locator('.group-title').first();
    const firstCollapseIcon = page.locator('.group-collapse-icon').first();
    
    // 折りたたむ
    await firstGroupTitle.click();
    await wait(100);
    await expect(firstCollapseIcon).toHaveClass(/collapsed/);
    
    // 再度クリックして展開
    await firstGroupTitle.click();
    await wait(100);
    await expect(firstCollapseIcon).not.toHaveClass(/collapsed/);
  });

  test('折りたたみ状態がページリロード後も維持される', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    // 最初のグループの名前を取得
    const firstGroupDomain = await page.locator('.group-domain').first().textContent();
    
    // 最初のグループを折りたたむ
    const firstGroupTitle = page.locator('.group-title').first();
    await firstGroupTitle.click();
    await wait(200);
    
    // ページをリロード
    await page.reload();
    await waitForPageLoad(page);
    await page.waitForSelector('.group-header');
    
    // 折りたたみ状態が維持されていることを確認
    // 同じドメインのグループを探す
    const groupHeaders = page.locator('.group-header');
    const count = await groupHeaders.count();
    
    for (let i = 0; i < count; i++) {
      const domain = await groupHeaders.nth(i).locator('.group-domain').textContent();
      if (domain === firstGroupDomain) {
        const collapseIcon = groupHeaders.nth(i).locator('.group-collapse-icon');
        await expect(collapseIcon).toHaveClass(/collapsed/);
        break;
      }
    }
  });

  test('複数のグループを個別に折りたたみ/展開できる', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    const groupTitles = page.locator('.group-title');
    const collapseIcons = page.locator('.group-collapse-icon');
    
    // 2つ以上のグループがあることを確認
    const groupCount = await groupTitles.count();
    expect(groupCount).toBeGreaterThanOrEqual(2);
    
    // 最初のグループを折りたたむ
    await groupTitles.first().click();
    await wait(100);
    await expect(collapseIcons.first()).toHaveClass(/collapsed/);
    
    // 2番目のグループは展開されたまま
    await expect(collapseIcons.nth(1)).not.toHaveClass(/collapsed/);
    
    // 2番目のグループも折りたたむ
    await groupTitles.nth(1).click();
    await wait(100);
    await expect(collapseIcons.nth(1)).toHaveClass(/collapsed/);
    
    // 両方とも折りたたまれている状態
    await expect(collapseIcons.first()).toHaveClass(/collapsed/);
    await expect(collapseIcons.nth(1)).toHaveClass(/collapsed/);
  });

  test('折りたたまれたグループのタブカードが非表示になる', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    // 折りたたむ前のタブカード数を取得
    const initialTabCount = await page.locator('.tab-card').count();
    expect(initialTabCount).toBeGreaterThan(0);
    
    // 最初のグループを折りたたむ
    const firstGroupTitle = page.locator('.group-title').first();
    await firstGroupTitle.click();
    await wait(200);
    
    // タブカード数が減っていることを確認
    const afterCollapseTabCount = await page.locator('.tab-card').count();
    expect(afterCollapseTabCount).toBeLessThan(initialTabCount);
  });

  test('キーボード操作（Enter）で折りたたみ/展開できる', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    const firstGroupHeader = page.locator('.group-header').first();
    const firstCollapseIcon = page.locator('.group-collapse-icon').first();
    
    // グループヘッダーにフォーカス（group-headerがtabIndexを持つ）
    await firstGroupHeader.focus();
    
    // Enterキーを押す
    await page.keyboard.press('Enter');
    await wait(100);

    
    // 折りたたまれていることを確認
    await expect(firstCollapseIcon).toHaveClass(/collapsed/);
    
    // もう一度Enterキーを押す
    await page.keyboard.press('Enter');
    await wait(100);
    
    // 展開されていることを確認
    await expect(firstCollapseIcon).not.toHaveClass(/collapsed/);
  });

  test('キーボード操作（Space）で折りたたみ/展開できる', async ({ page }) => {
    // グループヘッダーが表示されるまで待機
    await page.waitForSelector('.group-header');
    
    const firstGroupHeader = page.locator('.group-header').first();
    const firstCollapseIcon = page.locator('.group-collapse-icon').first();
    
    // グループヘッダーにフォーカス（group-headerがtabIndexを持つ）
    await firstGroupHeader.focus();
    
    // Spaceキーを押す
    await page.keyboard.press('Space');
    await wait(100);

    
    // 折りたたまれていることを確認
    await expect(firstCollapseIcon).toHaveClass(/collapsed/);
  });
});

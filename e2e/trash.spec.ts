/**
 * ゴミ箱機能のE2Eテスト
 */

import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createTestTabData, clearTestData } from './helpers';

test.describe('ゴミ箱機能', () => {
  test('タブを削除するとゴミ箱に移動する', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // テストタブを作成
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Test Page 1',
      domain: 'example.com',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // タブが表示されていることを確認
    const tabCard = page.locator('[data-testid="tab-card"]').first();
    await expect(tabCard).toBeVisible();
    
    // 削除ボタンをクリック
    await tabCard.hover();
    const deleteButton = tabCard.locator('[data-testid="tab-delete-button"]');
    await deleteButton.click();
    
    // タブが一覧から消えることを確認
    await expect(page.locator('[data-testid="tab-card"]')).toHaveCount(0);
    
    // ゴミ箱ボタンにバッジが表示されることを確認
    const trashButton = page.locator('[data-testid="trash-button"]');
    await expect(trashButton).toBeVisible();
    const trashBadge = trashButton.locator('.trash-badge');
    await expect(trashBadge).toHaveText('1');
  });

  test('ゴミ箱ダイアログを開いてタブを確認できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // テストタブを作成
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Deleted Tab',
      domain: 'example.com',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // タブを削除
    const tabCard = page.locator('[data-testid="tab-card"]').first();
    await tabCard.hover();
    await tabCard.locator('[data-testid="tab-delete-button"]').click();
    
    // 少し待機してDB更新を確実に反映させる
    await page.waitForTimeout(500);
    
    // ゴミ箱ダイアログを開く
    const trashButton = page.locator('[data-testid="trash-button"]');
    await trashButton.click();
    
    // ダイアログが表示されることを確認
    const trashDialog = page.locator('.trash-dialog');
    await expect(trashDialog).toBeVisible();
    
    // 削除されたタブが表示されることを確認
    const trashItem = trashDialog.locator('.trash-item');
    await expect(trashItem).toHaveCount(1);
    await expect(trashItem.locator('.trash-item-title')).toContainText('Deleted Tab');
  });

  test('ゴミ箱からタブを復元できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // テストタブを作成
    await createTestTabData(page, {
      url: 'https://example.com/restore-test',
      title: 'Restore Test Tab',
      domain: 'example.com',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // タブを削除
    const tabCard = page.locator('[data-testid="tab-card"]').first();
    await tabCard.hover();
    await tabCard.locator('[data-testid="tab-delete-button"]').click();
    
    // タブが消えたことを確認
    await expect(page.locator('[data-testid="tab-card"]')).toHaveCount(0);
    
    // 少し待機
    await page.waitForTimeout(500);
    
    // ゴミ箱ダイアログを開く
    await page.locator('[data-testid="trash-button"]').click();
    
    // 復元ボタンをクリック
    const restoreButton = page.locator('.trash-item').first().locator('button').first();
    await restoreButton.click();
    
    // ダイアログを閉じる
    await page.locator('.dialog-close-button').click();
    
    // タブが復元されていることを確認
    await expect(page.locator('[data-testid="tab-card"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="tab-title"]')).toContainText('Restore Test Tab');
  });

  test('ゴミ箱からタブを完全削除できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // テストタブを作成
    await createTestTabData(page, {
      url: 'https://example.com/permanent-delete',
      title: 'Permanent Delete Tab',
      domain: 'example.com',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // タブを削除
    const tabCard = page.locator('[data-testid="tab-card"]').first();
    await tabCard.hover();
    await tabCard.locator('[data-testid="tab-delete-button"]').click();
    
    // 少し待機
    await page.waitForTimeout(500);
    
    // ゴミ箱ダイアログを開く
    await page.locator('[data-testid="trash-button"]').click();
    
    // ゴミ箱にタブがあることを確認
    await expect(page.locator('.trash-item')).toHaveCount(1);
    
    // 完全削除ボタンをクリック（2番目のボタン）
    const deleteButton = page.locator('.trash-item').first().locator('button').last();
    await deleteButton.click();
    
    // ゴミ箱が空になることを確認
    await expect(page.locator('.trash-item')).toHaveCount(0);
    await expect(page.locator('.trash-empty')).toBeVisible();
  });

  test('ゴミ箱アイコンにバッジが正しく表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // テストデータをクリア
    await clearTestData(page);
    
    // 複数のテストタブを作成
    for (let i = 1; i <= 3; i++) {
      await createTestTabData(page, {
        url: `https://example.com/page${i}`,
        title: `Test Page ${i}`,
        domain: 'example.com',
      });
    }
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // 最初はバッジが表示されていないか0であることを確認
    const trashButton = page.locator('[data-testid="trash-button"]');
    await expect(trashButton).toBeVisible();
    
    // 3つのタブを削除
    for (let i = 0; i < 3; i++) {
      const tabCard = page.locator('[data-testid="tab-card"]').first();
      await tabCard.hover();
      await tabCard.locator('[data-testid="tab-delete-button"]').click();
      // 少し待機
      await page.waitForTimeout(200);
    }
    
    // バッジに「3」と表示されることを確認
    const trashBadge = trashButton.locator('.trash-badge');
    await expect(trashBadge).toHaveText('3');
  });
});

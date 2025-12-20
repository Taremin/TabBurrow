/**
 * 翻訳キー表示テスト
 * 各ページで翻訳キー（例: tabManager.title）がそのまま表示されていないことを確認
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, findTranslationKeysInPage, createTestTabData, clearTestData } from './helpers';

test.describe('翻訳キー表示テスト', () => {
  test('タブ管理画面に翻訳キーが表示されていない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // ページ内の翻訳キーを検索
    const foundKeys = await findTranslationKeysInPage(page);
    
    // 翻訳キーが見つからないことを確認
    expect(foundKeys).toEqual([]);
  });

  test('タブ管理画面（データあり）に翻訳キーが表示されていない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    
    // 既存データをクリア
    await clearTestData(page);
    
    // テストタブを追加してUIをより多く表示させる
    await createTestTabData(page, {
      url: 'https://example.com/test1',
      title: 'Test Page 1',
    });
    await createTestTabData(page, {
      url: 'https://github.com/test2',
      title: 'Test Page 2',
    });
    
    // リロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    
    // ページ内の翻訳キーを検索
    const foundKeys = await findTranslationKeysInPage(page);
    
    // 翻訳キーが見つからないことを確認
    expect(foundKeys).toEqual([]);
  });

  test('設定画面に翻訳キーが表示されていない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // ページ内の翻訳キーを検索
    const foundKeys = await findTranslationKeysInPage(page);
    
    // 翻訳キーが見つからないことを確認
    expect(foundKeys).toEqual([]);
  });

  test('クレジット画面に翻訳キーが表示されていない', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'credits.html'));
    await waitForPageLoad(page);
    
    // ページ内の翻訳キーを検索
    const foundKeys = await findTranslationKeysInPage(page);
    
    // 翻訳キーが見つからないことを確認
    expect(foundKeys).toEqual([]);
  });
});

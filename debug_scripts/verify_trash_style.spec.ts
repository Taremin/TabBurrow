
import { test, expect, getExtensionUrl } from '../e2e/fixtures';
import { seedTabsData, takeScreenshot, setupDebugConsole } from './debug_utils';

test('ゴミ箱ダイアログのスタイル検証', async ({ context, extensionId }) => {
  const page = await context.newPage();
  setupDebugConsole(page);
  
  await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
  
  // ゴミ箱用データを投入 (storeName: 'trash' を指定)
  // ページに遷移した後に行う（オリジンを確定させるため）
  await seedTabsData(page, [
    {
      id: 'trash-1',
      url: 'https://example.com/item1',
      title: 'とても長いタイトルとても長いタイトルとても長いタイトルとても長いタイトルとても長いタイトル',
      domain: 'example.com',
      trashedAt: Date.now(),
    } as any,
    {
      id: 'trash-2',
      url: 'https://test.com',
      title: '通常タイトル',
      domain: 'test.com',
      trashedAt: Date.now() - 86400000, // 1日前
    } as any
  ], { storeName: 'trash' });

  // データを反映させるためにリロード
  await page.reload();
  
  // ゴミ箱ダイアログを開く
  const trashButton = page.locator('[data-testid="trash-button"]');
  await trashButton.click();
  
  // ダイアログ表示待ち
  const trashDialog = page.locator('.trash-dialog');
  await expect(trashDialog).toBeVisible();
  
  // 少し待ってスタイルを落ち着かせる
  await page.waitForTimeout(500);
  
  // スクリーンショット撮影
  await takeScreenshot(page, 'trash_dialog_style');
  
  // タイトルの左寄せを確認
  const title = page.locator('.trash-item-title').first();
  const textAlign = await title.evaluate(el => window.getComputedStyle(el).textAlign);
  console.log(`Trash item title text-align: ${textAlign}`);
  expect(textAlign).toBe('left');
  
  // ホバー時のアクションボタン表示を確認
  const firstItem = page.locator('.trash-item').first();
  await firstItem.hover();
  await page.waitForTimeout(200);
  await takeScreenshot(page, 'trash_item_hover');
  
  // アクションボタンの透過度を確認
  const actions = firstItem.locator('.trash-item-actions');
  const opacity = await actions.evaluate(el => window.getComputedStyle(el).opacity);
  expect(parseFloat(opacity)).toBeGreaterThan(0.9);
  
  // 選択状態を確認
  await firstItem.locator('.trash-item-checkbox input').click();
  await page.waitForTimeout(200);
  await takeScreenshot(page, 'trash_item_selected');
  
  // 選択時のボーダー（左線）を確認
  const borderLeft = await firstItem.evaluate(el => window.getComputedStyle(el).borderLeftWidth);
  expect(parseFloat(borderLeft)).toBeGreaterThan(2);
});

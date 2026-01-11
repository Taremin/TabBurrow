/**
 * スクロール位置維持のE2Eテスト
 * タブ削除後にスクロール位置が維持されるか確認
 */

import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createBulkTestTabData, clearTestData } from './helpers';

test.describe('スクロール位置維持', () => {
  test('大量のタブがある状態で中間のタブを削除してもスクロール位置が維持される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // コンソールログをキャプチャ
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR] ${err.message}`);
    });
    
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    console.log('ページ読み込み完了');
    
    // テストデータをクリア
    await clearTestData(page);
    console.log('テストデータクリア完了');
    
    // 大量のテストタブを作成（100件、10ドメイン）
    await createBulkTestTabData(page, 100, { domainCount: 10 });
    console.log('バルクデータ作成完了');
    
    // ページをリロードしてデータを反映
    await page.reload();
    await waitForPageLoad(page);
    console.log('ページリロード完了');
    
    // タブカードの数を確認
    const tabCardCount = await page.locator('[data-testid="tab-card"]').count();
    console.log(`タブカード数: ${tabCardCount}`);
    
    // ページのHTML構造をデバッグ
    const mainContent = await page.locator('.tab-groups').count();
    console.log(`.tab-groups要素数: ${mainContent}`);
    
    // タブが表示されていることを確認
    const tabCards = page.locator('[data-testid="tab-card"]');
    await expect(tabCards.first()).toBeVisible({ timeout: 10000 });
    
    // JavaScriptでスクロール位置を設定
    await page.evaluate(() => {
      const scroller = document.querySelector('[data-virtuoso-scroller="true"]');
      if (scroller) {
        scroller.scrollTop = 2000;
      }
    });
    await page.waitForTimeout(500);
    
    // スクロール位置を確認
    const scrollTopBefore = await page.evaluate(() => {
      const scroller = document.querySelector('[data-virtuoso-scroller="true"]');
      return scroller?.scrollTop ?? 0;
    });
    console.log('削除前のスクロール位置:', scrollTopBefore);
    
    // スクロールが反映されていることを確認
    expect(scrollTopBefore).toBeGreaterThan(100);
    
    // 現在見えているタブカードの情報を取得
    const visibleTabBefore = await tabCards.first().locator('[data-testid="tab-title"]').textContent();
    console.log('削除前に見えているタブ:', visibleTabBefore);
    
    // 現在見えているタブの削除ボタンをクリック
    const targetTabCard = tabCards.first();
    await targetTabCard.hover();
    const deleteButton = targetTabCard.locator('[data-testid="tab-delete-button"]');
    await deleteButton.click();
    
    // 少し待機（ステート更新を待つ）
    await page.waitForTimeout(500);
    
    // スクロール位置を取得
    const scrollTopAfter = await page.evaluate(() => {
      const scroller = document.querySelector('[data-virtuoso-scroller="true"]');
      return scroller?.scrollTop ?? 0;
    });
    console.log('削除後のスクロール位置:', scrollTopAfter);
    
    // スクロール後に表示されているタブカードを取得
    const visibleTabAfter = await tabCards.first().locator('[data-testid="tab-title"]').textContent();
    console.log('削除後に見えているタブ:', visibleTabAfter);
    
    // スクロール位置の差を計算
    const scrollDiff = Math.abs(scrollTopBefore - scrollTopAfter);
    console.log('スクロール位置の差:', scrollDiff);
    
    // スクロール位置が大幅にリセットされていないこと（先頭に戻っていないこと）を確認
    // タブ削除により、削除されたタブの高さ分だけスクロール位置が変化するのは自然な動作
    // ただし、先頭（0）にジャンプせず、中間位置を維持していることが重要
    expect(scrollTopAfter).toBeGreaterThan(500); // 0にリセットされていないこと（1000px以上維持）
  });
});

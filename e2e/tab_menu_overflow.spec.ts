import { test, expect, getExtensionUrl } from './fixtures';
import { createBulkTestTabData, tabsPageSelectors } from './helpers';

test.describe('Tab Menu Overflow', () => {
  test('Menu should stay within viewport even if the tab is at the bottom', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // ウィンドウサイズを小さめに設定（溢れやすくする）
    await page.setViewportSize({ width: 1000, height: 600 });
    
    // 拡張機能のコンテキストに遷移してからデータを作成（about:blankではIndexedDBが使えないため）
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await createBulkTestTabData(page, 20);
    await page.reload(); // データを反映
    await page.waitForSelector(tabsPageSelectors.tabCard);

    // 最下部のタブを取得
    const tabCards = page.locator(tabsPageSelectors.tabCard);
    const lastTab = tabCards.last();
    
    // 最下部のタブまで移動
    await lastTab.scrollIntoViewIfNeeded();

    // 「カスタムグループに移動」ボタンをクリック
    const groupButton = lastTab.locator(tabsPageSelectors.tabGroupButton);
    await groupButton.click();

    // メニュー（Portal）が表示されるのを待機
    const menu = page.locator('.group-menu-portal');
    await expect(menu).toBeVisible();

    // メニュー位置とビューポートを比較
    const menuRect = await menu.boundingBox();
    const buttonRect = await groupButton.boundingBox();
    const viewport = page.viewportSize();

    if (menuRect && viewport && buttonRect) {
        console.log(`[Test] Button position: y=${buttonRect.y}, height=${buttonRect.height}`);
        console.log(`[Test] Menu position: top=${menuRect.y}, left=${menuRect.x}, height=${menuRect.height}`);
        console.log(`[Test] Viewport: height=${viewport.height}`);

        // 下端がビューポート内に収まっていることを確認
        expect(menuRect.y + menuRect.height).toBeLessThanOrEqual(viewport.height);
        // 上端もビューポート内にあること
        expect(menuRect.y).toBeGreaterThanOrEqual(0);
        
        // もしボタンより下にある場合、溢れていないことを確認
        // もしボタンより上にある場合、溢れ防止が効いてリポジショニングされたことを確認
        if (buttonRect.y + buttonRect.height + menuRect.height > viewport.height) {
            console.log(`[Test] Menu should be above the button or adjusted.`);
            expect(menuRect.y).toBeLessThan(buttonRect.y);
        }
    }

    // メニューを閉じる（bodyの中央付近をクリック）
    await page.mouse.click(500, 300);
    // Menu might still be visible due to transition/animation? Let's wait a bit.
    await page.waitForTimeout(500);
    await expect(menu).not.toBeVisible();
  });

  test('Screenshot popup should stay within viewport near the right edge', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1000, height: 600 });
    
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    // スクリーンショット付きのテストデータを作成
    const { createTestTabData } = await import('./helpers');
    await createTestTabData(page, {
        url: 'https://example.com/screenshot',
        title: 'Screenshot Test',
        screenshot: true
    });
    await page.reload();
    await page.waitForSelector(tabsPageSelectors.tabCard);

    const tabCard = page.locator(tabsPageSelectors.tabCard).first();
    const screenshotArea = tabCard.locator('.tab-screenshot');
    
    // ホバーしてポップアップを表示
    await screenshotArea.hover();
    
    const popup = page.locator(tabsPageSelectors.screenshotPopup);
    await expect(popup).toBeVisible();

    const popupRect = await popup.boundingBox();
    const viewport = page.viewportSize();

    if (popupRect && viewport) {
      expect(popupRect.x + popupRect.width).toBeLessThanOrEqual(viewport.width);
      expect(popupRect.y + popupRect.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});

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

    // メニュー位置とビューポート、ボタン位置を取得
    const menu = page.locator('.group-menu-portal');
    await expect(menu).toBeVisible();

    const buttonRect = await groupButton.boundingBox();
    const viewport = page.viewportSize();

    if (!buttonRect || !viewport) {
      throw new Error('Could not get bounding box or viewport size');
    }

    // メニュー位置とビューポートを比較
    // 位置調整（リポジショニング）が完了するまで少し待つ必要がある場合があるため、waitForFunctionを使用する
    await page.waitForFunction(([{ menuSelector, viewportHeight, buttonY, buttonHeight }]) => {
      const menu = document.querySelector(menuSelector);
      if (!menu) return false;
      const rect = menu.getBoundingClientRect();
      
      // 画面内に収まっていることは必須
      const isWithinViewport = rect.bottom <= viewportHeight && rect.top >= 0;
      
      // ボタンより物理的に上に配置されているか、あるいは調整済みであること
      // (期待される位置に移動したことを判定)
      const isPositionAdjusted = (buttonY + buttonHeight + rect.height > viewportHeight) 
        ? rect.top < buttonY // 下に収まらない場合は上にあるべき
        : rect.top >= buttonY + buttonHeight; // 収まる場合は下にあるべき
        
      return isWithinViewport && isPositionAdjusted;
    }, [{ 
      menuSelector: '.group-menu-portal', 
      viewportHeight: viewport.height,
      buttonY: buttonRect.y,
      buttonHeight: buttonRect.height
    }], { timeout: 5000 });

    const menuRect = await menu.boundingBox();

    if (menuRect && viewport && buttonRect) {
        console.log(`[Test] Button position: y=${buttonRect.y}, height=${buttonRect.height}`);
        console.log(`[Test] Menu position: top=${menuRect.y}, left=${menuRect.x}, height=${menuRect.height}`);
        console.log(`[Test] Viewport: height=${viewport.height}`);

        // 下端がビューポート内に収まっていることを確認
        expect(menuRect.y + menuRect.height).toBeLessThanOrEqual(viewport.height);
        // 上端もビューポート内にあること
        expect(menuRect.y).toBeGreaterThanOrEqual(0);
        
        if (buttonRect.y + buttonRect.height + menuRect.height > viewport.height) {
            console.log(`[Test] Menu should be above the button or adjusted.`);
            expect(menuRect.y).toBeLessThan(buttonRect.y);
        }
    }

    // メニューを閉じる（bodyの中央付近をクリック）
    await page.mouse.click(500, 300);
    await page.waitForTimeout(300); // 閉じられるのを少し待つ
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

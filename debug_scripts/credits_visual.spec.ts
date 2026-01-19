import { test, expect, getExtensionUrl } from '../e2e/fixtures';
import { optionsPageSelectors } from '../e2e/helpers';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.describe('Credits Link Visual Verification', () => {
  test('should display credits link with heart icon and button style', async ({ page, extensionId }) => {
    // 設定画面を開く
    console.log('Navigating to options page...');
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    
    // ロード待ちのスクリーンショット
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_after_goto.png') });

    try {
      await page.waitForSelector('.fixed-footer', { timeout: 10000 });
      console.log('Fixed footer found');
    } catch (e) {
      console.error('Fixed footer NOT found');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_error_no_footer.png'), fullPage: true });
      throw e;
    }

    // フッターまでスクロール
    const footer = page.locator('.fixed-footer');
    await footer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_after_scroll.png') });

    // スクリーンショットディレクトリの作成
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // クレジットリンクを取得
    const creditsLink = page.locator('.credits-link');
    await expect(creditsLink).toBeVisible();
    
    // Heart アイコンが存在することを確認
    const heartIcon = creditsLink.locator('.credits-icon');
    await expect(heartIcon).toBeVisible();

    // 通常時のスクリーンショット撮影 (まずは撮影)
    await creditsLink.screenshot({ path: path.join(SCREENSHOT_DIR, 'credits_link_normal.png') });

    // ホバー時のスクリーンショット撮影
    await creditsLink.hover();
    await page.waitForTimeout(300); // アニメーション待ち
    await creditsLink.screenshot({ path: path.join(SCREENSHOT_DIR, 'credits_link_hover.png') });

    // テキスト内容の確認 (言語によって クレジット または Credits になる)
    const linkTextContent = await creditsLink.locator('span').textContent();
    console.log('Credits link span textContent:', linkTextContent);
    expect(linkTextContent?.trim()).toMatch(/^(クレジット|Credits)$/);

    // クリックしてクレジット画面に遷移することを確認
    await creditsLink.click();
    await expect(page).toHaveURL(/credits\.html/);
    
    // クレジット画面のスクリーンショット撮影
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'credits_page.png'), fullPage: true });
  });
});

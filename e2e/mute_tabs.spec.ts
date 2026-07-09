import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createTestTabData } from './helpers';

test.describe('Mute on Restore Tests', () => {


  test('個別タブのミュートトグルが動作し、復元時にミュート状態で開くこと', async ({ context, extensionId, page }) => {
    // 1. タブ管理画面にアクセス
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // 2. テスト用タブデータを投入
    const url = 'https://example.com/sound-test';
    await createTestTabData(page, {
      url,
      title: 'Sound Test Tab',
      domain: 'example.com'
    });
    
    // 3. リロードしてデータ反映
    await page.reload();
    await waitForPageLoad(page);

    // 4. 最初はインジケータもアクティブボタンもないことを確認
    const muteIndicator = page.locator('[data-testid="tab-mute-indicator"]');
    await expect(muteIndicator).not.toBeVisible();

    const muteBtn = page.getByTestId('tab-mute-button');
    const tabCard = page.getByTestId('tab-card');
    await tabCard.hover();
    await expect(muteBtn).toBeVisible();
    await expect(muteBtn).not.toHaveClass(/active/);

    // 5. トグルをクリックしてミュート設定にする
    await muteBtn.click();
    await expect(muteBtn).toHaveClass(/active/);
    
    // 6. インジケータが常時表示されることを確認
    await page.mouse.move(0, 0); // hoverを外す
    await expect(muteIndicator).toBeVisible();

    // 7. タブを開く
    const pagePromise = context.waitForEvent('page');
    // アクションエリア以外の部分をクリックして開く
    await tabCard.locator('[data-testid="tab-title"]').click();
    const newPage = await pagePromise;
    await newPage.waitForLoadState();

    // 8. 新しいページのミュート状態をチェック
    const muted = await page.evaluate(async (targetUrl: string) => {
      // chrome.tabs API を利用してタブ情報を取得
      const tabs = await chrome.tabs.query({ url: targetUrl });
      return tabs.length > 0 ? tabs[0].mutedInfo?.muted : null;
    }, url);
    expect(muted).toBe(true);

    // 古いタブを閉じる
    await newPage.close();

    // 9. トグルを解除して、再度開いた際にミュートにならないことを確認
    await page.bringToFront();
    await tabCard.hover();
    await muteBtn.click();
    await expect(muteBtn).not.toHaveClass(/active/);
    await page.mouse.move(0, 0);
    await expect(muteIndicator).not.toBeVisible();

    const pagePromise2 = context.waitForEvent('page');
    await tabCard.locator('[data-testid="tab-title"]').click();
    const newPage2 = await pagePromise2;
    await newPage2.waitForLoadState();

    const muted2 = await page.evaluate(async (targetUrl: string) => {
      const tabs = await chrome.tabs.query({ url: targetUrl });
      return tabs.length > 0 ? tabs[0].mutedInfo?.muted : null;
    }, url);
    expect(muted2).toBe(false);
  });

  test('グループ（ドメイン）をミュートに設定し、開いたときにミュートになること', async ({ extensionId, page }) => {
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    const url1 = 'https://domain-mute-test.com/1';
    const url2 = 'https://domain-mute-test.com/2';
    await createTestTabData(page, { url: url1, title: 'T1', domain: 'domain-mute-test.com' });
    await createTestTabData(page, { url: url2, title: 'T2', domain: 'domain-mute-test.com' });

    // restoreModeを'normal'に設定して、Playwrightとdiscardの競合を防ぐ
    await page.evaluate(async () => {
      const result = await chrome.storage.local.get('settings');
      const settings = (result.settings || {}) as import('../src/settings').Settings;
      settings.restoreMode = 'normal';
      await chrome.storage.local.set({ settings });
    });

    await page.reload();
    await waitForPageLoad(page);

    // ドメイングループのヘッダーにあるミュートボタンをクリック
    const groupHeader = page.getByTestId('group-header').first();
    await groupHeader.hover();
    const groupMuteBtn = groupHeader.getByTestId('group-mute-button');
    await expect(groupMuteBtn).toBeVisible();
    await expect(groupMuteBtn).not.toHaveClass(/active/);

    await groupMuteBtn.click();
    await expect(groupMuteBtn).toHaveClass(/active/);
    
    // グループミュートインジケータが表示されていることを確認
    const groupMuteIndicator = groupHeader.getByTestId('group-mute-indicator');
    await page.mouse.move(0, 0); // hoverを外す
    await expect(groupMuteIndicator).toBeVisible();

    // グループ全体のタブを開く
    const openGroupBtn = groupHeader.getByTestId('group-open-button');
    await openGroupBtn.click();
    
    // タブが復元されて開くのを待つ
    await page.waitForTimeout(2000);

    // 各タブのミュート状態をChrome APIでチェック
    const mutedStates = await page.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      return tabs.map(t => ({ url: t.url, muted: t.mutedInfo?.muted }));
    });

    const targetTabs = mutedStates.filter((t: { url?: string; muted?: boolean }) => t.url && t.url.includes('domain-mute-test.com'));
    expect(targetTabs.length).toBe(2);
    expect(targetTabs[0].muted).toBe(true);
    expect(targetTabs[1].muted).toBe(true);
  });
});

/**
 * コンテキストメニュー更新通知のE2Eテスト
 * UI操作時にバックグラウンドへ更新メッセージが送信されるかを確認
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, clearTestData, createCustomGroupData } from './helpers';

test.describe('コンテキストメニュー更新通知', () => {
  // メッセージングをスパイするためのスクリプト
  const spyScript = () => {
    // グローバルにメッセージログ配列を作成
    (window as any).__sentMessages = [];
    
    // chrome.runtime.sendMessage をラップ
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = function(message: any, ...args: any[]) {
      (window as any).__sentMessages.push(message);
      if (originalSendMessage) {
        return originalSendMessage.apply(this, [message, ...args]);
      }
      return Promise.resolve();
    };
  };

  test.beforeEach(async ({ context, extensionId }) => {
    // テストデータをクリア
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    await page.close();
  });

  test('カスタムグループ作成・変更・削除時にバックグラウンドへ通知が送られる', async ({ context, extensionId }) => {
    test.setTimeout(60000); // ステップが多いためタイムアウト延長
    const page = await context.newPage();
    
    // ページロード前にスパイを仕込む
    await page.addInitScript(spyScript);
    
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 1. カスタムグループ新規作成
    const groupName = 'TestMenuSyncGroup';
    await page.locator('.custom-groups-settings .add-group-button').click();
    
    // ダイアログ操作
    const createDialog = page.locator('.dialog');
    await expect(createDialog).toBeVisible();
    
    // グループ名入力 (一文字ずつ入力して確実にイベント発火させる)
    const createInput = createDialog.locator('input[type="text"]');
    await createInput.pressSequentially(groupName, { delay: 100 });
    
    // 入力値が反映されていることを確認
    await expect(createInput).toHaveValue(groupName);
    
    // OKボタンが有効化されるのを待ってクリック
    const createOkButton = createDialog.locator('button.btn-primary');
    await expect(createOkButton).toBeEnabled();
    await createOkButton.click();
    
    // ダイアログが閉じるのを待つ
    await expect(createDialog).not.toBeVisible();
    
    // グループがリストに表示されるまで待機（処理完了の目安）
    await expect(page.locator(`.custom-group-name:has-text("${groupName}")`)).toBeVisible();
    
    // メッセージが送信されたか確認
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: any) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
    
    // ログをクリア
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    // 2. カスタムグループ名変更
    const newGroupName = 'RenamedSyncGroup';
    // 編集ボタンをクリック
    await page.locator('.custom-groups-settings .custom-group-item').filter({ hasText: groupName }).locator('button[title*="編集"], button[title*="Edit"]').click();
    
    // ダイアログ操作
    const renameDialog = page.locator('.dialog');
    await expect(renameDialog).toBeVisible();
    
    // グループ名入力
    const renameInput = renameDialog.locator('input[type="text"]');
    await renameInput.clear(); // 既存の値をクリア
    await renameInput.pressSequentially(newGroupName, { delay: 100 });
    
    // 入力値が反映されていることを確認
    await expect(renameInput).toHaveValue(newGroupName);
    
    // OKボタンをクリック
    const renameOkButton = renameDialog.locator('button.btn-primary');
    await expect(renameOkButton).toBeEnabled();
    await renameOkButton.click();
    await page.waitForTimeout(500);
    
    // ダイアログが閉じるのを待つ
    await expect(renameDialog).not.toBeVisible();
    
    // 変更後の名前が表示されるまで待機
    await expect(page.locator(`.custom-group-name:has-text("${newGroupName}")`)).toBeVisible();
    
    // メッセージ確認
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: any) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
    
    // ログをクリア
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    // 3. カスタムグループ削除
    // 削除ボタンをクリック
    await page.locator('.custom-groups-settings .custom-group-item').filter({ hasText: newGroupName }).locator('button[title*="削除"], button[title*="Delete"]').click();
    
    // 確認ダイアログの表示確認と削除実行
    const confirmDialog = page.locator('.dialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('button.btn-danger').click();
    
    // グループが消えるまで待機
    await expect(page.locator(`.custom-group-name:has-text("${newGroupName}")`)).toHaveCount(0);
    
    // メッセージ確認
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: any) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
  });

  test('カスタムグループの並び替え時に通知が送られる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // スパイを仕込む
    await page.addInitScript(spyScript);
    
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // テスト用グループを作成
    await createCustomGroupData(page, [
      { name: 'Group1', sortOrder: 0 },
      { name: 'Group2', sortOrder: 1 },
    ]);
    await page.reload();
    await waitForPageLoad(page);
    
    // メッセージログをクリア（リロードでクリアされているはずだが念のため）
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    const group1 = page.locator('.custom-group-item').filter({ hasText: 'Group1' });
    const group2 = page.locator('.custom-group-item').filter({ hasText: 'Group2' });
    
    // Group1をGroup2の下にドラッグ
    await group1.dragTo(group2, { targetPosition: { x: 50, y: 40 } });
    
    // 並び替え完了確認 (UI上での順序変更)
    const items = page.locator('.custom-group-item');
    await expect(items.nth(0)).toHaveText(/Group2/);
    await expect(items.nth(1)).toHaveText(/Group1/);
    
    // メッセージ確認
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: any) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
  });
});

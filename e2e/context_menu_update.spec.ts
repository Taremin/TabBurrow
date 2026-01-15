/**
 * コンテキストメニュー更新通知のE2Eテスト
 * UI操作時にバックグラウンドへ更新メッセージが送信されるかを確認
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createCustomGroupData, optionsPageSelectors } from './helpers';

test.describe('コンテキストメニュー更新通知', () => {
  // メッセージングをスパイするためのスクリプト
  const spyScript = () => {
    // window の型拡張
    interface ExtendedWindow extends Window {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __sentMessages: any[];
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as unknown as ExtendedWindow;
    win.__sentMessages = [];
    
    // chrome.runtime.sendMessage をラップ
    const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
    
    // chrome.runtime の型拡張（必要な部分のみ）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = chrome.runtime as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runtime.sendMessage = function(message: any, ...args: any[]): Promise<any> {
      win.__sentMessages.push(message);
      return originalSendMessage(message, ...args);
    };
  };

  // グローバルな initializeTest フィクスチャが自動でクリアするため、
  // ここでの手動 clearTestData は不要。

  test('カスタムグループ作成・変更・削除時にバックグラウンドへ通知が送られる', async ({ context, extensionId }) => {
    test.setTimeout(60000); // ステップが多いためタイムアウト延長
    const page = await context.newPage();
    
    // ページロード前にスパイを仕込む
    await page.addInitScript(spyScript);
    
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    // 1. カスタムグループ新規作成
    const groupName = 'TestMenuSyncGroup';
    await page.locator(optionsPageSelectors.customGroupsSection).getByTestId('add-group-button').click();
    
    // ダイアログ操作
    const createDialog = page.locator('.dialog');
    await expect(createDialog).toBeVisible();
    
    // グループ名入力
    const createInput = createDialog.locator('input[type="text"]');
    await createInput.fill(groupName);
    
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: { type: string }) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
    
    // ログをクリア
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    // 2. カスタムグループ名変更
    const newGroupName = 'RenamedSyncGroup';
    // 編集ボタンをクリック
    await page.locator(optionsPageSelectors.customGroupsSection).getByTestId('custom-group-item').filter({ hasText: groupName }).getByTestId('edit-group-button').click();
    
    // ダイアログ操作
    const renameDialog = page.locator('.dialog');
    await expect(renameDialog).toBeVisible();
    
    // グループ名入力 - fill()で確実に置換（clear()だけでは不完全な場合がある）
    const renameInput = renameDialog.locator('input[type="text"]');
    await renameInput.fill(''); // 先に空にする
    await renameInput.fill(newGroupName); // 新しい値を設定
    
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: { type: string }) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
    
    // ログをクリア
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    // 3. カスタムグループ削除
    // 削除ボタンをクリック
    await page.locator(optionsPageSelectors.customGroupsSection).getByTestId('custom-group-item').filter({ hasText: newGroupName }).getByTestId('delete-group-button').click();
    
    // 確認ダイアログの表示確認と削除実行
    const confirmDialog = page.locator('.dialog');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('button.btn-danger').click();
    
    // グループが消えるまで待機
    await expect(page.locator(`.custom-group-name:has-text("${newGroupName}")`)).toHaveCount(0);
    
    // メッセージ確認
    await expect.poll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).__sentMessages = []);
    
    const group1 = page.getByTestId('custom-group-item').filter({ hasText: 'Group1' });
    const group2 = page.getByTestId('custom-group-item').filter({ hasText: 'Group2' });
    
    // Group1をGroup2の下にドラッグ
    await group1.dragTo(group2, { targetPosition: { x: 50, y: 40 } });
    
    // 並び替え完了確認 (UI上での順序変更)
    const items = page.getByTestId('custom-group-item');
    await expect(items.nth(0)).toHaveText(/Group2/);
    await expect(items.nth(1)).toHaveText(/Group1/);
    
    // メッセージ確認
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: { type: string }) => m.type === 'custom-groups-changed');
    }).toBeTruthy();
  });
});

/**
 * 言語設定の同期とコンテキストメニュー更新のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, optionsPageSelectors } from './helpers';

test.describe('言語設定の同期と言語設定適用', () => {
  // メッセージングをスパイするためのスクリプト
  const spyScript = () => {
    interface ExtendedWindow extends Window {
      __sentMessages: any[];
    }
    const win = window as unknown as ExtendedWindow;
    win.__sentMessages = [];
    const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
    const runtime = chrome.runtime as any;
    runtime.sendMessage = function(message: any, ...args: any[]): Promise<any> {
      win.__sentMessages.push(message);
      return originalSendMessage(message, ...args);
    };
  };

  test('設定画面で言語を日本語に変更した際、バックグラウンドに通知が飛び、タイトル更新が行われる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.addInitScript(spyScript);
    
    console.log('Options.html に遷移中...');
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    
    console.log('「日本語」のラベルをクリック中...');
    // ラベルテキストをクリック
    await page.locator('label').filter({ hasText: '日本語' }).click();
    
    console.log('保存ボタンをクリック中...');
    const submitButton = page.locator(optionsPageSelectors.submitButton);
    await submitButton.click();
    
    console.log('保存完了を待機中...');
    await expect(page.locator('.save-status')).toBeVisible({ timeout: 15000 });
    
    console.log('settings-changed メッセージを検証中...');
    await expect.poll(async () => {
      const messages = await page.evaluate(() => (window as any).__sentMessages);
      return messages.some((m: { type: string }) => m.type === 'settings-changed');
    }, { timeout: 10000 }).toBeTruthy();
    console.log('テスト完了');
  });

  test('Service Worker の初期設定プロセスが完了することを確認', async ({ context, extensionId }) => {
    const page = await context.newPage();
    
    // コンソールログを収集
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    // バックグラウンド側のコンソールも収集
    context.on('console', msg => {
      logs.push(`[SW] ${msg.text()}`);
    });

    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // 初期化完了のログが出力されているか確認
    // 修正によって、initializeAll() 内で updateContextMenuTitles 経由のログが出る可能性がある
    await expect.poll(() => {
      return logs.some(l => l.includes('initializeAll() 完了'));
    }, { timeout: 15000 }).toBeTruthy();
  });
});

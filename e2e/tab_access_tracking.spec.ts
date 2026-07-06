/**
 * 保存済みURLへのアクセス時の最終アクセス時間更新 (Access Tracking) のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, createTestTabData } from './helpers';

test.describe('保存済みURLへのアクセス時の最終アクセス時間更新', () => {
  test('保存されているURLに通常タブでアクセスしたとき、DB of最終アクセス時間が更新されること', async ({ context, extensionId }) => {
    // 1. テストデータの準備
    const targetUrl = 'https://example.com/access-test';
    const pastTime = Date.now() - 1000 * 60 * 60; // 1時間前
    
    // 拡張機能のダミーページを開いて IndexedDB にデータを書き込む
    const prepPage = await context.newPage();
    await prepPage.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(prepPage);
    
    await createTestTabData(prepPage, {
      url: targetUrl,
      title: 'Access Test Page',
      lastAccessed: pastTime
    });

    // バックグラウンドにデータ変更を通知して、キャッシュを同期させる
    await prepPage.evaluate(() => {
      const api = typeof browser !== 'undefined' ? browser : chrome;
      api.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
    });
    
    // バックグラウンドのキャッシュ同期を少し待つ
    await prepPage.waitForTimeout(500);
    await prepPage.close();

    // 2. 通常のブラウザタブで対象URLにアクセスする
    const testPage = await context.newPage();
    await testPage.goto(targetUrl);
    await waitForPageLoad(testPage);

    // バックグラウンドでの検知・更新処理を考慮して待機
    await testPage.waitForTimeout(2000);

    // 3. IndexedDB からデータを読み出し、最終アクセス時間が更新されているか検証する
    const checkPage = await context.newPage();
    await checkPage.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(checkPage);

    const updatedTab = await checkPage.evaluate(async (url) => {
      const DB_NAME = 'TabBurrowDB';
      const TABS_STORE_NAME = 'tabs';
      
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return new Promise<any>((resolve, reject) => {
        const transaction = db.transaction(TABS_STORE_NAME, 'readonly');
        const store = transaction.objectStore(TABS_STORE_NAME);
        const index = store.index('url');
        const request = index.get(url);
        
        request.onsuccess = () => {
          resolve(request.result || null);
          db.close();
        };
        request.onerror = () => {
          reject(request.error);
          db.close();
        };
      });
    }, targetUrl);

    await checkPage.close();
    await testPage.close();

    // 4. アサーション
    expect(updatedTab).toBeTruthy();
    // 最終アクセス時間が過去の時間（1時間前）より大きくなっていること
    expect(updatedTab.lastAccessed).toBeGreaterThan(pastTime);
    // 最終アクセス時間がほぼ現在時刻（現在時刻の15秒以内）であることを確認
    const diff = Math.abs(updatedTab.lastAccessed - Date.now());
    expect(diff).toBeLessThan(15000);
  });
});

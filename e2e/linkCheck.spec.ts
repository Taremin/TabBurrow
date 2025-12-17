/**
 * リンクチェック機能のE2Eテスト
 * ネットワークリクエストをモックして様々なステータスコードをシミュレート
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { createTestTabData, clearTestData, wait } from './helpers';

// タブ管理画面のセレクター
const selectors = {
  // リンクチェック関連
  linkCheckButton: 'button[title*="リンク"], button[title*="Link"]',
  linkCheckDialog: '.link-check-dialog',
  linkCheckOverlay: '.link-check-overlay',
  linkCheckProgressBar: '.link-check-progress-fill',
  linkCheckProgressText: '.link-check-progress-text',
  linkCheckStats: '.link-check-stats',
  linkCheckResults: '.link-check-results',
  linkCheckResultItem: '.link-check-result-item',
  linkCheckFilter: '.link-check-filter select',
  linkCheckCloseButton: '.btn-close',
  linkCheckCancelButton: '.btn-cancel',
  linkCheckSelectAllButton: '.btn-select-all',
  linkCheckDeleteButton: '.btn-delete',
  
  // ステータス別
  statAlive: '.stat-alive',
  statDead: '.stat-dead',
  statWarning: '.stat-warning',
};

/**
 * ステータスコードマッピング
 * URLパターンごとに返すステータスコードを定義
 */
interface MockStatusConfig {
  pattern: string | RegExp;
  status: number;
  delay?: number; // 応答遅延（ms）
}

/**
 * ネットワークリクエストをモックするヘルパー
 */
async function setupNetworkMocks(
  context: import('@playwright/test').BrowserContext,
  configs: MockStatusConfig[],
  debug = false
) {
  await context.route('**/*', async (route, request) => {
    const url = request.url();
    const method = request.method();
    const serviceWorker = request.serviceWorker();
    
    if (debug) {
      console.log(`[Route] ${method} ${url} (SW: ${serviceWorker ? 'yes' : 'no'})`);
    }
    
    // HEAD/GETリクエストのみモック
    if (method !== 'HEAD' && method !== 'GET') {
      return route.continue();
    }
    
    // 拡張機能のリソースはスキップ
    if (url.startsWith('chrome-extension://')) {
      return route.continue();
    }
    
    // マッチするコンフィグを探す
    for (const config of configs) {
      const matches = typeof config.pattern === 'string'
        ? url.includes(config.pattern)
        : config.pattern.test(url);
      
      if (matches) {
        if (debug) {
          console.log(`[Route] Matched ${config.pattern} -> ${config.status}`);
        }
        
        // 遅延を追加（オプション）
        if (config.delay) {
          await wait(config.delay);
        }
        
        return route.fulfill({
          status: config.status,
          contentType: 'text/html',
          body: '',
        });
      }
    }
    
    // デフォルトは200を返す
    if (debug) {
      console.log(`[Route] Default -> 200`);
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '',
    });
  });
}

test.describe('リンクチェック機能', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // タブ管理画面を開いてテストデータをクリア
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await clearTestData(page);
    await page.close();
  });

  test('リンクチェックボタンが表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
    });
    
    // ページをリロードしてデータを反映
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックボタンが存在することを確認
    const linkCheckButton = page.locator(selectors.linkCheckButton);
    await expect(linkCheckButton).toBeVisible();
    
    await page.close();
  });

  test('リンクチェックダイアログが開く', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックボタンをクリック
    await page.click(selectors.linkCheckButton);
    
    // ダイアログが表示されることを確認
    await expect(page.locator(selectors.linkCheckDialog)).toBeVisible();
    
    // 進捗バーが表示されることを確認
    await expect(page.locator(selectors.linkCheckProgressBar)).toBeVisible();
    
    await page.close();
  });

  test('モックされたステータスコードで正しくカテゴリ分けされる', async ({ context, extensionId }) => {
    // ネットワークモックを設定
    await setupNetworkMocks(context, [
      { pattern: 'alive.example.com', status: 200 },
      { pattern: 'dead.example.com', status: 404 },
      { pattern: 'warning.example.com', status: 500 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成（3種類のステータスをシミュレート）
    await createTestTabData(page, {
      url: 'https://alive.example.com/page',
      title: 'Alive Page (200)',
      domain: 'alive.example.com',
    });
    await createTestTabData(page, {
      url: 'https://dead.example.com/page',
      title: 'Dead Page (404)',
      domain: 'dead.example.com',
    });
    await createTestTabData(page, {
      url: 'https://warning.example.com/page',
      title: 'Warning Page (500)',
      domain: 'warning.example.com',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // チェック完了を待機（進捗テキストに「完了」または「Complete」が含まれるまで）
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('完了') || text.includes('Complete') || text.includes('3/3');
    }, { timeout: 10000 });
    
    // 結果を確認
    const aliveCount = await page.locator(selectors.statAlive).textContent();
    const deadCount = await page.locator(selectors.statDead).textContent();
    const warningCount = await page.locator(selectors.statWarning).textContent();
    
    // 各カテゴリに1つずつあることを確認
    expect(aliveCount).toContain('1');
    expect(deadCount).toContain('1');
    expect(warningCount).toContain('1');
    
    await page.close();
  });

  test('フィルタリングが動作する', async ({ context, extensionId }) => {
    // ネットワークモックを設定
    await setupNetworkMocks(context, [
      { pattern: 'alive', status: 200 },
      { pattern: 'dead', status: 404 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成
    await createTestTabData(page, {
      url: 'https://alive1.example.com/page',
      title: 'Alive Page 1',
    });
    await createTestTabData(page, {
      url: 'https://alive2.example.com/page',
      title: 'Alive Page 2',
    });
    await createTestTabData(page, {
      url: 'https://dead1.example.com/page',
      title: 'Dead Page 1',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // チェック完了を待機
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('3/3');
    }, { timeout: 10000 });
    
    // 全件表示を確認
    let resultItems = await page.locator(selectors.linkCheckResultItem).count();
    expect(resultItems).toBe(3);
    
    // 「リンク切れのみ」フィルター
    await page.selectOption(selectors.linkCheckFilter, 'dead');
    resultItems = await page.locator(selectors.linkCheckResultItem).count();
    expect(resultItems).toBe(1);
    
    // 「全て表示」に戻す
    await page.selectOption(selectors.linkCheckFilter, 'all');
    resultItems = await page.locator(selectors.linkCheckResultItem).count();
    expect(resultItems).toBe(3);
    
    await page.close();
  });

  test('高速HEADリクエストの正常応答確認', async ({ context, extensionId }) => {
    // 高速に応答するモック
    await setupNetworkMocks(context, [
      { pattern: 'fast.example.com', status: 200 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成
    await createTestTabData(page, {
      url: 'https://fast.example.com/page',
      title: 'Fast Page',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // チェック完了を待機
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('1/1');
    }, { timeout: 15000 });
    
    // 正常に完了することを確認
    const aliveCount = await page.locator(selectors.statAlive).textContent();
    expect(aliveCount).toContain('1');
    
    await page.close();
  });

  test('選択と一括削除が動作する', async ({ context, extensionId }) => {
    // 全て404を返す
    await setupNetworkMocks(context, [
      { pattern: 'example.com', status: 404 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成
    await createTestTabData(page, {
      url: 'https://dead1.example.com/page',
      title: 'Dead Page 1',
    });
    await createTestTabData(page, {
      url: 'https://dead2.example.com/page',
      title: 'Dead Page 2',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // 最初のタブ数を確認
    const initialCount = await page.locator('.tab-card').count();
    expect(initialCount).toBe(2);
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // チェック完了を待機
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('2/2');
    }, { timeout: 15000 });
    
    // 全選択
    await page.click(selectors.linkCheckSelectAllButton);
    
    // 確認ダイアログを先に設定
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    // 削除ボタンをクリック
    await page.click(selectors.linkCheckDeleteButton);
    
    // 削除処理を待機
    await wait(1000);
    
    // ダイアログを閉じる
    await page.click(selectors.linkCheckCloseButton);
    
    // タブが削除されていることを確認
    await page.waitForFunction(() => {
      return document.querySelectorAll('.tab-card').length === 0;
    }, { timeout: 10000 });
    
    await page.close();
  });

  test('キャンセルが動作する（大量データ）', async ({ context, extensionId }) => {
    // 長い遅延を追加してリクエストを確実に遅くする
    await setupNetworkMocks(context, [
      { pattern: 'example', status: 200, delay: 500 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを100件作成（500件は時間がかかりすぎる）
    const dataCount = 100;
    for (let i = 0; i < dataCount; i++) {
      await createTestTabData(page, {
        url: `https://example${i}.com/page${i}`,
        title: `Example Page ${i}`,
      });
    }
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // ダイアログが開いたことを確認
    await expect(page.locator(selectors.linkCheckDialog)).toBeVisible();
    
    // キャンセルボタンが表示されるまで待機（チェック中状態になるまで）
    await expect(page.locator(selectors.linkCheckCancelButton)).toBeVisible({ timeout: 10000 });
    
    // キャンセルボタンをクリック
    await page.click(selectors.linkCheckCancelButton);
    
    // キャンセル後の状態を確認（再開ボタンが表示されるまで待機）
    const resumeButton = page.locator('.btn-resume');
    await expect(resumeButton).toBeVisible({ timeout: 5000 });
    
    // キャンセル後の進捗を記録
    const progressTextAfterCancel = await page.locator(selectors.linkCheckProgressText).textContent();
    
    // キャンセル状態であることを確認（「キャンセル」または「Cancelled」が表示される）
    expect(progressTextAfterCancel).toMatch(/キャンセル|Cancelled/);
    
    // 進捗が止まっていることを確認（全件はチェックされていない）
    const progressMatch = progressTextAfterCancel?.match(/(\d+)\/(\d+)/);
    if (progressMatch) {
      const checked = parseInt(progressMatch[1], 10);
      const total = parseInt(progressMatch[2], 10);
      // 全件がチェックされていないことを確認
      expect(checked).toBeLessThan(total);
    }
    
    // 少し待って進捗が増えないことを確認
    await wait(2000);
    const progressTextAfterWait = await page.locator(selectors.linkCheckProgressText).textContent();
    expect(progressTextAfterWait).toBe(progressTextAfterCancel);
    
    await page.close();
  });

  test('再開が動作する（中断したところから継続）', async ({ context, extensionId }) => {
    // 遅延を追加してリクエストを遅くする
    await setupNetworkMocks(context, [
      { pattern: 'example', status: 200, delay: 200 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを30件作成
    const dataCount = 30;
    for (let i = 0; i < dataCount; i++) {
      await createTestTabData(page, {
        url: `https://example${i}.com/page${i}`,
        title: `Example Page ${i}`,
      });
    }
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // ダイアログが開いたことを確認
    await expect(page.locator(selectors.linkCheckDialog)).toBeVisible();
    
    // キャンセルボタンが表示されるまで待機
    await expect(page.locator(selectors.linkCheckCancelButton)).toBeVisible({ timeout: 10000 });
    
    // キャンセルボタンをクリック
    await page.click(selectors.linkCheckCancelButton);
    
    // 再開ボタンが表示されるまで待機
    const resumeButton = page.locator('.btn-resume');
    await expect(resumeButton).toBeVisible({ timeout: 5000 });
    
    // 再開ボタンをクリック
    await resumeButton.click();
    
    // チェック完了を待機（100%になるまで）
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('完了') || text.includes('Complete') || text.includes('100%');
    }, { timeout: 60000 });
    
    // 最終的にチェック完了していることを確認（100%）
    const finalProgressText = await page.locator(selectors.linkCheckProgressText).textContent();
    expect(finalProgressText).toMatch(/100%/);
    
    // 閉じるボタンが表示されることを確認（チェック完了）
    await expect(page.locator(selectors.linkCheckCloseButton)).toBeVisible();
    
    await page.close();
  });

  test('複数回再開してもトータル件数が増えない', async ({ context, extensionId }) => {
    // 遅延を追加してリクエストを遅くする
    await setupNetworkMocks(context, [
      { pattern: 'example', status: 200, delay: 300 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを20件作成
    const dataCount = 20;
    for (let i = 0; i < dataCount; i++) {
      await createTestTabData(page, {
        url: `https://example${i}.com/page${i}`,
        title: `Example Page ${i}`,
      });
    }
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // ダイアログが開いたことを確認
    await expect(page.locator(selectors.linkCheckDialog)).toBeVisible();
    
    // キャンセルボタンが表示されるまで待機
    await expect(page.locator(selectors.linkCheckCancelButton)).toBeVisible({ timeout: 10000 });
    
    // 1回目のキャンセル
    await page.click(selectors.linkCheckCancelButton);
    
    // 再開ボタンが表示されるまで待機
    const resumeButton = page.locator('.btn-resume');
    await expect(resumeButton).toBeVisible({ timeout: 5000 });
    
    // 1回目再開後のトータルを記録
    const progressText1 = await page.locator(selectors.linkCheckProgressText).textContent();
    const totalMatch1 = progressText1?.match(/\/(\d+)/);
    const total1 = totalMatch1 ? parseInt(totalMatch1[1], 10) : 0;
    
    // 1回目の再開
    await resumeButton.click();
    
    // キャンセルボタンが表示されるまで待機
    await expect(page.locator(selectors.linkCheckCancelButton)).toBeVisible({ timeout: 10000 });
    
    // 2回目のキャンセル
    await page.click(selectors.linkCheckCancelButton);
    
    // 再開ボタンが表示されるまで待機
    await expect(resumeButton).toBeVisible({ timeout: 5000 });
    
    // 2回目のトータルを記録
    const progressText2 = await page.locator(selectors.linkCheckProgressText).textContent();
    const totalMatch2 = progressText2?.match(/\/(\d+)/);
    const total2 = totalMatch2 ? parseInt(totalMatch2[1], 10) : 0;
    
    // トータル件数が同じであることを確認（増えていないこと）
    expect(total2).toBe(total1);
    expect(total2).toBeLessThanOrEqual(dataCount);
    
    // 3回目の再開
    await resumeButton.click();
    
    // チェック完了を待機
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('100%') || text.includes('完了') || text.includes('Complete');
    }, { timeout: 60000 });
    
    // 最終的なトータルも同じであることを確認
    const progressText3 = await page.locator(selectors.linkCheckProgressText).textContent();
    const totalMatch3 = progressText3?.match(/\/(\d+)/);
    const total3 = totalMatch3 ? parseInt(totalMatch3[1], 10) : 0;
    
    expect(total3).toBe(total1);
    
    await page.close();
  });

  test('複数回キャンセル・再開後に全件正しくチェックされる', async ({ context, extensionId }) => {
    // 長い遅延を追加してリクエストを確実に遅くする
    await setupNetworkMocks(context, [
      { pattern: 'example', status: 200, delay: 500 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを200件作成（実際の使用状況に近い）
    const dataCount = 200;
    for (let i = 0; i < dataCount; i++) {
      await createTestTabData(page, {
        url: `https://example${i}.com/page${i}`,
        title: `Example Page ${i}`,
      });
    }
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // ダイアログが開いたことを確認
    await expect(page.locator(selectors.linkCheckDialog)).toBeVisible();
    
    // 5回キャンセル・再開を繰り返す
    for (let i = 0; i < 5; i++) {
      // キャンセルボタンが表示されるまで待機（チェック中であること）
      const cancelButton = page.locator(selectors.linkCheckCancelButton);
      try {
        await expect(cancelButton).toBeVisible({ timeout: 15000 });
      } catch {
        // チェックが完了した場合はループを抜ける
        break;
      }
      
      // 少し待ってからキャンセル
      await wait(500);
      
      // まだキャンセルボタンが表示されているか確認
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // 再開ボタンが表示されるまで待機
        const resumeButton = page.locator('.btn-resume');
        await expect(resumeButton).toBeVisible({ timeout: 5000 });
        
        // 少し待ってから再開
        await wait(200);
        await resumeButton.click();
      }
    }
    
    // チェック完了を待機（100%になるまで）
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('100%');
    }, { timeout: 300000 });  // 5分タイムアウト
    
    // 最終的な進捗を確認
    const finalProgressText = await page.locator(selectors.linkCheckProgressText).textContent();
    
    // checked/total の形式から数値を抽出
    const progressMatch = finalProgressText?.match(/(\d+)\/(\d+)/);
    expect(progressMatch).not.toBeNull();
    
    const checked = parseInt(progressMatch![1], 10);
    const total = parseInt(progressMatch![2], 10);
    
    // checked と total が一致することを確認（全件チェック完了）
    expect(checked).toBe(total);
    
    // total が作成したデータ件数以上であることを確認
    expect(total).toBeGreaterThanOrEqual(dataCount);
    
    // 100% であることを確認
    expect(finalProgressText).toMatch(/100%/);
    
    // 閉じるボタンが表示されていることを確認（完了状態）
    await expect(page.locator(selectors.linkCheckCloseButton)).toBeVisible();
    
    // 統計の合計が checked と一致することを確認
    const aliveText = await page.locator(selectors.statAlive).textContent() || '';
    const deadText = await page.locator(selectors.statDead).textContent() || '';
    const warningText = await page.locator(selectors.statWarning).textContent() || '';
    
    const aliveNum = parseInt(aliveText.match(/\d+/)?.[0] || '0', 10);
    const deadNum = parseInt(deadText.match(/\d+/)?.[0] || '0', 10);
    const warningNum = parseInt(warningText.match(/\d+/)?.[0] || '0', 10);
    
    // 統計の合計がchecked数と一致
    expect(aliveNum + deadNum + warningNum).toBe(checked);
    
    await page.close();
  });

  test('複数ステータスコードでのチェック', async ({ context, extensionId }) => {
    // 異なるステータスコードを返すモック
    await setupNetworkMocks(context, [
      { pattern: 'ok.example.com', status: 200 },
      { pattern: 'redirect.example.com', status: 301 },
      { pattern: 'notfound.example.com', status: 404 },
      { pattern: 'error.example.com', status: 500 },
    ]);

    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    
    // テストデータを作成（4件）
    await createTestTabData(page, {
      url: 'https://ok.example.com/page',
      title: 'OK Page (200)',
      domain: 'ok.example.com',
    });
    await createTestTabData(page, {
      url: 'https://redirect.example.com/page',
      title: 'Redirect Page (301)',
      domain: 'redirect.example.com',
    });
    await createTestTabData(page, {
      url: 'https://notfound.example.com/page',
      title: 'Not Found Page (404)',
      domain: 'notfound.example.com',
    });
    await createTestTabData(page, {
      url: 'https://error.example.com/page',
      title: 'Error Page (500)',
      domain: 'error.example.com',
    });
    
    await page.reload();
    await page.waitForSelector('.tab-card');
    
    // リンクチェックを開始
    await page.click(selectors.linkCheckButton);
    
    // チェック完了を待機
    await page.waitForFunction(() => {
      const text = document.querySelector('.link-check-progress-text')?.textContent || '';
      return text.includes('4/4');
    }, { timeout: 30000 });
    
    // 結果が表示されていることを確認
    const resultItems = await page.locator(selectors.linkCheckResultItem).count();
    expect(resultItems).toBe(4);
    
    // 各ステータスの合計が4になることを確認
    const aliveText = await page.locator(selectors.statAlive).textContent() || '';
    const deadText = await page.locator(selectors.statDead).textContent() || '';
    const warningText = await page.locator(selectors.statWarning).textContent() || '';
    
    // 数値を抽出
    const aliveNum = parseInt(aliveText.match(/\d+/)?.[0] || '0', 10);
    const deadNum = parseInt(deadText.match(/\d+/)?.[0] || '0', 10);
    const warningNum = parseInt(warningText.match(/\d+/)?.[0] || '0', 10);
    
    expect(aliveNum + deadNum + warningNum).toBe(4);
    
    await page.close();
  });
});

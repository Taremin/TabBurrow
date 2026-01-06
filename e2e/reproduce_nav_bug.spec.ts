
import { test, expect, getExtensionUrl } from './fixtures';
import { waitForPageLoad, clearTestData, createCustomGroupData, tabsPageSelectors } from './helpers';

test.describe('ナビゲーション不具合の再現', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getExtensionUrl(extensionId, 'options.html'));
    await waitForPageLoad(page);
    await clearTestData(page);
    await page.close();
  });

  test('タブカードのバッジをクリックした際、対象のグループに正しくスクロールされること', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`BROWSER [test]: ${msg.text()}`));
    
    // データを準備 (少なめにして確実にDOMに存在させる)
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    await createCustomGroupData(page, [
      { name: 'Group A', sortOrder: 0 },
      { name: 'Group B', sortOrder: 1 },
    ]);

    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const req = indexedDB.open('TabBurrowDB', 5);
        req.onsuccess = () => resolve(req.result);
      });
      const trans = db.transaction(['tabs'], 'readwrite');
      const store = trans.objectStore('tabs');
      const now = Date.now();
      
      // Group A (2 tabs)
      for (let i = 0; i < 2; i++) {
        store.add({
          id: `a-${i}`, url: `https://a.example.com/${i}`, title: `Tab A ${i}`,
          domain: 'a.example.com', group: 'Group A', groupType: 'custom', 
          customGroups: ['Group A', 'Group B'],
          lastAccessed: now - i * 1000, savedAt: now - i * 1000, screenshot: new Blob([]), favIconUrl: ''
        });
      }
      // Group B (2 tabs)
      for (let i = 0; i < 2; i++) {
        store.add({
          id: `b-${i}`, url: `https://b.example.com/${i}`, title: `Tab B ${i}`,
          domain: 'b.example.com', group: 'Group B', groupType: 'custom', 
          customGroups: ['Group B'],
          lastAccessed: now - i * 1000 - 100000, savedAt: now - i * 1000 - 100000, screenshot: new Blob([]), favIconUrl: ''
        });
      }
      return new Promise((resolve) => trans.oncomplete = resolve);
    });

    // リロード
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // --- 通常のスクロール検証 ---
    const firstTabInA = page.locator(tabsPageSelectors.tabCard).first();
    const groupBTag = firstTabInA.getByTestId('group-tag').filter({ hasText: 'Group B' });
    await expect(groupBTag).toBeVisible();

    console.log('Testing normal scroll...');
    await groupBTag.click();
    await page.waitForTimeout(1000);

    const groupBHeader = page.locator(tabsPageSelectors.groupHeader, { hasText: 'Group B' });
    await expect(groupBHeader).toBeVisible();

    // --- 折りたたみ展開検証 ---
    console.log('Testing expand and scroll...');
    // Group B を折りたたむ
    await groupBHeader.click();
    await expect(page.locator(tabsPageSelectors.tabCard, { hasText: 'Tab B 0' })).not.toBeVisible();

    // Group A のバッジをクリックして展開スクロールさせる
    await groupBTag.click();
    await page.waitForTimeout(2000);

    // 展開されていることを確認
    await expect(page.locator(tabsPageSelectors.tabCard, { hasText: 'Tab B 0' })).toBeVisible();
    
    // スクロール位置 (Yが小さいこと)
    const box = await groupBHeader.boundingBox();
    console.log(`Final Group B Header Y: ${box?.y}`);
    expect(box?.y).toBeLessThan(300);
  });
});

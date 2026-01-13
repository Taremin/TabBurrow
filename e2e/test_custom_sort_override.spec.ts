import { test, expect, getExtensionUrl } from './fixtures';
import { clearTestData, createTestTabData, tabsPageSelectors, optionsPageSelectors } from './helpers';

test.describe('Custom Sort Key Order Override', () => {
    test.beforeEach(async ({ page, extensionId }) => {
        await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
        await clearTestData(page);
    });

    test('should override global custom sort key order per group', async ({ page, extensionId }) => {
        const tabsUrl = getExtensionUrl(extensionId, 'tabs.html');
        const optionsUrl = getExtensionUrl(extensionId, 'options.html');

        // 1. テストデータの投入
        // a.com グループ
        await createTestTabData(page, { url: 'https://a.com/1', title: 'Page A1', domain: 'a.com', group: 'a.com', sortKey: '10' });
        await createTestTabData(page, { url: 'https://a.com/2', title: 'Page A2', domain: 'a.com', group: 'a.com', sortKey: '20' });
        // b.com グループ
        await createTestTabData(page, { url: 'https://b.com/1', title: 'Page B1', domain: 'b.com', group: 'b.com', sortKey: '10' });
        await createTestTabData(page, { url: 'https://b.com/2', title: 'Page B2', domain: 'b.com', group: 'b.com', sortKey: '20' });

        // リロードして反映
        await page.reload();
        await page.waitForSelector(tabsPageSelectors.tabCard);

        // a.com をピン留めする (ピン留めグループのみ個別ソートが可能)
        const pinBtnA = page.locator('[data-testid="group-header"]').filter({ hasText: 'a.com' }).locator(tabsPageSelectors.pinButton);
        await pinBtnA.click();
        await expect(pinBtnA).toHaveClass(/pinned/);
        console.log('Group "a.com" pinned successfully');

        // 2. オプション画面でデフォルトのカスタムソートキー順を 'desc' (降順) に設定
        await page.goto(optionsUrl);
        const customSortSelect = page.locator('[data-testid="global-custom-sort-key-order-select"]');
        await customSortSelect.waitFor({ state: 'visible' });
        await customSortSelect.selectOption('desc');
        
        // 保存
        await page.click(optionsPageSelectors.submitButton);
        await page.waitForSelector('.save-status:has-text("✓")', { state: 'visible' });

        // 3. タブ管理画面で確認
        await page.goto(tabsUrl);
        await page.waitForSelector(tabsPageSelectors.tabCard);
        
        // a.com も b.com も降順 (20 -> 10) になっているはず
        const getTitlesInGroup = async (groupTitle: string) => {
            const cards = page.locator(`[data-testid="tab-card"][data-group-name="${groupTitle}"]`);
            const titles = await cards.locator('[data-testid="tab-title"]').allTextContents();
            console.log(`Group "${groupTitle}" titles:`, titles);
            return titles;
        };

        const titlesA_desc = await getTitlesInGroup('a.com');
        const titlesB_desc = await getTitlesInGroup('b.com');
        
        expect(titlesA_desc[0]).toContain('A2');
        expect(titlesB_desc[0]).toContain('B2');

        // 4. a.com だけ個別に 'asc' (昇順) に設定
        // a.com のソートメニューを開く
        const groupAHeader = page.locator('[data-testid="group-header"]').filter({ hasText: 'a.com' });
        const sortBtnA = groupAHeader.locator(tabsPageSelectors.groupActionButton);
        console.log('Sort Button A exists:', await sortBtnA.count() > 0);
        await sortBtnA.click();
        await page.waitForSelector('.group-sort-menu', { state: 'visible' });
        
        // カスタムソートキー順の 'asc' を選択
        await page.click('[data-testid="group-custom-sort-key-order-asc"]');
        await page.waitForTimeout(500);

        // 5. 反映を確認
        const titlesA_asc = await getTitlesInGroup('a.com');
        const titlesB_still_desc = await getTitlesInGroup('b.com');
        
        console.log('Group A (individual asc):', titlesA_asc);
        console.log('Group B (still global desc):', titlesB_still_desc);
        
        expect(titlesA_asc[0]).toContain('A1'); // a.com は昇順
        expect(titlesB_still_desc[0]).toContain('B2'); // b.com は降順のまま (グローバル設定に従う)

        // 6. リロードして個別設定が保持されているか確認
        await page.reload();
        await page.waitForSelector(tabsPageSelectors.tabCard);
        
        const titlesA_after = await getTitlesInGroup('a.com');
        expect(titlesA_after[0]).toContain('A1');
    });
});

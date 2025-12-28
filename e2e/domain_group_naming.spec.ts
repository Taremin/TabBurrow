/**
 * ドメイングループ名変更機能のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors, waitForPageLoad, createTestTabData, clearTestData } from './helpers';

test.describe('ドメイングループ名変更', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    // データのクリアと初期データの作成
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await clearTestData(page);

    // テストデータの作成 (example.com)
    await createTestTabData(page, {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
    });
    
    // タブマネージャーをリロードして反映
    await page.reload();
    await waitForPageLoad(page);
    await page.close();
  });

  test('タブマネージャーからドメイングループ名を変更できる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // グループヘッダーを探す (example.com)
    const groupHeader = page.locator('.group-header').filter({ hasText: 'example.com' }).first();
    await groupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await groupHeader.scrollIntoViewIfNeeded();
    await groupHeader.hover();
    console.log('Group Header HTML:', await groupHeader.innerHTML());

    // 編集ボタンをクリック
    // Locatorで見つからない問題があるためJSでクリック
    await groupHeader.evaluate(el => {
      const btn = el.querySelector('.group-edit') as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found in JS');
    });

    // ダイアログが表示されるのを待つ
    const dialogInput = page.locator('.dialog input');
    await expect(dialogInput).toBeVisible();
    await expect(dialogInput).toHaveValue('example.com');

    // 新しい名前を入力
    await dialogInput.fill('My Example Domain');
    
    // 保存ボタンをクリック (PromptDialogのConfirmボタン)
    await page.locator('.dialog .btn-primary').click();

    // ダイアログが閉じるのを待つ
    await expect(page.locator('.dialog')).not.toBeVisible();

    // グループ名が更新されていることを確認
    // リネーム後は表示名が変わるので、古い名前でのフィルタリングを外して新しい名前を待つ
    const renamedGroupHeader = page.locator('.group-header').filter({ hasText: 'My Example Domain' }).first();
    await expect(renamedGroupHeader.locator('.group-domain')).toHaveText('My Example Domain');

    // リロードしても維持されるか確認
    await page.reload();
    await waitForPageLoad(page);
    const reloadedGroupHeader = page.locator('.group-header').filter({ hasText: 'My Example Domain' }).first();
    await expect(reloadedGroupHeader).toBeVisible();
  });

  test('設定画面でエイリアスを確認・編集・削除できる', async ({ context, extensionId }) => {
    // まずタブマネージャーでエイリアスを設定
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // まずタブマネージャーでエイリアスを設定
    const groupHeader = page.locator('.group-header').filter({ hasText: 'example.com' }).first();
    await groupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await groupHeader.scrollIntoViewIfNeeded();
    await groupHeader.hover();
    await groupHeader.evaluate(el => {
      const btn = el.querySelector('.group-edit') as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found in JS');
    });
    await page.locator('.dialog input').fill('Settings Test Alias');
    await page.locator('.dialog .btn-primary').click();

    // 設定画面へ移動
    await page.locator('a[href="options.html"]').click();
    await waitForPageLoad(page);
    await expect(page.url()).toContain('options.html');

    // ドメイングループ設定セクションを探す
    const domainSettings = page.locator('.domain-groups-settings');
    await expect(domainSettings).toBeVisible();

    // エイリアスが表示されているか確認
    const aliasItem = domainSettings.locator('.custom-group-item').filter({ hasText: 'example.com' });
    await expect(aliasItem).toBeVisible();
    await expect(aliasItem).toContainText('Settings Test Alias');

    // 編集ボタンをクリック
    await aliasItem.locator('button[title*="編集"], button[title*="Edit"]').first().click();

    // 編集ダイアログで名前を変更
    const editInput = page.locator('.dialog input');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Settings Test Alias');
    await editInput.fill('Updated Alias');
    await page.locator('.dialog .btn-primary').click();

    // 更新されたか確認
    await expect(aliasItem).toContainText('Updated Alias');

    // 削除ボタンをクリック
    await aliasItem.locator('button[title*="削除"], button[title*="Delete"]').first().click();

    // 削除確認ダイアログ (DialogOverlayを使用しているため .dialog-overlay または内部の .dialog を探す)
    await expect(page.locator('.dialog-overlay .dialog')).toBeVisible();
    await page.locator('.dialog-overlay .btn-danger').click();

    // 重要：設定を保存するために「更新」ボタンをクリック
    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    // 保存成功のメッセージを待つ（オプション）
    // await expect(page.locator('.save-status')).toContainText('成功');

    // リストから消えたか確認
    await expect(aliasItem).not.toBeVisible();
    
    // タブマネージャーに戻って確認
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);
    await page.reload(); // 確実に最新状態を反映させる
    await waitForPageLoad(page);
    
    // 元のドメイン名に戻っているはず（.group-domain 要素を直接確認）
    const groupHeaderFinal = page.locator('.group-header').filter({ hasText: 'example.com' }).first();
    await expect(groupHeaderFinal.locator('.group-domain')).toHaveText('example.com');
    await expect(page.locator('.group-header').filter({ hasText: 'Updated Alias' })).not.toBeVisible();
  });
});

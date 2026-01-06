/**
 * ドメイングループ名変更機能のE2Eテスト
 */
import { test, expect, getExtensionUrl } from './fixtures';
import { tabsPageSelectors, optionsPageSelectors, waitForPageLoad, createTestTabData, clearTestData } from './helpers';

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
    const groupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
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
    const renamedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'My Example Domain' }).first();
    await expect(renamedGroupHeader.locator('.group-domain')).toHaveText('My Example Domain');

    // リロードしても維持されるか確認
    await page.reload();
    await waitForPageLoad(page);
    const reloadedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'My Example Domain' }).first();
    await expect(reloadedGroupHeader).toBeVisible();
  });

  test('設定画面でエイリアスを確認・編集・削除できる', async ({ context, extensionId }) => {
    // まずタブマネージャーでエイリアスを設定
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // まずタブマネージャーでエイリアスを設定
    const groupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
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
    const domainSettings = page.locator(optionsPageSelectors.domainGroupsSection);
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
    const saveButton = page.locator(optionsPageSelectors.submitButton);
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
    const groupHeaderFinal = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await expect(groupHeaderFinal.locator('.group-domain')).toHaveText('example.com');
    await expect(page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'Updated Alias' })).not.toBeVisible();
  });

  test('エイリアス設定後、グループヘッダーに元のドメイン名が薄く表示される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // グループヘッダーを探す (example.com)
    const groupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await groupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await groupHeader.scrollIntoViewIfNeeded();
    await groupHeader.hover();

    // エイリアス設定前は元ドメイン名が表示されていないことを確認
    await expect(groupHeader.locator('.group-original-domain')).not.toBeVisible();

    // 編集ボタンをクリック
    await groupHeader.evaluate(el => {
      const btn = el.querySelector('.group-edit') as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found in JS');
    });

    // 新しい名前を入力
    const dialogInput = page.locator('.dialog input');
    await expect(dialogInput).toBeVisible();
    await dialogInput.fill('My Custom Alias');
    await page.locator('.dialog .btn-primary').click();
    await expect(page.locator('.dialog')).not.toBeVisible();

    // グループヘッダーを再度取得
    const renamedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'My Custom Alias' }).first();
    await expect(renamedGroupHeader).toBeVisible();

    // エイリアス名が表示されている
    await expect(renamedGroupHeader.locator('.group-domain')).toHaveText('My Custom Alias');

    // 元のドメイン名が薄く表示されている
    const originalDomain = renamedGroupHeader.locator('.group-original-domain');
    await expect(originalDomain).toBeVisible();
    await expect(originalDomain).toHaveText('example.com');

    // リロード後も維持されることを確認
    await page.reload();
    await waitForPageLoad(page);

    const reloadedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'My Custom Alias' }).first();
    await expect(reloadedGroupHeader.locator('.group-domain')).toHaveText('My Custom Alias');
    await expect(reloadedGroupHeader.locator('.group-original-domain')).toHaveText('example.com');
  });

  test('エイリアス設定済みドメイングループのダイアログで現在のエイリアスが初期値になる', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // まずエイリアスを設定
    const groupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await groupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await groupHeader.scrollIntoViewIfNeeded();
    await groupHeader.hover();
    await groupHeader.evaluate((el, selector) => {
      const btn = el.querySelector(selector) as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found');
    }, tabsPageSelectors.groupRenameButton);

    const dialogInput = page.locator('.dialog input');
    await expect(dialogInput).toBeVisible();
    await dialogInput.fill('First Alias');
    await page.locator('.dialog .btn-primary').click();
    await expect(page.locator('.dialog')).not.toBeVisible();

    // 再度編集ダイアログを開き、初期値が設定したエイリアスになっていることを確認
    const renamedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'First Alias' }).first();
    await renamedGroupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await renamedGroupHeader.scrollIntoViewIfNeeded();
    await renamedGroupHeader.hover();
    await renamedGroupHeader.evaluate((el, selector) => {
      const btn = el.querySelector(selector) as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found');
    }, tabsPageSelectors.groupRenameButton);

    const dialogInput2 = page.locator('.dialog input');
    await expect(dialogInput2).toBeVisible();
    // 初期値がエイリアス名になっている（ドメイン名ではない）
    await expect(dialogInput2).toHaveValue('First Alias');

    await page.locator('.dialog .btn-secondary').click(); // キャンセル
  });

  test('ドメイングループの表示名を空にするとエイリアスが削除される', async ({ context, extensionId }) => {
    const page = await context.newPage();
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    await page.goto(getExtensionUrl(extensionId, 'tabs.html'));
    await waitForPageLoad(page);

    // まずエイリアスを設定
    const groupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await groupHeader.waitFor({ state: 'visible', timeout: 5000 });
    await groupHeader.scrollIntoViewIfNeeded();
    await groupHeader.hover();
    await groupHeader.evaluate((el, selector) => {
      const btn = el.querySelector(selector) as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found');
    }, tabsPageSelectors.groupRenameButton);

    const dialogInput = page.locator('.dialog input');
    await expect(dialogInput).toBeVisible();
    await dialogInput.fill('Temporary Alias');
    await page.locator('.dialog .btn-primary').click();
    await expect(page.locator('.dialog')).not.toBeVisible();

    // エイリアスが設定されたことを確認
    const renamedGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'Temporary Alias' }).first();
    await expect(renamedGroupHeader).toBeVisible();

    // 再度編集ダイアログを開き、空文字に変更
    await renamedGroupHeader.scrollIntoViewIfNeeded();
    await renamedGroupHeader.hover();
    await renamedGroupHeader.evaluate((el, selector) => {
      const btn = el.querySelector(selector) as HTMLElement;
      if (btn) btn.click();
      else throw new Error('Edit button not found');
    }, tabsPageSelectors.groupRenameButton);

    const dialogInput2 = page.locator('.dialog input');
    await expect(dialogInput2).toBeVisible();
    
    // ダイアログメッセージに「空にすると」の説明があることを確認
    const dialogMessage = page.locator('.dialog-message');
    await expect(dialogMessage).toContainText(/空にすると|empty/i);

    // 入力を空にする
    await dialogInput2.clear();
    
    // OKボタンが有効であることを確認（空入力でも押せる）
    const okButton = page.locator('.dialog .btn-primary');
    await expect(okButton).toBeEnabled();
    await okButton.click();
    await expect(page.locator('.dialog')).not.toBeVisible();

    // 元のドメイン名に戻っていることを確認
    const originalGroupHeader = page.locator(tabsPageSelectors.groupHeader).filter({ hasText: 'example.com' }).first();
    await expect(originalGroupHeader.locator('.group-domain')).toHaveText('example.com');
    // 元ドメイン表示は非表示になっている
    await expect(originalGroupHeader.locator('.group-original-domain')).not.toBeVisible();
  });
});

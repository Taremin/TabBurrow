/**
 * contextMenu.ts - コンテキストメニュー関連処理
 * 右クリックメニューの作成・更新・ハンドリングを担当
 */

import browser from '../browserApi.js';
import type { Menus, Tabs } from 'webextension-polyfill';
import { saveTabs, saveTabsForCustomGroup, getAllCustomGroups, createCustomGroup, findTabByUrl, deleteTab, type SavedTab } from '../storage.js';
import { t } from '../i18n.js';
import { extractDomain, openTabManagerPage, getTabScreenshot, saveAndCloseTabs } from './tabSaver.js';

// メニューIDの定数
// ページコンテキストメニュー用
const TABBURROW_MENU_ID = 'tabburrow';
const PARENT_MENU_ID = 'save-to-custom-group';
const NEW_GROUP_MENU_ID = 'create-new-custom-group';
const REMOVE_AND_CLOSE_MENU_ID = 'remove-and-close';
const TABBURROW_OPEN_MANAGER_ID = 'tabburrow-open-manager';
const CUSTOM_GROUP_MENU_PREFIX = 'save-to-custom-group-';

// 拡張アイコンコンテキストメニュー用（アクション）
const ACTION_PARENT_MENU_ID = 'action-save-to-custom-group';
const ACTION_NEW_GROUP_MENU_ID = 'action-create-new-custom-group';
const ACTION_REMOVE_AND_CLOSE_MENU_ID = 'action-remove-and-close';
const ACTION_CUSTOM_GROUP_MENU_PREFIX = 'action-save-to-custom-group-';

/**
 * コンテキストメニューを作成
 */
export function createContextMenus(): void {
  console.log('[contextMenu] Creating context menus...');
  
  // ==========================================
  // 拡張アイコンコンテキストメニュー (Context: action)
  // ==========================================

  // 1. タブ管理画面を開く（既存）
  browser.contextMenus.create({
    id: 'open-tab-manager',
    title: t('contextMenu.openManager'),
    contexts: ['action'],
  });

  // 2. カスタムグループに保存（親メニュー）
  browser.contextMenus.create({
    id: ACTION_PARENT_MENU_ID,
    title: t('contextMenu.saveToCustomGroup'),
    contexts: ['action'],
  });

  // 2-1. 新規グループ作成
  browser.contextMenus.create({
    id: ACTION_NEW_GROUP_MENU_ID,
    parentId: ACTION_PARENT_MENU_ID,
    title: t('contextMenu.newGroup'),
    contexts: ['action'],
  });

  // 3. 固定タブも含めてすべて収納（既存）
  browser.contextMenus.create({
    id: 'save-all-including-pinned',
    title: t('contextMenu.saveAllIncludingPinned'),
    contexts: ['action'],
  });

  // 4. タブ管理から削除して閉じる
  browser.contextMenus.create({
    id: ACTION_REMOVE_AND_CLOSE_MENU_ID,
    title: t('contextMenu.removeAndClose'),
    contexts: ['action'],
  });


  // ==========================================
  // ページコンテキストメニュー (Context: page, frame)
  // ==========================================

  // 1. TabBurrow親メニュー
  browser.contextMenus.create({
    id: TABBURROW_MENU_ID,
    title: t('contextMenu.tabBurrow'),
    contexts: ['page', 'frame'],
  });

  // 1-1. タブ管理画面を開く
  browser.contextMenus.create({
    id: TABBURROW_OPEN_MANAGER_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.openManager'),
    contexts: ['page', 'frame'],
  });

  // 1-2. カスタムグループに保存（親メニュー）
  browser.contextMenus.create({
    id: PARENT_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.saveToCustomGroup'),
    contexts: ['page', 'frame'],
  });

  // 1-2-1. 新規グループ作成
  browser.contextMenus.create({
    id: NEW_GROUP_MENU_ID,
    parentId: PARENT_MENU_ID,
    title: t('contextMenu.newGroup'),
    contexts: ['page', 'frame'],
  });

  // 1-3. タブ管理から削除して閉じる
  browser.contextMenus.create({
    id: REMOVE_AND_CLOSE_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.removeAndClose'),
    contexts: ['page', 'frame'],
  });

  console.log('[contextMenu] Context menus creation initiated');
}

/**
 * カスタムグループサブメニューを更新
 */
export async function updateCustomGroupMenus(): Promise<void> {
  try {
    const groups = await getAllCustomGroups();
    
    // 既存のカスタムグループメニューを削除
    // browser.contextMenus.removeAll()は使わず、個別に削除
    for (const group of groups) {
      try {
        await browser.contextMenus.remove(CUSTOM_GROUP_MENU_PREFIX + group.name);
      } catch { /* 無視 */ }
      try {
        await browser.contextMenus.remove(ACTION_CUSTOM_GROUP_MENU_PREFIX + group.name);
      } catch { /* 無視 */ }
    }
    
    // 最新のグループリストでメニューを再作成
    const freshGroups = await getAllCustomGroups();
    for (const group of freshGroups) {
      // ページ用
      browser.contextMenus.create({
        id: CUSTOM_GROUP_MENU_PREFIX + group.name,
        parentId: PARENT_MENU_ID,
        title: group.name,
        contexts: ['page', 'frame'],
      });
      // 拡張アイコン用
      browser.contextMenus.create({
        id: ACTION_CUSTOM_GROUP_MENU_PREFIX + group.name,
        parentId: ACTION_PARENT_MENU_ID,
        title: group.name,
        contexts: ['action'],
      });
    }
  } catch (error) {
    console.error('カスタムグループメニューの更新に失敗:', error);
  }
}

/**
 * コンテキストメニュークリック時のハンドラ
 */
export async function handleContextMenuClick(
  info: Menus.OnClickData,
  tab?: Tabs.Tab
): Promise<void> {
  const { menuItemId } = info;

  // タブ管理画面を開く
  if (menuItemId === 'open-tab-manager' || menuItemId === TABBURROW_OPEN_MANAGER_ID) {
    await openTabManagerPage();
    return;
  }

  // 固定タブも含めてすべて収納
  if (menuItemId === 'save-all-including-pinned') {
    await handleSaveAllIncludingPinned(tab);
    return;
  }
  
  // 削除して閉じる
  if ((menuItemId === REMOVE_AND_CLOSE_MENU_ID || menuItemId === ACTION_REMOVE_AND_CLOSE_MENU_ID) && tab?.url) {
    await handleRemoveAndClose(tab);
    return;
  }

  // 新規グループ作成
  if ((menuItemId === NEW_GROUP_MENU_ID || menuItemId === ACTION_NEW_GROUP_MENU_ID) && tab?.url) {
    await handleCreateNewGroupAndSave(tab);
    return;
  }

  // カスタムグループに保存
  if (typeof menuItemId === 'string' && tab?.url) {
    // ページ用メニュー
    if (menuItemId.startsWith(CUSTOM_GROUP_MENU_PREFIX)) {
      const groupName = menuItemId.slice(CUSTOM_GROUP_MENU_PREFIX.length);
      await handleSaveToCustomGroup(tab, groupName);
      return;
    }
    // 拡張アイコン用メニュー
    if (menuItemId.startsWith(ACTION_CUSTOM_GROUP_MENU_PREFIX)) {
      const groupName = menuItemId.slice(ACTION_CUSTOM_GROUP_MENU_PREFIX.length);
      await handleSaveToCustomGroup(tab, groupName);
      return;
    }
  }
}

/**
 * 固定タブも含めてすべてのタブを保存
 */
async function handleSaveAllIncludingPinned(clickedTab?: Tabs.Tab): Promise<void> {
  // 現在のウィンドウのすべてのタブを取得（固定タブも含む）
  const tabs = await browser.tabs.query({
    currentWindow: true,
  });

  // 保存対象のタブをフィルタリング
  // 特殊URLは除外（chrome://, edge://, about:, 拡張機能ページなど）
  const validTabs = tabs.filter(tab => {
    if (!tab.url || tab.id === undefined) return false;
    // 特殊URLは除外
    return /^(https?|file):\/\//i.test(tab.url);
  });

  if (validTabs.length === 0) {
    console.log('保存対象のタブがありません');
    return;
  }

  await saveAndCloseTabs(validTabs, {
    activeTabWindowId: clickedTab?.windowId,
    openTabManager: true,
  });
}

/**
 * 新規グループを作成してタブを保存
 */
async function handleCreateNewGroupAndSave(tab: Tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  // ブラウザのpromptでグループ名を入力
  // Content Scriptを使ってpromptを表示
  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => prompt('グループ名を入力してください:'),
  });
  
  const groupName = results[0]?.result;
  if (!groupName || typeof groupName !== 'string' || !groupName.trim()) {
    return; // キャンセルまたは空の場合
  }
  
  try {
    // グループを作成
    await createCustomGroup(groupName.trim());
    
    // カスタムグループメニューを更新
    await updateCustomGroupMenus();
    
    // タブを保存
    await handleSaveToCustomGroup(tab, groupName.trim());
  } catch (error) {
    console.error('新規グループの作成に失敗:', error);
  }
}

/**
 * タブをカスタムグループに保存
 */
async function handleSaveToCustomGroup(tab: Tabs.Tab, groupName: string): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    const now = Date.now();
    const screenshot = await getTabScreenshot(tab, {
      activeTabWindowId: tab.active ? tab.windowId : undefined,
    });
    
    const domain = extractDomain(tab.url);
    const savedTab: SavedTab = {
      id: crypto.randomUUID(),
      url: tab.url,
      title: tab.title || 'Untitled',
      domain,
      group: groupName,      // カスタムグループ名
      groupType: 'custom',   // カスタムグループタイプ
      favIconUrl: tab.favIconUrl || '',
      screenshot,
      lastAccessed: tab.lastAccessed || now,
      savedAt: now,
    };
    
    await saveTabsForCustomGroup([savedTab]);
    console.log(`タブを「${groupName}」グループに保存しました: ${tab.url}`);
    
    // タブ管理画面に変更を通知
    browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
    
    // タブを閉じる
    await browser.tabs.remove(tab.id);
  } catch (error) {
    console.error('カスタムグループへの保存に失敗:', error);
  }
}

/**
 * URLが保存対象かどうかを判定（http/https/fileのみ対象）
 */
export function isSaveableUrl(url: string): boolean {
  return /^(https?|file):\/\//i.test(url);
}

/**
 * タブ管理から削除してブラウザタブを閉じる
 */
async function handleRemoveAndClose(tab: Tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    // タブがストレージに保存されているか確認
    const savedTab = await findTabByUrl(tab.url);
    
    if (savedTab) {
      // ストレージから削除
      await deleteTab(savedTab.id);
      console.log(`タブ管理から削除しました: ${tab.url}`);
      
      // タブ管理画面に変更を通知
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
    } else {
      console.log(`タブ管理に存在しません: ${tab.url}`);
    }
    
    // ブラウザタブを閉じる
    await browser.tabs.remove(tab.id);
  } catch (error) {
    console.error('タブ管理からの削除に失敗:', error);
  }
}

/**
 * コンテキストメニューの表示/非表示を更新
 */
export async function updateContextMenuVisibility(tab: Tabs.Tab): Promise<void> {
  if (!tab.url) return;
  
  // 保存対象外のURL（拡張ページ、ブラウザ内部ページなど）ではメニューを非表示
  if (!isSaveableUrl(tab.url)) {
    browser.contextMenus.update(TABBURROW_MENU_ID, { visible: false });
    // アクションメニューの削除して閉じるを無効化（API制限でvisible制御できない場合があるためenabledで制御）
    browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { enabled: false });
    return;
  }
  
  // 保存対象のURLではTabBurrowメニューを表示
  browser.contextMenus.update(TABBURROW_MENU_ID, { visible: true });
  
  // タブがストレージに保存されているか確認し、「削除して閉じる」メニューの有効/無効を設定
  const savedTab = await findTabByUrl(tab.url);
  const isSaved = savedTab !== null;
  
  browser.contextMenus.update(REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
  browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
}

/**
 * コンテキストメニューのタイトルを更新（言語設定変更時）
 */
export function updateContextMenuTitles(): void {
  // 共通・既存
  browser.contextMenus.update('open-tab-manager', { title: t('contextMenu.openManager') });
  browser.contextMenus.update('save-all-including-pinned', { title: t('contextMenu.saveAllIncludingPinned') });

  // ページ用
  browser.contextMenus.update(TABBURROW_MENU_ID, { title: t('contextMenu.tabBurrow') });
  browser.contextMenus.update(TABBURROW_OPEN_MANAGER_ID, { title: t('contextMenu.openManager') });
  browser.contextMenus.update(PARENT_MENU_ID, { title: t('contextMenu.saveToCustomGroup') });
  browser.contextMenus.update(NEW_GROUP_MENU_ID, { title: t('contextMenu.newGroup') });
  browser.contextMenus.update(REMOVE_AND_CLOSE_MENU_ID, { title: t('contextMenu.removeAndClose') });

  // 拡張アイコン用
  browser.contextMenus.update(ACTION_PARENT_MENU_ID, { title: t('contextMenu.saveToCustomGroup') });
  browser.contextMenus.update(ACTION_NEW_GROUP_MENU_ID, { title: t('contextMenu.newGroup') });
  browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { title: t('contextMenu.removeAndClose') });
}

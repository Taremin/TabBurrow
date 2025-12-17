/**
 * contextMenu.ts - コンテキストメニュー関連処理
 * 右クリックメニューの作成・更新・ハンドリングを担当
 */

import browser from '../browserApi.js';
import type { Menus, Tabs } from 'webextension-polyfill';
import { saveTabs, saveTabsForCustomGroup, getAllCustomGroups, createCustomGroup, type SavedTab } from '../storage.js';
import { t } from '../i18n.js';
import { extractDomain, openTabManagerPage, getTabScreenshot, saveAndCloseTabs } from './tabSaver.js';

// カスタムグループメニューIDのプレフィックス
const CUSTOM_GROUP_MENU_PREFIX = 'save-to-custom-group-';
const NEW_GROUP_MENU_ID = 'create-new-custom-group';
const PARENT_MENU_ID = 'save-to-custom-group';

/**
 * コンテキストメニューを作成
 */
export function createContextMenus(): void {
  console.log('[contextMenu] Creating context menus...');
  
  // コンテキストメニューを作成（拡張アイコン右クリック時に表示）
  browser.contextMenus.create({
    id: 'open-tab-manager',
    title: t('contextMenu.openManager'),
    contexts: ['action'], // 拡張アイコンのコンテキストメニューに表示
  });

  // 固定タブも含めてすべてしまうメニュー
  browser.contextMenus.create({
    id: 'save-all-including-pinned',
    title: t('contextMenu.saveAllIncludingPinned'),
    contexts: ['action'], // 拡張アイコンのコンテキストメニューに表示
  });

  // カスタムグループに保存する親メニュー
  browser.contextMenus.create({
    id: PARENT_MENU_ID,
    title: t('contextMenu.saveToCustomGroup'),
    contexts: ['page', 'frame'],
  });

  // 新規グループ作成オプション
  browser.contextMenus.create({
    id: NEW_GROUP_MENU_ID,
    parentId: PARENT_MENU_ID,
    title: t('contextMenu.newGroup'),
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
      } catch {
        // メニューが存在しない場合は無視
      }
    }
    
    // 最新のグループリストでメニューを再作成
    const freshGroups = await getAllCustomGroups();
    for (const group of freshGroups) {
      browser.contextMenus.create({
        id: CUSTOM_GROUP_MENU_PREFIX + group.name,
        parentId: PARENT_MENU_ID,
        title: group.name,
        contexts: ['page', 'frame'],
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
  if (info.menuItemId === 'open-tab-manager') {
    await openTabManagerPage();
  } else if (info.menuItemId === 'save-all-including-pinned') {
    await handleSaveAllIncludingPinned(tab);
  } else if (info.menuItemId === NEW_GROUP_MENU_ID && tab?.url) {
    await handleCreateNewGroupAndSave(tab);
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith(CUSTOM_GROUP_MENU_PREFIX) && tab?.url) {
    const groupName = info.menuItemId.slice(CUSTOM_GROUP_MENU_PREFIX.length);
    await handleSaveToCustomGroup(tab, groupName);
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
 * カスタムグループメニューの表示/非表示を更新
 */
export async function updateContextMenuVisibility(tab: Tabs.Tab): Promise<void> {
  if (!tab.url) return;
  
  // 保存対象外のURL（拡張ページ、ブラウザ内部ページなど）ではメニューを非表示
  if (!isSaveableUrl(tab.url)) {
    browser.contextMenus.update(PARENT_MENU_ID, { visible: false });
    return;
  }
  
  // 保存対象のURLではメニューを表示
  browser.contextMenus.update(PARENT_MENU_ID, { visible: true });
}

/**
 * コンテキストメニューのタイトルを更新（言語設定変更時）
 */
export function updateContextMenuTitles(): void {
  browser.contextMenus.update('open-tab-manager', { title: t('contextMenu.openManager') });
  browser.contextMenus.update('save-all-including-pinned', { title: t('contextMenu.saveAllIncludingPinned') });
  browser.contextMenus.update(PARENT_MENU_ID, { title: t('contextMenu.saveToCustomGroup') });
  browser.contextMenus.update(NEW_GROUP_MENU_ID, { title: t('contextMenu.newGroup') });
}


/**
 * contextMenu.ts - コンテキストメニュー関連処理
 * 右クリックメニューの作成・更新・ハンドリングを担当
 */

import browser from '../browserApi';
import type { Menus, Tabs } from 'webextension-polyfill';
import { getAllCustomGroups, findTabByUrl } from '../storage';
import { t } from '../i18n';
import { openTabManagerPage } from './tabSaver';
import { getSettings, matchAutoCloseRule } from '../settings';

// ハンドラのインポート
import { isSaveableUrl } from './contextMenuHandlers/utils';
export { isSaveableUrl }; // 外部への再エクスポート
import { 
  handleSaveAllIncludingPinned, 
  handleStashThisPage, 
  handleSaveToCustomGroup 
} from './contextMenuHandlers/saveHandlers';
import { 
  handleCreateNewGroupAndSave, 
  handleCreateGroupFromPattern 
} from './contextMenuHandlers/groupHandlers';
import { 
  handleRemoveAndClose, 
  handleExcludeFromAutoClose 
} from './contextMenuHandlers/actionHandlers';

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

// 自動収納除外メニュー用
const EXCLUDE_FROM_AUTO_CLOSE_MENU_ID = 'exclude-from-auto-close';
const ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID = 'action-exclude-from-auto-close';

// グループ作成メニュー用
const CREATE_GROUP_FROM_URL_MENU_ID = 'create-group-from-url';
const CREATE_GROUP_FROM_DOMAIN_MENU_ID = 'create-group-from-domain';
const ACTION_CREATE_GROUP_FROM_URL_MENU_ID = 'action-create-group-from-url';
const ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID = 'action-create-group-from-domain';

// このページを収納メニュー用
const STASH_THIS_PAGE_MENU_ID = 'stash-this-page';
const ACTION_STASH_THIS_PAGE_MENU_ID = 'action-stash-this-page';

/**
 * コンテキストメニューを作成
 */
export function createContextMenus(): void {
  console.log('[contextMenu] Creating context menus...');
  
  // ==========================================
  // 拡張アイコンコンテキストメニュー (Context: action)
  // ==========================================

  browser.contextMenus.create({
    id: 'open-tab-manager',
    title: t('contextMenu.openManager'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_PARENT_MENU_ID,
    title: t('contextMenu.saveToCustomGroup'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_NEW_GROUP_MENU_ID,
    parentId: ACTION_PARENT_MENU_ID,
    title: t('contextMenu.newGroup'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_STASH_THIS_PAGE_MENU_ID,
    title: t('contextMenu.stashThisPage'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: 'save-all-including-pinned',
    title: t('contextMenu.saveAllIncludingPinned'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_REMOVE_AND_CLOSE_MENU_ID,
    title: t('contextMenu.removeAndClose'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID,
    title: t('contextMenu.excludeFromAutoClose'),
    contexts: ['action'],
    enabled: false,
  });

  browser.contextMenus.create({
    id: ACTION_CREATE_GROUP_FROM_URL_MENU_ID,
    title: t('contextMenu.createGroupFromUrl'),
    contexts: ['action'],
  });

  browser.contextMenus.create({
    id: ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID,
    title: t('contextMenu.createGroupFromDomain'),
    contexts: ['action'],
  });

  // ==========================================
  // ページコンテキストメニュー (Context: page, frame)
  // ==========================================

  browser.contextMenus.create({
    id: TABBURROW_MENU_ID,
    title: t('contextMenu.tabBurrow'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: TABBURROW_OPEN_MANAGER_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.openManager'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: PARENT_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.saveToCustomGroup'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: NEW_GROUP_MENU_ID,
    parentId: PARENT_MENU_ID,
    title: t('contextMenu.newGroup'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: STASH_THIS_PAGE_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.stashThisPage'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: REMOVE_AND_CLOSE_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.removeAndClose'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: EXCLUDE_FROM_AUTO_CLOSE_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.excludeFromAutoClose'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: CREATE_GROUP_FROM_URL_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.createGroupFromUrl'),
    contexts: ['page', 'frame'],
  });

  browser.contextMenus.create({
    id: CREATE_GROUP_FROM_DOMAIN_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.createGroupFromDomain'),
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

  // このページを収納する
  if ((menuItemId === STASH_THIS_PAGE_MENU_ID || menuItemId === ACTION_STASH_THIS_PAGE_MENU_ID) && tab?.url) {
    await handleStashThisPage(tab);
    return;
  }
  
  // 削除して閉じる
  if ((menuItemId === REMOVE_AND_CLOSE_MENU_ID || menuItemId === ACTION_REMOVE_AND_CLOSE_MENU_ID) && tab?.url) {
    await handleRemoveAndClose(tab);
    return;
  }

  // 自動収納の対象外にする
  if ((menuItemId === EXCLUDE_FROM_AUTO_CLOSE_MENU_ID || menuItemId === ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID) && tab?.url) {
    await handleExcludeFromAutoClose(tab, updateContextMenuVisibility);
    return;
  }

  // 新規グループ作成
  if ((menuItemId === NEW_GROUP_MENU_ID || menuItemId === ACTION_NEW_GROUP_MENU_ID) && tab?.url) {
    await handleCreateNewGroupAndSave(tab, updateCustomGroupMenus);
    return;
  }

  // 現在のURLからグループ作成
  if ((menuItemId === CREATE_GROUP_FROM_URL_MENU_ID || menuItemId === ACTION_CREATE_GROUP_FROM_URL_MENU_ID) && tab?.url) {
    await handleCreateGroupFromPattern(tab, 'fullUrl', updateCustomGroupMenus);
    return;
  }

  // 現在のドメインからグループ作成
  if ((menuItemId === CREATE_GROUP_FROM_DOMAIN_MENU_ID || menuItemId === ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID) && tab?.url) {
    await handleCreateGroupFromPattern(tab, 'domain', updateCustomGroupMenus);
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
 * コンテキストメニューの表示/非表示を更新
 */
export async function updateContextMenuVisibility(tab: Tabs.Tab): Promise<void> {
  if (!tab.url) return;
  
  // 保存対象外のURLではメニューを非表示
  if (!isSaveableUrl(tab.url)) {
    try {
      await browser.contextMenus.update(TABBURROW_MENU_ID, { visible: false });
      await browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { enabled: false });
      await browser.contextMenus.update(ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: false });
      await browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_URL_MENU_ID, { enabled: false });
      await browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, { enabled: false });
      await browser.contextMenus.update(ACTION_STASH_THIS_PAGE_MENU_ID, { enabled: false });
    } catch { /* 無視 */ }
    return;
  }
  
  // 保存対象のURLではTabBurrowメニューを表示
  try {
    await browser.contextMenus.update(TABBURROW_MENU_ID, { visible: true });
    
    // タブがストレージに保存されているか確認
    const savedTab = await findTabByUrl(tab.url);
    const isSaved = savedTab !== null;
    
    await browser.contextMenus.update(REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
    await browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
    
    // 自動収納対象かどうかを確認
    const settings = await getSettings();
    const matchedRule = matchAutoCloseRule(
      { url: tab.url, title: tab.title },
      settings.autoCloseRules,
      settings.autoCloseRuleOrder
    );
    
    const isAlreadyExcluded = matchedRule?.action === 'exclude';
    const shouldEnableExclude = settings.autoCloseEnabled && !isAlreadyExcluded;
    
    await browser.contextMenus.update(EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: shouldEnableExclude });
    await browser.contextMenus.update(ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: shouldEnableExclude });
    
    await browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_URL_MENU_ID, { enabled: true });
    await browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, { enabled: true });
    await browser.contextMenus.update(ACTION_STASH_THIS_PAGE_MENU_ID, { enabled: true });
  } catch { /* 無視 */ }
}

/**
 * コンテキストメニューのタイトルを更新（言語設定変更時）
 */
export function updateContextMenuTitles(): void {
  const menuItems = [
    // 共通・既存
    { id: 'open-tab-manager', key: 'contextMenu.openManager' },
    { id: 'save-all-including-pinned', key: 'contextMenu.saveAllIncludingPinned' },

    // ページ用
    { id: TABBURROW_MENU_ID, key: 'contextMenu.tabBurrow' },
    { id: TABBURROW_OPEN_MANAGER_ID, key: 'contextMenu.openManager' },
    { id: PARENT_MENU_ID, key: 'contextMenu.saveToCustomGroup' },
    { id: NEW_GROUP_MENU_ID, key: 'contextMenu.newGroup' },
    { id: STASH_THIS_PAGE_MENU_ID, key: 'contextMenu.stashThisPage' },
    { id: REMOVE_AND_CLOSE_MENU_ID, key: 'contextMenu.removeAndClose' },
    { id: EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, key: 'contextMenu.excludeFromAutoClose' },
    { id: CREATE_GROUP_FROM_URL_MENU_ID, key: 'contextMenu.createGroupFromUrl' },
    { id: CREATE_GROUP_FROM_DOMAIN_MENU_ID, key: 'contextMenu.createGroupFromDomain' },

    // 拡張アイコン用
    { id: ACTION_PARENT_MENU_ID, key: 'contextMenu.saveToCustomGroup' },
    { id: ACTION_NEW_GROUP_MENU_ID, key: 'contextMenu.newGroup' },
    { id: ACTION_STASH_THIS_PAGE_MENU_ID, key: 'contextMenu.stashThisPage' },
    { id: ACTION_REMOVE_AND_CLOSE_MENU_ID, key: 'contextMenu.removeAndClose' },
    { id: ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, key: 'contextMenu.excludeFromAutoClose' },
    { id: ACTION_CREATE_GROUP_FROM_URL_MENU_ID, key: 'contextMenu.createGroupFromUrl' },
    { id: ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, key: 'contextMenu.createGroupFromDomain' },
  ];

  for (const item of menuItems) {
    try {
      browser.contextMenus.update(item.id, { title: t(item.key) });
    } catch (error) {
      // メニューが存在しない場合などは無視して次へ
      console.debug(`[contextMenu] Failed to update title for ${item.id}:`, error);
    }
  }
}

/**
 * コンテキストメニューの初期状態を設定（起動時に呼び出される）
 * 現在のアクティブタブに基づいてメニュー項目の有効/無効を設定
 */
export async function initContextMenuVisibility(): Promise<void> {
  try {
    // 現在のアクティブタブを取得
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await updateContextMenuVisibility(activeTab);
    }
  } catch (error) {
    console.warn('[contextMenu] 初期メニュー状態の設定に失敗:', error);
  }
}

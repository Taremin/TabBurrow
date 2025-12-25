/**
 * contextMenu.ts - コンテキストメニュー関連処理
 * 右クリックメニューの作成・更新・ハンドリングを担当
 */

import browser from '../browserApi.js';
import type { Menus, Tabs } from 'webextension-polyfill';
import { saveTabs, saveTabsForCustomGroup, getAllCustomGroups, createCustomGroup, findTabByUrl, deleteTab, type SavedTab } from '../storage.js';
import { t } from '../i18n.js';
import { openTabManagerPage, getTabScreenshot, saveAndCloseTabs } from './tabSaver.js';
import { extractDomain } from '../utils/url.js';
import { getSettings, saveSettings, escapeRegexPattern, matchAutoCloseRule, type AutoCloseRule } from '../settings.js';

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

  // 5. このURLを自動収納の対象外にする
  // 初期状態は無効。タブ切替時にupdateContextMenuVisibilityで更新される
  browser.contextMenus.create({
    id: ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID,
    title: t('contextMenu.excludeFromAutoClose'),
    contexts: ['action'],
    enabled: false,
  });

  // 6. 現在のURLからグループ作成
  browser.contextMenus.create({
    id: ACTION_CREATE_GROUP_FROM_URL_MENU_ID,
    title: t('contextMenu.createGroupFromUrl'),
    contexts: ['action'],
  });

  // 7. 現在のドメインからグループ作成
  browser.contextMenus.create({
    id: ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID,
    title: t('contextMenu.createGroupFromDomain'),
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

  // 1-4. このURLを自動収納の対象外にする
  browser.contextMenus.create({
    id: EXCLUDE_FROM_AUTO_CLOSE_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.excludeFromAutoClose'),
    contexts: ['page', 'frame'],
  });

  // 1-5. 現在のURLからグループ作成
  browser.contextMenus.create({
    id: CREATE_GROUP_FROM_URL_MENU_ID,
    parentId: TABBURROW_MENU_ID,
    title: t('contextMenu.createGroupFromUrl'),
    contexts: ['page', 'frame'],
  });

  // 1-6. 現在のドメインからグループ作成
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
  
  // 削除して閉じる
  if ((menuItemId === REMOVE_AND_CLOSE_MENU_ID || menuItemId === ACTION_REMOVE_AND_CLOSE_MENU_ID) && tab?.url) {
    await handleRemoveAndClose(tab);
    return;
  }

  // 自動収納の対象外にする
  if ((menuItemId === EXCLUDE_FROM_AUTO_CLOSE_MENU_ID || menuItemId === ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID) && tab?.url) {
    await handleExcludeFromAutoClose(tab);
    return;
  }

  // 新規グループ作成
  if ((menuItemId === NEW_GROUP_MENU_ID || menuItemId === ACTION_NEW_GROUP_MENU_ID) && tab?.url) {
    await handleCreateNewGroupAndSave(tab);
    return;
  }

  // 現在のURLからグループ作成
  if ((menuItemId === CREATE_GROUP_FROM_URL_MENU_ID || menuItemId === ACTION_CREATE_GROUP_FROM_URL_MENU_ID) && tab?.url) {
    await handleCreateGroupFromPattern(tab, 'fullUrl');
    return;
  }

  // 現在のドメインからグループ作成
  if ((menuItemId === CREATE_GROUP_FROM_DOMAIN_MENU_ID || menuItemId === ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID) && tab?.url) {
    await handleCreateGroupFromPattern(tab, 'domain');
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
 * 現在のURLを自動収納の対象外にするルールを追加
 */
async function handleExcludeFromAutoClose(tab: Tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    // URLからパターンを生成（https://などのスキームを除去）
    const urlObj = new URL(tab.url);
    const defaultPattern = escapeRegexPattern(urlObj.host + urlObj.pathname + urlObj.search);
    const promptMessage = t('contextMenu.excludePrompt');
    
    // promptダイアログでパターンを確認・編集
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (defaultValue: string, message: string) => prompt(message, defaultValue),
      args: [defaultPattern, promptMessage],
    });
    
    const pattern = results[0]?.result;
    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      return; // キャンセルまたは空の場合
    }
    
    // 正規表現の妥当性をチェック
    try {
      new RegExp(pattern);
    } catch {
      console.error('無効な正規表現パターン:', pattern);
      return;
    }
    
    // 設定を取得してルールを追加
    const settings = await getSettings();
    const newRule: AutoCloseRule = {
      id: crypto.randomUUID(),
      enabled: true,
      name: pattern.trim(),
      targetType: 'fullUrl',
      pattern: pattern.trim(),
      action: 'exclude',
    };
    
    settings.autoCloseRules.push(newRule);
    await saveSettings(settings);
    
    console.log(`自動収納除外ルールを追加: ${pattern}`);
    
    // コンテキストメニューの状態を即時更新（タブ切替なしでメニューを無効化）
    await updateContextMenuVisibility(tab);
    
    // 設定変更を通知
    browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
  } catch (error) {
    console.error('自動収納除外ルールの追加に失敗:', error);
  }
}

/**
 * 現在のURL/ドメインからグループ作成ルールを追加
 * @param tab タブ情報
 * @param targetType 'fullUrl'（パス含む完全URL）または'domain'（ドメインのみ）
 */
async function handleCreateGroupFromPattern(
  tab: Tabs.Tab, 
  targetType: 'fullUrl' | 'domain'
): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    // URLからデフォルトパターンを生成
    const urlObj = new URL(tab.url);
    let defaultPattern: string;
    if (targetType === 'domain') {
      // ドメインのみ
      defaultPattern = escapeRegexPattern(urlObj.hostname);
    } else {
      // フルURL（スキーム除く）
      defaultPattern = escapeRegexPattern(urlObj.host + urlObj.pathname + urlObj.search);
    }
    
    const patternPromptMessage = t('contextMenu.createGroupPatternPrompt');
    
    // 1. パターン入力プロンプト
    const patternResults = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (defaultValue: string, message: string) => prompt(message, defaultValue),
      args: [defaultPattern, patternPromptMessage],
    });
    
    const pattern = patternResults[0]?.result;
    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      return; // キャンセルまたは空の場合
    }
    
    // 正規表現の妥当性をチェック
    try {
      new RegExp(pattern.trim());
    } catch {
      console.error('無効な正規表現パターン:', pattern);
      return;
    }
    
    const groupNamePromptMessage = t('contextMenu.createGroupNamePrompt');
    
    // 2. グループ名入力プロンプト
    const groupNameResults = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message: string) => prompt(message),
      args: [groupNamePromptMessage],
    });
    
    const groupName = groupNameResults[0]?.result;
    if (!groupName || typeof groupName !== 'string' || !groupName.trim()) {
      return; // キャンセルまたは空の場合
    }
    
    const trimmedGroupName = groupName.trim();
    const trimmedPattern = pattern.trim();
    
    // カスタムグループが存在しない場合は作成
    const existingGroups = await getAllCustomGroups();
    const groupExists = existingGroups.some(g => g.name === trimmedGroupName);
    if (!groupExists) {
      await createCustomGroup(trimmedGroupName);
      // メニューを更新
      await updateCustomGroupMenus();
    }
    
    // 設定を取得してsaveToGroupルールを追加
    const settings = await getSettings();
    const newRule: AutoCloseRule = {
      id: crypto.randomUUID(),
      enabled: true,
      name: trimmedPattern,
      targetType,
      pattern: trimmedPattern,
      action: 'saveToGroup',
      targetGroup: trimmedGroupName,
    };
    
    settings.autoCloseRules.push(newRule);
    await saveSettings(settings);
    
    console.log(`グループ作成ルールを追加: パターン="${trimmedPattern}", グループ="${trimmedGroupName}", 対象="${targetType}"`);
    
    // 設定変更を通知
    browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
  } catch (error) {
    console.error('グループ作成ルールの追加に失敗:', error);
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
    browser.contextMenus.update(ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: false });
    // グループ作成メニューも無効化
    browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_URL_MENU_ID, { enabled: false });
    browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, { enabled: false });
    return;
  }
  
  // 保存対象のURLではTabBurrowメニューを表示
  browser.contextMenus.update(TABBURROW_MENU_ID, { visible: true });
  
  // タブがストレージに保存されているか確認し、「削除して閉じる」メニューの有効/無効を設定
  const savedTab = await findTabByUrl(tab.url);
  const isSaved = savedTab !== null;
  
  browser.contextMenus.update(REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
  browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { enabled: isSaved });
  
  // 自動収納対象かどうかを確認し、「対象外にする」メニューの有効/無効を設定
  const settings = await getSettings();
  const matchedRule = matchAutoCloseRule(
    { url: tab.url, title: tab.title },
    settings.autoCloseRules,
    settings.autoCloseRuleOrder
  );
  
  // 既に除外ルールが適用されている場合はメニューを無効化
  const isAlreadyExcluded = matchedRule?.action === 'exclude';
  // 自動収納が有効で、かつまだ除外されていない場合のみメニューを有効化
  const shouldEnableExclude = settings.autoCloseEnabled && !isAlreadyExcluded;
  
  browser.contextMenus.update(EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: shouldEnableExclude });
  browser.contextMenus.update(ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { enabled: shouldEnableExclude });
  
  // グループ作成メニューを有効化（保存対象のURLでのみ利用可能）
  browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_URL_MENU_ID, { enabled: true });
  browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, { enabled: true });
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
  browser.contextMenus.update(EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { title: t('contextMenu.excludeFromAutoClose') });
  browser.contextMenus.update(CREATE_GROUP_FROM_URL_MENU_ID, { title: t('contextMenu.createGroupFromUrl') });
  browser.contextMenus.update(CREATE_GROUP_FROM_DOMAIN_MENU_ID, { title: t('contextMenu.createGroupFromDomain') });

  // 拡張アイコン用
  browser.contextMenus.update(ACTION_PARENT_MENU_ID, { title: t('contextMenu.saveToCustomGroup') });
  browser.contextMenus.update(ACTION_NEW_GROUP_MENU_ID, { title: t('contextMenu.newGroup') });
  browser.contextMenus.update(ACTION_REMOVE_AND_CLOSE_MENU_ID, { title: t('contextMenu.removeAndClose') });
  browser.contextMenus.update(ACTION_EXCLUDE_FROM_AUTO_CLOSE_MENU_ID, { title: t('contextMenu.excludeFromAutoClose') });
  browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_URL_MENU_ID, { title: t('contextMenu.createGroupFromUrl') });
  browser.contextMenus.update(ACTION_CREATE_GROUP_FROM_DOMAIN_MENU_ID, { title: t('contextMenu.createGroupFromDomain') });
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

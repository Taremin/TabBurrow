import browser from '../../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { saveTabs, saveTabsForCustomGroup, type SavedTab } from '../../storage.js';
import { extractDomain, applyUrlNormalization } from '../../utils/url.js';
import { getTabScreenshot, saveAndCloseTabs, createSavedTab } from '../tabSaver.js';
import { getSettings } from '../../settings.js';
import { isSaveableUrl } from './utils.js';

/**
 * 固定タブも含めてすべてのタブを保存
 */
export async function handleSaveAllIncludingPinned(clickedTab?: Tabs.Tab): Promise<void> {
  // 現在のウィンドウのすべてのタブを取得（固定タブも含む）
  const tabs = await browser.tabs.query({
    currentWindow: true,
  });

  // 保存対象のタブをフィルタリング
  const validTabs = tabs.filter(tab => {
    if (!tab.url || tab.id === undefined) return false;
    return isSaveableUrl(tab.url);
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
 * このページを収納する（アクティブタブのみ）
 */
export async function handleStashThisPage(tab: Tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  // 保存対象外のURLは処理しない
  if (!isSaveableUrl(tab.url)) {
    console.log(`保存対象外のURL: ${tab.url}`);
    return;
  }
  
  try {
    const now = Date.now();
    const screenshot = await getTabScreenshot(tab, {
      activeTabWindowId: tab.active ? tab.windowId : undefined,
    });
    
    const settings = await getSettings();
    const canonicalUrl = settings.urlNormalizationEnabled
      ? applyUrlNormalization(tab.url, settings.urlNormalizationRules || [])
      : tab.url;
    const savedTab = createSavedTab(tab, screenshot, now, canonicalUrl);
    
    await saveTabs([savedTab]);
    console.log(`タブを収納しました: ${tab.url}`);
    
    // タブ管理画面に変更を通知
    browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
    
    // タブを閉じる
    await browser.tabs.remove(tab.id);
  } catch (error) {
    console.error('タブの収納に失敗:', error);
  }
}

/**
 * タブをカスタムグループに保存
 */
export async function handleSaveToCustomGroup(tab: Tabs.Tab, groupName: string): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    const now = Date.now();
    const screenshot = await getTabScreenshot(tab, {
      activeTabWindowId: tab.active ? tab.windowId : undefined,
    });
    
    const settings = await getSettings();
    const canonicalUrl = settings.urlNormalizationEnabled
      ? applyUrlNormalization(tab.url, settings.urlNormalizationRules || [])
      : tab.url;
    const savedTab = createSavedTab(tab, screenshot, now, canonicalUrl, {
      group: groupName,
      groupType: 'custom',
      customGroups: [groupName]
    });
    
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

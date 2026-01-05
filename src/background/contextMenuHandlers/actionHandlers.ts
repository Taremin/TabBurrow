import browser from '../../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { findTabByUrl, deleteTab } from '../../storage.js';
import { t } from '../../i18n.js';
import { getSettings, saveSettings, escapeRegexPattern, type AutoCloseRule } from '../../settings.js';

export interface UpdateContextMenuVisibilityType {
  (tab: Tabs.Tab): Promise<void>;
}

/**
 * タブ管理から削除してブラウザタブを閉じる
 */
export async function handleRemoveAndClose(tab: Tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    const savedTab = await findTabByUrl(tab.url);
    
    if (savedTab) {
      await deleteTab(savedTab.id);
      console.log(`タブ管理から削除しました: ${tab.url}`);
      browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {});
    } else {
      console.log(`タブ管理に存在しません: ${tab.url}`);
    }
    
    await browser.tabs.remove(tab.id);
  } catch (error) {
    console.error('タブ管理からの削除に失敗:', error);
  }
}

/**
 * 現在のURLを自動収納の対象外にするルールを追加
 */
export async function handleExcludeFromAutoClose(
  tab: Tabs.Tab,
  updateContextMenuVisibility: UpdateContextMenuVisibilityType
): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    const urlObj = new URL(tab.url);
    const defaultPattern = escapeRegexPattern(urlObj.host + urlObj.pathname + urlObj.search);
    const promptMessage = t('contextMenu.excludePrompt');
    
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (defaultValue: string, message: string) => prompt(message, defaultValue),
      args: [defaultPattern, promptMessage],
    });
    
    const pattern = results[0]?.result;
    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      return;
    }
    
    try {
      new RegExp(pattern);
    } catch {
      console.error('無効な正規表現パターン:', pattern);
      return;
    }
    
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
    await updateContextMenuVisibility(tab);
    browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
  } catch (error) {
    console.error('自動収納除外ルールの追加に失敗:', error);
  }
}

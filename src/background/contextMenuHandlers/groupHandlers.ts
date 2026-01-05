import browser from '../../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { getAllCustomGroups, createCustomGroup } from '../../storage.js';
import { t } from '../../i18n.js';
import { getSettings, saveSettings, escapeRegexPattern, type AutoCloseRule } from '../../settings.js';
import { handleSaveToCustomGroup } from './saveHandlers.js';

export interface UpdateCustomGroupMenusType {
  (): Promise<void>;
}

/**
 * 新規グループを作成してタブを保存
 */
export async function handleCreateNewGroupAndSave(
  tab: Tabs.Tab, 
  updateCustomGroupMenus: UpdateCustomGroupMenusType
): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  // ブラウザのpromptでグループ名を入力
  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: (promptText: string) => prompt(promptText),
    args: [t('contextMenu.newGroupPrompt') || 'グループ名を入力してください:'],
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
 * 現在のURL/ドメインからグループ作成ルールを追加
 */
export async function handleCreateGroupFromPattern(
  tab: Tabs.Tab, 
  targetType: 'fullUrl' | 'domain',
  updateCustomGroupMenus: UpdateCustomGroupMenusType
): Promise<void> {
  if (!tab.url || !tab.id) return;
  
  try {
    const urlObj = new URL(tab.url);
    let defaultPattern: string;
    if (targetType === 'domain') {
      defaultPattern = escapeRegexPattern(urlObj.hostname);
    } else {
      defaultPattern = escapeRegexPattern(urlObj.host + urlObj.pathname + urlObj.search);
    }
    
    const patternPromptMessage = t('contextMenu.createGroupPatternPrompt');
    const patternResults = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (defaultValue: string, message: string) => prompt(message, defaultValue),
      args: [defaultPattern, patternPromptMessage],
    });
    
    const pattern = patternResults[0]?.result;
    if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
      return;
    }
    
    try {
      new RegExp(pattern.trim());
    } catch {
      console.error('無効な正規表現パターン:', pattern);
      return;
    }
    
    const groupNamePromptMessage = t('contextMenu.createGroupNamePrompt');
    const groupNameResults = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (message: string) => prompt(message),
      args: [groupNamePromptMessage],
    });
    
    const groupName = groupNameResults[0]?.result;
    if (!groupName || typeof groupName !== 'string' || !groupName.trim()) {
      return;
    }
    
    const trimmedGroupName = groupName.trim();
    const trimmedPattern = pattern.trim();
    
    const existingGroups = await getAllCustomGroups();
    const groupExists = existingGroups.some(g => g.name === trimmedGroupName);
    if (!groupExists) {
      await createCustomGroup(trimmedGroupName);
      await updateCustomGroupMenus();
    }
    
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
    browser.runtime.sendMessage({ type: 'settings-changed' }).catch(() => {});
  } catch (error) {
    console.error('グループ作成ルールの追加に失敗:', error);
  }
}

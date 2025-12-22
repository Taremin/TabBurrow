/**
 * autoClose.ts - 自動収納機能
 * 非アクティブタブの自動収納を担当
 */

import browser from '../browserApi.js';
import type { Alarms, Tabs } from 'webextension-polyfill';
import { getSettings, matchAutoCloseRule, type Settings } from '../settings.js';
import { saveAndCloseTabs, getTabScreenshot } from './tabSaver.js';
import { extractDomain } from '../utils/url.js';
import { saveTabs, saveTabsForCustomGroup, type SavedTab } from '../storage.js';

// 自動収納のアラーム名
export const AUTO_CLOSE_ALARM_NAME = 'auto-close-tabs';

// storage.session用キー
const TAB_LAST_ACTIVE_TIME_KEY = 'tabLastActiveTime';

// タブの最終アクティブ時刻を追跡（自動収納用）
// メモリ内キャッシュ（storage.sessionと同期）
export const tabLastActiveTime = new Map<number, number>();

// 現在の設定をキャッシュ（モジュール内で管理）
let cachedSettings: Settings | null = null;

/**
 * キャッシュされた設定を取得
 */
export function getCachedSettings(): Settings | null {
  return cachedSettings;
}

/**
 * キャッシュされた設定を更新
 */
export function setCachedSettings(settings: Settings): void {
  cachedSettings = settings;
}

/**
 * tabLastActiveTimeをstorage.sessionから復元
 */
async function restoreTabLastActiveTime(): Promise<void> {
  try {
    // browser.storage.sessionが利用可能かチェック
    if (!browser.storage.session) {
      console.log('[autoClose] storage.session未対応（Chrome MV3 Service Worker）');
      return;
    }
    
    const result = await browser.storage.session.get(TAB_LAST_ACTIVE_TIME_KEY);
    const data = result[TAB_LAST_ACTIVE_TIME_KEY] as Record<string, number> | undefined;
    
    if (data) {
      tabLastActiveTime.clear();
      for (const [tabIdStr, timestamp] of Object.entries(data)) {
        tabLastActiveTime.set(Number(tabIdStr), timestamp);
      }
      console.log(`[autoClose] ${tabLastActiveTime.size}件のタブ状態を復元しました`);
    }
  } catch (error) {
    console.warn('[autoClose] storage.sessionからの復元に失敗:', error);
  }
}

/**
 * tabLastActiveTimeをstorage.sessionに永続化
 */
async function persistTabLastActiveTime(): Promise<void> {
  try {
    if (!browser.storage.session) {
      return; // storage.session未対応の場合はスキップ
    }
    
    const data: Record<string, number> = {};
    for (const [tabId, timestamp] of tabLastActiveTime.entries()) {
      data[String(tabId)] = timestamp;
    }
    
    await browser.storage.session.set({ [TAB_LAST_ACTIVE_TIME_KEY]: data });
  } catch (error) {
    console.warn('[autoClose] storage.sessionへの永続化に失敗:', error);
  }
}

/**
 * タブの最終アクティブ時刻を更新（永続化付き）
 */
export function updateTabLastActiveTime(tabId: number, timestamp: number = Date.now()): void {
  tabLastActiveTime.set(tabId, timestamp);
  // 非同期で永続化（エラーは無視）
  persistTabLastActiveTime().catch(() => {});
}

/**
 * タブの最終アクティブ時刻を削除（永続化付き）
 */
export function removeTabLastActiveTime(tabId: number): void {
  tabLastActiveTime.delete(tabId);
  // 非同期で永続化（エラーは無視）
  persistTabLastActiveTime().catch(() => {});
}

/**
 * 自動収納機能を初期化
 */
export async function initAutoClose(): Promise<void> {
  // storage.sessionから状態を復元
  await restoreTabLastActiveTime();
  
  cachedSettings = await getSettings();
  
  // 既存のアラームをクリア
  await browser.alarms.clear(AUTO_CLOSE_ALARM_NAME);
  
  if (cachedSettings.autoCloseEnabled) {
    // 30秒ごとにチェック（設定された秒数より短い間隔でチェック）
    const checkInterval = Math.min(cachedSettings.autoCloseSeconds / 2, 30);
    browser.alarms.create(AUTO_CLOSE_ALARM_NAME, {
      periodInMinutes: checkInterval / 60,
    });
    const nextCheckTime = new Date(Date.now() + checkInterval * 1000);
    console.log(`自動収納を有効化: ${cachedSettings.autoCloseSeconds}秒後に非アクティブタブを収納します（次回チェック: ${nextCheckTime.toLocaleTimeString()}）`);
  } else {
    console.log('自動収納を無効化');
  }
}

/**
 * アラームが発火したときの処理（自動収納チェック）
 */
export async function handleAutoCloseAlarm(alarm: Alarms.Alarm): Promise<void> {
  if (alarm.name !== AUTO_CLOSE_ALARM_NAME) return;
  
  if (!cachedSettings?.autoCloseEnabled) return;
  
  const nowDate = new Date();
  console.log(`[AutoClose] 自動収納チェックを開始（${nowDate.toLocaleTimeString()}）`);
  
  const now = Date.now();
  const thresholdMs = cachedSettings.autoCloseSeconds * 1000;
  
  // 全ウィンドウのタブを取得
  const tabs = await browser.tabs.query({ pinned: false });
  
  // 各アクションに応じて分類
  const tabsToNormalClose: Tabs.Tab[] = [];            // 通常の収納
  const tabsToSaveToGroup: { tab: Tabs.Tab; groupName: string }[] = [];  // グループに収納
  const tabsToSaveOnly: Tabs.Tab[] = [];               // 保存のみ（閉じない）
  const tabsToCloseOnly: Tabs.Tab[] = [];              // 保存せず閉じる
  
  for (const tab of tabs) {
    if (!tab.id || !tab.url || tab.active) continue;
    
    // 特殊URLや拡張ページは除外（http/https/file以外のスキームはすべて除外）
    if (!/^(https?|file):\/\//i.test(tab.url)) {
      continue;
    }
    
    // 非アクティブ時間をチェック
    const lastActive = tabLastActiveTime.get(tab.id) || 0;
    const timeSinceActive = now - lastActive;
    if (timeSinceActive <= thresholdMs) {
      continue;  // まだ閾値に達していない
    }
    
    // ルールマッチング
    const matchedRule = matchAutoCloseRule(
      { url: tab.url, title: tab.title },
      cachedSettings.autoCloseRules,
      cachedSettings.autoCloseRuleOrder
    );
    
    if (matchedRule) {
      switch (matchedRule.action) {
        case 'exclude':
          // 除外（何もしない）
          continue;
        case 'saveToGroup':
          // カスタムグループに収納
          if (matchedRule.targetGroup) {
            tabsToSaveToGroup.push({ tab, groupName: matchedRule.targetGroup });
          }
          continue;
        case 'saveOnly':
          // DBに保存/更新するがタブは閉じない
          tabsToSaveOnly.push(tab);
          continue;
        case 'close':
          // 保存せずに閉じる
          tabsToCloseOnly.push(tab);
          continue;
        case 'pin':
          // ピン留めする
          await browser.tabs.update(tab.id, { pinned: true });
          continue;
      }
    }
    
    // ルールにマッチしない場合は通常の収納
    tabsToNormalClose.push(tab);
  }
  
  // 通常の収納
  if (tabsToNormalClose.length > 0) {
    console.log(`自動収納: ${tabsToNormalClose.length}個の非アクティブタブを収納します`);
    await saveAndCloseTabs(tabsToNormalClose, {
      logPrefix: '自動収納: ',
    });
  }
  
  // グループに収納
  for (const { tab, groupName } of tabsToSaveToGroup) {
    if (!tab.id || !tab.url) continue;
    try {
      const screenshot = await getTabScreenshot(tab, {});
      const domain = extractDomain(tab.url);
      const savedTab: SavedTab = {
        id: crypto.randomUUID(),
        url: tab.url,
        title: tab.title || 'Untitled',
        domain,
        group: groupName,
        groupType: 'custom',
        favIconUrl: tab.favIconUrl || '',
        screenshot,
        lastAccessed: tab.lastAccessed || now,
        savedAt: now,
      };
      await saveTabsForCustomGroup([savedTab]);
      await browser.tabs.remove(tab.id);
      console.log(`自動収納: タブを「${groupName}」グループに収納しました: ${tab.url}`);
    } catch (error) {
      console.error('グループへの保存に失敗:', error);
    }
  }
  
  // 保存のみ（閉じない）
  for (const tab of tabsToSaveOnly) {
    if (!tab.id || !tab.url) continue;
    try {
      const screenshot = await getTabScreenshot(tab, {});
      const domain = extractDomain(tab.url);
      const savedTab: SavedTab = {
        id: crypto.randomUUID(),
        url: tab.url,
        title: tab.title || 'Untitled',
        domain,
        group: domain,
        groupType: 'domain',
        favIconUrl: tab.favIconUrl || '',
        screenshot,
        lastAccessed: tab.lastAccessed || now,
        savedAt: now,
      };
      await saveTabs([savedTab]);
      console.log(`自動収納: タブを保存しました（閉じない）: ${tab.url}`);
    } catch (error) {
      console.error('保存に失敗:', error);
    }
  }
  
  // 保存せず閉じる
  if (tabsToCloseOnly.length > 0) {
    const tabIds = tabsToCloseOnly.map(t => t.id).filter((id): id is number => id !== undefined);
    await browser.tabs.remove(tabIds);
    console.log(`自動収納: ${tabsToCloseOnly.length}個のタブを破棄しました`);
  }
}


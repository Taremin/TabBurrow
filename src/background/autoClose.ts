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
 * 設定がロードされていない場合は null を返します
 */
export function getCachedSettings(): Settings | null {
  return cachedSettings;
}

/**
 * 初期化が完了しているか確認し、必要なら初期化する
 */
export async function ensureInitialized(): Promise<void> {
  if (cachedSettings && tabLastActiveTime.size > 0) {
    return;
  }
  
  if (!cachedSettings) {
    console.log('[autoClose] 設定が未ロードのため初期化を開始します');
    await initAutoClose();
  } else if (tabLastActiveTime.size === 0) {
    // 設定はあるがタブ情報が空の場合（サスペンドからの復帰時など）
    console.log('[autoClose] タブ状態が未ロードのため復元を試みます');
    await restoreTabLastActiveTime();
    
    // 復元しても空の場合は現在の全タブを登録
    if (tabLastActiveTime.size === 0) {
      const tabs = await browser.tabs.query({ pinned: false });
      const now = Date.now();
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          tabLastActiveTime.set(tab.id, now);
        }
      }
      console.log(`[autoClose] ${tabs.length}件のタブを初期状態として登録しました`);
      await persistTabLastActiveTime();
    }
  }
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
  const settings = await getSettings();
  const oldSettings = cachedSettings;
  cachedSettings = settings;
  
  // storage.sessionから状態を復元
  await restoreTabLastActiveTime();
  
  // 既存のアラームを確認
  const existingAlarm = await browser.alarms.get(AUTO_CLOSE_ALARM_NAME);
  
  if (settings.autoCloseEnabled) {
    // 30秒ごとにチェック（設定された秒数より短い間隔でチェック）
    const checkInterval = Math.min(settings.autoCloseSeconds / 2, 30);
    const periodInMinutes = checkInterval / 60;
    
    // アラーム設定が必要か判断（べき等性）
    // すでに正しい周期でアラームが存在する場合は再作成しない（タイマーのリセットを防ぐ）
    const isSamePeriod = existingAlarm && Math.abs((existingAlarm.periodInMinutes || 0) - periodInMinutes) < 0.001;
    
    if (isSamePeriod) {
       console.log('[autoClose] 既存のアラームを維持します');
    } else {
      await browser.alarms.clear(AUTO_CLOSE_ALARM_NAME);
      browser.alarms.create(AUTO_CLOSE_ALARM_NAME, {
        periodInMinutes,
      });
      const nextCheckTime = new Date(Date.now() + checkInterval * 1000);
      console.log(`[autoClose] 自動収納を有効化: ${settings.autoCloseSeconds}秒後に非アクティブタブを収納します（次回チェック: ${nextCheckTime.toLocaleTimeString()}）`);
    }
  } else {
    if (existingAlarm) {
      await browser.alarms.clear(AUTO_CLOSE_ALARM_NAME);
      console.log('[autoClose] 自動収納を無効化しました');
    }
  }
}

/**
 * アラームが発火したときの処理（自動収納チェック）
 */
export async function handleAutoCloseAlarm(alarm: Alarms.Alarm): Promise<void> {
  if (alarm.name !== AUTO_CLOSE_ALARM_NAME) return;
  
  // 初期化を保証
  await ensureInitialized();
  
  if (!cachedSettings?.autoCloseEnabled) {
    console.log('[AutoClose] 自動収納が無効のためスキップします');
    return;
  }
  
  const nowDate = new Date();
  console.log(`[AutoClose] 自動収納チェックを開始（${nowDate.toLocaleTimeString()}）`);
  
  const now = Date.now();
  const thresholdMs = cachedSettings.autoCloseSeconds * 1000;
  
  // 全ウィンドウのタブを取得
  const tabs = await browser.tabs.query({ pinned: false });
  
  // 開始時の要約ログ
  console.group(`[AutoClose] チェック対象タブ一覧 (閾値: ${cachedSettings.autoCloseSeconds}秒)`);
  tabs.forEach(tab => {
    if (!tab.id || !tab.url) return;
    const lastActive = tabLastActiveTime.get(tab.id) || 0;
    const scheduledTime = lastActive + thresholdMs;
    const remains = Math.max(0, Math.floor((scheduledTime - now) / 1000));
    const status = tab.active ? 'Active' : (remains === 0 ? 'Due' : `${remains}s remains`);
    const lastActiveStr = lastActive ? new Date(lastActive).toLocaleTimeString() : 'Unknown';
    const scheduledStr = new Date(scheduledTime).toLocaleTimeString();
    
    // スキームチェック
    const isTargetScheme = /^(https?|file):\/\//i.test(tab.url);
    const schemeInfo = isTargetScheme ? '' : ' [非対象スキーム]';

    console.log(`- TabID: ${tab.id}, Status: ${status}, LastActive: ${lastActiveStr}, Due: ${scheduledStr}, URL: ${tab.url}${schemeInfo}`);
  });
  console.groupEnd();
  
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
      console.log(`[AutoClose] スキップ (未到達): tabId=${tab.id}, 経過=${Math.floor(timeSinceActive/1000)}s, 閾値=${cachedSettings.autoCloseSeconds}s, url=${tab.url}`);
      continue;  // まだ閾値に達していない
    }
    
    console.log(`[AutoClose] タイマー超過検出: tabId=${tab.id}, url=${tab.url}`);

    // ルールマッチング
    const matchedRule = matchAutoCloseRule(
      { url: tab.url, title: tab.title },
      cachedSettings.autoCloseRules,
      cachedSettings.autoCloseRuleOrder
    );
    
    if (matchedRule) {
      console.log(`[AutoClose] ルール適用: action=${matchedRule.action}, ruleName=${matchedRule.name}`);
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
    console.log(`[AutoClose] 通常収納対象に追加: tabId=${tab.id}`);
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
        customGroups: [groupName],
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
        customGroups: [],
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


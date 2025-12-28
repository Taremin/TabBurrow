/**
 * tabEvents.ts - タブイベントリスナー
 * タブの作成、削除、切替、更新イベントを担当
 */

import browser from '../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { setScreenshot, deleteScreenshot } from '../screenshotCache.js';
import { captureTab, resizeScreenshot } from './screenshot.js';
import { tabLastActiveTime, updateTabLastActiveTime, removeTabLastActiveTime } from './autoClose.js';
import { updateContextMenuVisibility } from './contextMenu.js';

// 現在のアクティブタブを追跡（タブ切替時に前のタブをキャッシュするため）
let currentActiveTabId: number | null = null;

/**
 * タブイベントリスナーを設定
 */
export function setupTabEventListeners(): void {
  // タブがアクティブになったときの処理
  browser.tabs.onActivated.addListener(handleTabActivated);

  // タブが閉じられたときの処理
  browser.tabs.onRemoved.addListener(handleTabRemoved);

  // 新規タブが作成されたときの処理
  browser.tabs.onCreated.addListener(handleTabCreated);

  // タブが置換されたときの処理
  browser.tabs.onReplaced.addListener(handleTabReplaced);

  // タブの読み込みが完了したときの処理
  browser.tabs.onUpdated.addListener(handleTabUpdated);
}

/**
 * タブがアクティブになったときの処理
 * 前のタブ（非アクティブになるタブ）のスクリーンショットをキャッシュ
 */
async function handleTabActivated(activeInfo: Tabs.OnActivatedActiveInfoType): Promise<void> {
  const previousTabId = currentActiveTabId;
  currentActiveTabId = activeInfo.tabId;

  // 新しくアクティブになったタブの最終アクティブ時刻を更新（自動収納用）
  updateTabLastActiveTime(activeInfo.tabId);

  // 前のタブ（非アクティブになったタブ）の最終アクティブ時刻も更新
  // これを行わないと、長時間アクティブだったタブを切り替えた直後に
  // 自動収納のタイマーによって即座に閉じられてしまう可能性がある
  if (previousTabId !== null) {
    updateTabLastActiveTime(previousTabId);
  }

  // 新しくアクティブになったタブの情報を取得
  let currentTab: Tabs.Tab | null = null;
  try {
    currentTab = await browser.tabs.get(activeInfo.tabId);
  } catch {
    return;
  }
  
  // コンテキストメニューの表示/非表示を更新
  if (currentTab) {
    updateContextMenuVisibility(currentTab);
  }

  // 拡張機能のページはスクリーンショット対象外
  if (currentTab?.url?.startsWith('chrome-extension://') ||
      currentTab?.url?.startsWith('moz-extension://')) {
    return;
  }

  // 前のタブが存在する場合、スクリーンショットをキャッシュ
  if (previousTabId !== null) {
    try {
      // 前のタブがまだ存在するか確認
      const previousTab = await browser.tabs.get(previousTabId).catch(() => null);
      if (previousTab && previousTab.windowId !== undefined) {
        // 前のタブのウィンドウでスクリーンショットを取得
        // ※注意: captureVisibleTab は現在アクティブなタブを撮影するため、
        // タブ切替直後に前のタブを撮影することはできない
        // 代わりに、新しいアクティブタブの windowId を使用
        const targetTabId = activeInfo.tabId;
        const dataURL = await captureTab(activeInfo.windowId);
        
        // キャプチャ完了後、タブがまだアクティブか検証（レースコンディション対策）
        if (currentActiveTabId !== targetTabId) {
          console.log(`[Screenshot] タブ切替検出: キャプチャを破棄 (target=${targetTabId}, current=${currentActiveTabId})`);
          return;
        }
        
        if (dataURL) {
          const blob = await resizeScreenshot(dataURL);
          // 新しくアクティブになったタブのスクリーンショットをキャッシュ
          setScreenshot(targetTabId, blob);
        }
      }
    } catch (error) {
      console.warn('タブ切替時のスクリーンショット取得エラー:', error);
    }
  } else {
    // 初回のタブアクティブ化時
    try {
      const targetTabId = activeInfo.tabId;
      const dataURL = await captureTab(activeInfo.windowId);
      
      // キャプチャ完了後、タブがまだアクティブか検証（レースコンディション対策）
      if (currentActiveTabId !== targetTabId) {
        console.log(`[Screenshot] タブ切替検出: キャプチャを破棄 (target=${targetTabId}, current=${currentActiveTabId})`);
        return;
      }
      
      if (dataURL) {
        const blob = await resizeScreenshot(dataURL);
        setScreenshot(targetTabId, blob);
      }
    } catch (error) {
      console.warn('初回タブのスクリーンショット取得エラー:', error);
    }
  }
}

/**
 * タブが閉じられたときの処理
 * キャッシュを解放
 */
function handleTabRemoved(tabId: number): void {
  deleteScreenshot(tabId);
  removeTabLastActiveTime(tabId);
  
  // 閉じられたタブが現在のアクティブタブだった場合、追跡をリセット
  if (currentActiveTabId === tabId) {
    currentActiveTabId = null;
  }
}

/**
 * 新規タブが作成されたときの処理
 * 自動収納の猶予時間を与えるため、最終アクティブ時刻を現在に設定
 */
function handleTabCreated(tab: Tabs.Tab): void {
  if (tab.id !== undefined) {
    updateTabLastActiveTime(tab.id);
  }
}

/**
 * タブが置換されたときの処理（discard後の復帰など）
 * 古いタブIDから新しいタブIDへ最終アクティブ時刻を引き継ぐ
 */
function handleTabReplaced(addedTabId: number, removedTabId: number): void {
  const lastActive = tabLastActiveTime.get(removedTabId);
  if (lastActive !== undefined) {
    updateTabLastActiveTime(addedTabId, lastActive);
    removeTabLastActiveTime(removedTabId);
  } else {
    // 古いタブIDに時刻がなければ現在時刻を設定
    updateTabLastActiveTime(addedTabId);
  }
}

/**
 * タブの読み込みが完了したときの処理
 * アクティブなタブの場合、スクリーンショットを更新
 */
async function handleTabUpdated(
  tabId: number,
  changeInfo: Tabs.OnUpdatedChangeInfoType,
  tab: Tabs.Tab
): Promise<void> {
  // URLが変更された場合、コンテキストメニューを更新
  if (changeInfo.url && tab.active) {
    updateContextMenuVisibility(tab);
  }
  
  // 読み込み完了かつアクティブなタブの場合のみ
  // 拡張機能のページはスクリーンショット対象外
  if (changeInfo.status === 'complete' && tab.active && tab.windowId !== undefined &&
      !tab.url?.startsWith('chrome-extension://') && !tab.url?.startsWith('moz-extension://')) {
    try {
      const targetTabId = tabId;
      const dataURL = await captureTab(tab.windowId);
      
      // キャプチャ完了後、タブがまだアクティブか検証（レースコンディション対策）
      if (currentActiveTabId !== targetTabId) {
        console.log(`[Screenshot] タブ切替検出: キャプチャを破棄 (target=${targetTabId}, current=${currentActiveTabId})`);
        return;
      }
      
      if (dataURL) {
        const blob = await resizeScreenshot(dataURL);
        setScreenshot(targetTabId, blob);
      }
    } catch (error) {
      console.warn('タブ更新時のスクリーンショット取得エラー:', error);
    }
  }
}


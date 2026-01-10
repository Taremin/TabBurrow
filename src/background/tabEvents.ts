/**
 * tabEvents.ts - タブイベントリスナー
 * タブの作成、削除、切替、更新イベントを担当
 */

import browser from '../browserApi';
import type { Tabs } from 'webextension-polyfill';
import { setScreenshot, deleteScreenshot } from '../screenshotCache';
import { captureTab, resizeScreenshot } from './screenshot';
import { tabLastActiveTime, updateTabLastActiveTime, removeTabLastActiveTime } from './autoClose';
import { updateContextMenuVisibility } from './contextMenu';

// 現在のアクティブタブを追跡（タブ切替時に前のタブをキャッシュするため）
let currentActiveTabId: number | null = null;
const SETTLE_DELAY_MS = 500; // 描画バッファ更新待ち時間

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

  // スクリーンショット取得（すでにロード完了している場合のみ）
  if (currentTab?.status === 'complete') {
    captureActiveTabWithSettleDelay(activeInfo.tabId, activeInfo.windowId);
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
  
  // 読み込み完了かつアクティブなタブの場合のみキャプチャ
  if (changeInfo.status === 'complete' && tab.active && tab.windowId !== undefined) {
    captureActiveTabWithSettleDelay(tabId, tab.windowId);
  }
}

/**
 * 遅延を入れてアクティブタブをキャプチャ
 * @param tabId 期待されるアクティブタブID
 * @param windowId キャプチャ対象のウィンドウ
 */
async function captureActiveTabWithSettleDelay(tabId: number, windowId: number): Promise<void> {
  try {
    // 描画が安定するまで少し待つ（特にタブ切替直後）
    await new Promise(resolve => setTimeout(resolve, SETTLE_DELAY_MS));

    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.active || tab.windowId !== windowId) {
      console.log(`[Screenshot] キャプチャ中止: タブが非アクティブまたは存在しません (tabId=${tabId})`);
      return;
    }

    // 拡張機能のページはスクリーンショット対象外
    if (tab.url?.startsWith('chrome-extension://') ||
        tab.url?.startsWith('moz-extension://') ||
        tab.url?.startsWith('about:') ||
        tab.url?.startsWith('chrome:')) {
      return;
    }

    const dataURL = await captureTab(windowId);
    if (dataURL) {
      const blob = await resizeScreenshot(dataURL);
      setScreenshot(tabId, blob);
    }
  } catch (error) {
    console.warn('[Screenshot] キャプチャエラー:', error);
  }
}

/**
 * 全ウィンドウのアクティブタブのスクリーンショットを更新
 */
export async function captureActiveTabsInAllWindows(): Promise<void> {
  console.log('[Screenshot] 全ウィンドウのアクティブタブをキャプチャ開始');
  try {
    const windows = await browser.windows.getAll({ populate: true });
    for (const win of windows) {
      if (win.id === undefined) continue;
      const activeTab = win.tabs?.find(t => t.active);
      if (activeTab && activeTab.id !== undefined) {
        // 各ウィンドウごとに非同期で実行（順次処理は screenshotQueue が担当）
        captureActiveTabWithSettleDelay(activeTab.id, win.id);
      }
    }
  } catch (error) {
    console.error('[Screenshot] 全ウィンドウキャプチャエラー:', error);
  }
}


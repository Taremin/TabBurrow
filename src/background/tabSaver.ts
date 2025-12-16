/**
 * tabSaver.ts - タブ保存関連処理
 * タブの保存、閉じる、タブ管理画面を開く処理を担当
 */

import browser from '../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { saveTabs, type SavedTab } from '../storage.js';
import { getScreenshot } from '../screenshotCache.js';
import { captureTab, resizeScreenshot } from './screenshot.js';

/**
 * URLからドメインを抽出
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * タブのスクリーンショットを取得（アクティブタブかキャッシュから）
 */
export async function getTabScreenshot(
  tab: Tabs.Tab,
  options: {
    activeTabWindowId?: number;
  } = {}
): Promise<Blob> {
  const { activeTabWindowId } = options;

  if (tab.active && activeTabWindowId !== undefined) {
    // アクティブタブはその場でスクリーンショットを取得
    const screenshotDataURL = await captureTab(activeTabWindowId);
    if (screenshotDataURL) {
      return await resizeScreenshot(screenshotDataURL);
    }
  } else if (tab.id !== undefined) {
    // 非アクティブタブはキャッシュから取得を試みる
    const cachedScreenshot = getScreenshot(tab.id);
    if (cachedScreenshot) {
      return cachedScreenshot;
    }
  }
  // スクリーンショットが取得できない場合は空のBlobを使用
  return new Blob([], { type: 'image/jpeg' });
}

/**
 * タブを保存データに変換
 */
export function createSavedTab(
  tab: Tabs.Tab,
  screenshot: Blob,
  savedAt: number
): SavedTab {
  const domain = extractDomain(tab.url!);
  return {
    id: crypto.randomUUID(),
    url: tab.url!,
    title: tab.title || 'Untitled',
    domain,
    group: domain,           // デフォルトはドメインでグループ化
    groupType: 'domain',     // デフォルトはドメイングループ
    favIconUrl: tab.favIconUrl || '',
    screenshot,
    lastAccessed: tab.lastAccessed || savedAt,
    savedAt,
  };
}

/**
 * タブ管理画面を開く（既存のタブがあればそれをアクティブに）
 */
export async function openTabManagerPage(): Promise<void> {
  const extensionUrl = browser.runtime.getURL('tabs.html');
  const existingTabs = await browser.tabs.query({ url: extensionUrl });
  
  if (existingTabs.length > 0 && existingTabs[0].id !== undefined) {
    // 既存のタブをアクティブに
    await browser.tabs.update(existingTabs[0].id, { active: true });
    // 既存タブのウィンドウもフォーカス
    if (existingTabs[0].windowId !== undefined) {
      await browser.windows.update(existingTabs[0].windowId, { focused: true });
    }
  } else {
    // 新しいタブを作成
    await browser.tabs.create({ url: extensionUrl });
  }
}

/**
 * タブを保存して閉じる共通処理
 */
export async function saveAndCloseTabs(
  tabs: Tabs.Tab[],
  options: {
    activeTabWindowId?: number;  // アクティブタブのスクリーンショットをその場で取得するためのウィンドウID
    openTabManager?: boolean;    // タブ管理画面を開くかどうか
    logPrefix?: string;          // ログのプレフィックス（デバッグ用）
  } = {}
): Promise<void> {
  const { activeTabWindowId, openTabManager = false, logPrefix = '' } = options;
  const now = Date.now();
  const savedTabs: SavedTab[] = [];

  // 各タブのスクリーンショットを取得して保存データを作成
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;

    try {
      const screenshot = await getTabScreenshot(tab, { activeTabWindowId });
      const savedTab = createSavedTab(tab, screenshot, now);
      savedTabs.push(savedTab);
    } catch (error) {
      console.error(`${logPrefix}タブの保存に失敗: ${tab.url}`, error);
    }
  }

  if (savedTabs.length === 0) return;

  try {
    // IndexedDBに保存
    await saveTabs(savedTabs);
    console.log(`${logPrefix}${savedTabs.length}個のタブを保存しました`);

    // タブ管理画面に変更を通知
    browser.runtime.sendMessage({ type: 'tabs-changed' }).catch(() => {
      // タブ管理画面が開いていない場合はエラーになるが無視
    });

    // 保存したタブを閉じる
    const tabIdsToClose = tabs
      .map(t => t.id)
      .filter((id): id is number => id !== undefined);
    
    await browser.tabs.remove(tabIdsToClose);
    console.log(`${logPrefix}${tabIdsToClose.length}個のタブを閉じました`);

    // タブ管理画面を開く
    if (openTabManager) {
      await openTabManagerPage();
    }
  } catch (error) {
    console.error(`${logPrefix}タブの保存処理に失敗:`, error);
  }
}


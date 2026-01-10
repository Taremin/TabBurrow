/**
 * tabSaver.ts - タブ収納関連処理
 * タブの収納（保存してタブを閉じる）、タブ管理画面を開く処理を担当
 */

import browser from '../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { saveTabs, type SavedTab } from '../storage.js';
import { getScreenshot } from '../screenshotCache.js';
import { captureTab, resizeScreenshot } from './screenshot.js';
import { extractDomain, applyUrlNormalization } from '../utils/url.js';
import { getSettings } from '../settings.js';

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
  savedAt: number,
  canonicalUrl: string,
  overrides: { group?: string; groupType?: 'domain' | 'custom'; customGroups?: string[] } = {}
): SavedTab {
  const domain = extractDomain(tab.url!);
  return {
    id: crypto.randomUUID(),
    url: tab.url!,
    canonicalUrl: canonicalUrl,
    title: tab.title || 'Untitled',
    domain,
    group: overrides.group || domain,
    groupType: overrides.groupType || 'domain',
    customGroups: overrides.customGroups || [],
    favIconUrl: tab.favIconUrl || '',
    screenshot,
    lastAccessed: tab.lastAccessed || savedAt,
    savedAt,
  };
}

/**
 * タブ管理画面を開く（現在のウィンドウに既存のタブがあればそれをアクティブに）
 */
export async function openTabManagerPage(): Promise<void> {
  const extensionUrl = browser.runtime.getURL('tabs.html');
  
  // 設定を取得
  const { getSettings } = await import('../settings.js');
  const settings = await getSettings();
  
  // 現在のウィンドウを取得
  const currentWindow = await browser.windows.getCurrent();
  
  // 現在のウィンドウ内でタブ管理画面を検索
  const existingTabs = await browser.tabs.query({ 
    url: extensionUrl,
    windowId: currentWindow.id,  // 現在のウィンドウに限定
  });
  
  if (existingTabs.length > 0 && existingTabs[0].id !== undefined) {
    // 現在のウィンドウ内の既存タブをアクティブに
    // 設定が有効な場合は固定化も行う
    const updateProperties: Tabs.UpdateUpdatePropertiesType = { active: true };
    if (settings.pinTabManager) {
      updateProperties.pinned = true;
    }
    await browser.tabs.update(existingTabs[0].id, updateProperties);
  } else {
    // 現在のウィンドウに新しいタブを作成
    const createProperties: Tabs.CreateCreatePropertiesType = { url: extensionUrl };
    if (settings.pinTabManager) {
      createProperties.pinned = true;
    }
    await browser.tabs.create(createProperties);
  }
}

/**
 * タブを収納する共通処理
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
  const settings = await getSettings();

  // 各タブのスクリーンショットを取得して保存データを作成
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;

    try {
      const screenshot = await getTabScreenshot(tab, { activeTabWindowId });
      const canonicalUrl = settings.urlNormalizationEnabled 
        ? applyUrlNormalization(tab.url!, settings.urlNormalizationRules || [])
        : tab.url!;
      const savedTab = createSavedTab(tab, screenshot, now, canonicalUrl);
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


/**
 * TabBurrow - Background Service Worker
 * 拡張アイコンクリック時にタブを保存・クローズする
 * 
 * このファイルはメインエントリポイントとして、各モジュールを統合します。
 */

import browser from '../browserApi.js';
import type { Tabs } from 'webextension-polyfill';
import { getSettings, matchAutoCloseRule } from '../settings.js';
import { applyLocaleSetting } from '../i18n.js';

// モジュールのインポート
import { saveAndCloseTabs } from './tabSaver.js';
import { initAutoClose, handleAutoCloseAlarm } from './autoClose.js';
import { createContextMenus, handleContextMenuClick, updateContextMenuTitles, updateCustomGroupMenus } from './contextMenu.js';
import { setupTabEventListeners } from './tabEvents.js';
import { checkLinks, cancelLinkCheck, isLinkCheckRunning, type LinkCheckProgress, type LinkCheckResult } from './linkChecker.js';

/**
 * 拡張アイコンがクリックされたときの処理
 */
async function handleActionClick(clickedTab: Tabs.Tab): Promise<void> {
  // 設定を取得
  const settings = await getSettings();

  // 現在のウィンドウのタブを取得（固定タブを除外）
  const tabs = await browser.tabs.query({
    currentWindow: true,
    pinned: false,
  });

  console.log("tabs:", tabs);

  // 保存対象のタブをフィルタリング
  // 特殊URLは除外（chrome://, edge://, about:, 拡張機能ページなど）
  // ルールでexcludeが指定されたタブも除外（設定で有効な場合のみ）
  const validTabs = tabs.filter(tab => {
    if (!tab.url || tab.id === undefined) return false;
    
    // 特殊URLは除外
    if (!/^(https?|file):\/\//i.test(tab.url)) return false;
    
    // ルール適用が有効な場合のみ、excludeルールをチェック
    if (settings.iconClickApplyRules) {
      const matchedRule = matchAutoCloseRule(
        { url: tab.url, title: tab.title },
        settings.autoCloseRules,
        settings.autoCloseRuleOrder
      );
      if (matchedRule?.action === 'exclude') return false;
    }
    
    return true;
  });

  // 固定タブの処理（設定でsuspendが選択されている場合）
  if (settings.iconClickPinnedAction === 'suspend') {
    const pinnedTabs = await browser.tabs.query({
      currentWindow: true,
      pinned: true,
    });
    
    // 固定タブをサスペンド（アクティブタブ以外）
    for (const tab of pinnedTabs) {
      if (tab.id !== undefined && !tab.active) {
        try {
          await browser.tabs.discard(tab.id);
          console.log(`固定タブをサスペンド: ${tab.id}`);
        } catch (e) {
          console.warn(`固定タブのサスペンドに失敗: ${tab.id}`, e);
        }
      }
    }
  }

  if (validTabs.length === 0) {
    console.log('保存対象のタブがありません');
    return;
  }

  await saveAndCloseTabs(validTabs, {
    activeTabWindowId: clickedTab.windowId,
    openTabManager: true,
  });
}

// 拡張アイコンクリック時のイベントリスナー
browser.action.onClicked.addListener(handleActionClick);

// 拡張機能がインストールされたとき
browser.runtime.onInstalled.addListener(async () => {
  console.log('TabBurrow がインストールされました');

  try {
    // 設定を読み込んで言語を初期化
    console.log('[onInstalled] Loading settings...');
    const settings = await getSettings();
    console.log('[onInstalled] Settings loaded, applying locale:', settings.locale);
    applyLocaleSetting(settings.locale);
    console.log('[onInstalled] Locale applied');

    // コンテキストメニューを作成
    console.log('[onInstalled] Creating context menus...');
    createContextMenus();
    console.log('[onInstalled] Context menus created');
    
    // カスタムグループサブメニューを初期化
    console.log('[onInstalled] Updating custom group menus...');
    await updateCustomGroupMenus();
    console.log('[onInstalled] Custom group menus updated');

    // 設定を読み込んで自動クローズを初期化
    console.log('[onInstalled] Initializing auto close...');
    await initAutoClose();
    console.log('[onInstalled] Auto close initialized');
  } catch (error) {
    console.error('[onInstalled] Error:', error);
  }
});

// メッセージの型定義
interface BackgroundMessage {
  type: string;
  checkId?: string;
  tabIds?: string[];
  excludeTabIds?: string[];
}

// 設定変更時のメッセージを処理
browser.runtime.onMessage.addListener((msg: unknown) => {
  const message = msg as BackgroundMessage;
  switch (message.type) {
    case 'settings-changed':
      // 設定を再読み込みして自動クローズを再初期化
      initAutoClose().then(async () => {
        // 言語設定も再適用
        const settings = await getSettings();
        applyLocaleSetting(settings.locale);
        // コンテキストメニューのタイトルを更新
        updateContextMenuTitles();
      });
      return Promise.resolve({ success: true });

    case 'link-check-start':
      // リンクチェックを開始（非同期で実行、進捗はポート経由で通知）
      (async () => {
        // UIから送信されたチェックIDを使用
        const checkId = message.checkId || `check-${Date.now()}`;
        
        try {
          const response = await checkLinks(
            { 
              checkId,
              tabIds: message.tabIds || [],
              excludeTabIds: message.excludeTabIds || [],
            },
            (checkId: string, progress: LinkCheckProgress, partialResults: LinkCheckResult[]) => {
              // 進捗と現時点の結果を全タブに通知（チェックIDを含む）
              browser.runtime.sendMessage({
                type: 'link-check-progress',
                checkId,
                progress,
                results: partialResults,
              }).catch(() => {
                // リスナーがいない場合は無視
              });
            }
          );
          
          // 完了を通知（チェックIDを含む）
          browser.runtime.sendMessage({
            type: 'link-check-complete',
            checkId: response.checkId,
            results: response.results,
          }).catch(() => {
            // リスナーがいない場合は無視
          });
        } catch (error) {
          // エラーを通知（チェックIDを含む）
          browser.runtime.sendMessage({
            type: 'link-check-error',
            checkId,
            error: String(error),
          }).catch(() => {
            // リスナーがいない場合は無視
          });
        }
      })();
      return Promise.resolve({ success: true, started: true });

    case 'link-check-cancel':
      cancelLinkCheck();
      return Promise.resolve({ success: true, cancelled: true });

    case 'link-check-status':
      return Promise.resolve({ 
        success: true, 
        running: isLinkCheckRunning() 
      });
  }
});

// アラームが発火したときの処理
browser.alarms.onAlarm.addListener(handleAutoCloseAlarm);

// コンテキストメニューがクリックされたときの処理
browser.contextMenus.onClicked.addListener(handleContextMenuClick);

// タブイベントリスナーを設定
setupTabEventListeners();


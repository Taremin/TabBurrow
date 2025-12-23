/**
 * platform.ts - プラットフォーム機能検出
 * 
 * ランタイムでブラウザの機能対応状況を検出する
 * Firefox Android等の制限環境でのフォールバック処理に使用
 */

import browser from './browserApi.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserAny = browser as any;

/**
 * プラットフォーム機能の検出結果
 * getterを使用してアクセス時に動的に検出
 */
export const platform = {
  /**
   * タブグループAPI（browser.tabs.group, browser.tabGroups）対応
   * Chrome/Firefox Desktop: ✓ 対応
   * Firefox Android: ✗ 非対応
   */
  get supportsTabGroups(): boolean {
    return typeof browserAny.tabs?.group === 'function';
  },
  
  /**
   * スクリーンショットAPI（browser.tabs.captureVisibleTab）対応
   * Chrome/Firefox Desktop: ✓ 対応
   * Firefox Android: ✗ 非対応
   */
  get supportsScreenshot(): boolean {
    return typeof browser.tabs.captureVisibleTab === 'function';
  },
  
  /**
   * セッションストレージ（browser.storage.session）対応
   * Chrome MV3/Firefox: ✓ 対応
   * Firefox Android: ✗ 非対応
   */
  get supportsSessionStorage(): boolean {
    return !!browser.storage?.session;
  },
};

/**
 * tabCache.ts - 保存済みURLのメモリキャッシュ管理
 */

import { getAllTabs } from '../storage';

// 保存済みURLのメモリキャッシュ (Set)
export const savedTabUrlsCache = new Set<string>();

/**
 * DBから保存済みタブのURLを取得し、キャッシュを更新する
 */
export async function updateSavedTabUrlsCache(): Promise<void> {
  try {
    const tabs = await getAllTabs();
    savedTabUrlsCache.clear();
    for (const tab of tabs) {
      if (tab.url) {
        savedTabUrlsCache.add(tab.url);
      }
      if (tab.canonicalUrl) {
        savedTabUrlsCache.add(tab.canonicalUrl);
      }
    }
    console.log(`[Cache] 保存済みURLキャッシュを更新しました: ${savedTabUrlsCache.size}件`);
  } catch (error) {
    console.error('[Cache] 保存済みURLキャッシュの更新に失敗しました:', error);
  }
}

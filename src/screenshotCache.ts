/**
 * TabBurrow - スクリーンショットキャッシュ
 * タブのスクリーンショットをインメモリでキャッシュし、タブ収納時に解放
 */

// キャッシュエントリの型定義
interface CacheEntry {
  blob: Blob;
  timestamp: number;
}

// インメモリキャッシュ (tabId -> CacheEntry)
const screenshotCache = new Map<number, CacheEntry>();

/**
 * スクリーンショットをキャッシュに保存
 */
export function setScreenshot(tabId: number, blob: Blob): void {
  screenshotCache.set(tabId, {
    blob,
    timestamp: Date.now(),
  });
  console.log(`[Cache] スクリーンショットをキャッシュ: tabId=${tabId}, size=${blob.size}`);
}

/**
 * キャッシュからスクリーンショットを取得
 */
export function getScreenshot(tabId: number): Blob | null {
  const entry = screenshotCache.get(tabId);
  if (entry) {
    console.log(`[Cache] キャッシュヒット: tabId=${tabId}`);
    return entry.blob;
  }
  console.log(`[Cache] キャッシュミス: tabId=${tabId}`);
  return null;
}

/**
 * 指定したタブのキャッシュを削除
 */
export function deleteScreenshot(tabId: number): void {
  if (screenshotCache.has(tabId)) {
    screenshotCache.delete(tabId);
    console.log(`[Cache] キャッシュを削除: tabId=${tabId}`);
  }
}

/**
 * 全キャッシュをクリア
 */
export function clearCache(): void {
  const size = screenshotCache.size;
  screenshotCache.clear();
  console.log(`[Cache] 全キャッシュをクリア: ${size}件`);
}

/**
 * キャッシュのサイズを取得
 */
export function getCacheSize(): number {
  return screenshotCache.size;
}

/**
 * キャッシュに存在するか確認
 */
export function hasScreenshot(tabId: number): boolean {
  return screenshotCache.has(tabId);
}

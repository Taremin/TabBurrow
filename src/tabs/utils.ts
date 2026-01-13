/**
 * TabBurrow - ユーティリティ関数
 */

/**
 * 日時をフォーマット
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const time = date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isToday) {
    return `今日 ${time}`;
  }
  
  return date.toLocaleDateString('ja-JP', { 
    month: 'numeric', 
    day: 'numeric' 
  }) + ' ' + time;
}

/**
 * バイト数を人間が読める形式に
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * HTMLエスケープ（React環境ではdangerouslySetInnerHTMLを使わない限り不要だが念のため）
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ソート関連の型をインポート
import type { SavedTab } from '../storage';
import type { ItemSortType } from '../settings';

/**
 * グループ内のタブをソート
 * 1. sortKey (文字列) があればそれによる辞書順。sortKeyがあるものが優先。
 * 2. 同一、または両方ない場合に sortType によるソート。
 */
export function sortTabsInGroup(
  tabs: SavedTab[],
  sortType: ItemSortType,
  customSortKeyOrder: 'asc' | 'desc' = 'asc'
): SavedTab[] {
  const sorted = [...tabs];
  
  sorted.sort((a, b) => {
    // 第一段階: sortKey (カスタムソートキー)
    const keyA = a.sortKey || '';
    const keyB = b.sortKey || '';
    
    if (keyA && !keyB) return -1;
    if (!keyA && keyB) return 1;
    if (keyA && keyB) {
      const cmp = keyA.localeCompare(keyB, 'ja');
      if (cmp !== 0) return customSortKeyOrder === 'asc' ? cmp : -cmp;
    }
    
    // 第二段階: sortType
    switch (sortType) {
      case 'saved-desc':
        return b.savedAt - a.savedAt;
      case 'saved-asc':
        return a.savedAt - b.savedAt;
      case 'title-asc':
        return a.title.localeCompare(b.title, 'ja');
      case 'title-desc':
        return b.title.localeCompare(a.title, 'ja');
      case 'accessed-desc':
        return b.lastAccessed - a.lastAccessed;
      case 'accessed-asc':
        return a.lastAccessed - b.lastAccessed;
      default:
        return 0;
    }
  });
  
  return sorted;
}

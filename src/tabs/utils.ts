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

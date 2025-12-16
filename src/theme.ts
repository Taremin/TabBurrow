/**
 * TabBurrow - テーマユーティリティ
 * テーマの適用と管理
 */

// テーマ設定の型定義
export type ThemeSetting = 'system' | 'dark' | 'light';

/**
 * テーマを適用する
 * @param theme テーマ設定
 */
export function applyTheme(theme: ThemeSetting): void {
  if (theme === 'system') {
    // システム設定に従う場合は属性を削除し、
    // CSSメディアクエリで自動判定させる
    document.documentElement.removeAttribute('data-theme');
  } else {
    // 手動でテーマを指定する場合は属性を設定
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * 現在のシステムテーマを取得
 * @returns 'dark' | 'light'
 */
export function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

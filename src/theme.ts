/**
 * TabBurrow - テーマユーティリティ
 * テーマの適用と管理
 */

import { getCustomTheme, applyThemeColors, clearCustomThemeStyles } from './customTheme.js';

// テーマ設定の型定義
// 'system' | 'dark' | 'light' | 'custom-{id}'
export type ThemeSetting = 'system' | 'dark' | 'light' | string;

// カスタムテーマIDのプレフィックス
export const CUSTOM_THEME_PREFIX = 'custom-';

/**
 * テーマ設定がカスタムテーマかどうかを判定
 */
export function isCustomTheme(theme: ThemeSetting): boolean {
  return theme.startsWith(CUSTOM_THEME_PREFIX);
}

/**
 * カスタムテーマ設定からIDを抽出
 */
export function extractCustomThemeId(theme: ThemeSetting): string | null {
  if (!isCustomTheme(theme)) {
    return null;
  }
  return theme.slice(CUSTOM_THEME_PREFIX.length);
}

/**
 * カスタムテーマIDからテーマ設定値を生成
 */
export function createCustomThemeSetting(id: string): ThemeSetting {
  return `${CUSTOM_THEME_PREFIX}${id}`;
}

/**
 * テーマを適用する
 * @param theme テーマ設定
 */
export async function applyTheme(theme: ThemeSetting): Promise<void> {
  // まずカスタムテーマのスタイルをクリア
  clearCustomThemeStyles();

  if (isCustomTheme(theme)) {
    // カスタムテーマの場合
    const themeId = extractCustomThemeId(theme);
    if (themeId) {
      const customTheme = await getCustomTheme(themeId);
      if (customTheme) {
        // カスタムテーマのカラーを適用
        applyThemeColors(customTheme.colors);
        // data-themeは削除（カスタムCSS変数が上書きするため）
        document.documentElement.removeAttribute('data-theme');
        return;
      }
    }
    // カスタムテーマが見つからない場合はシステムテーマにフォールバック
    document.documentElement.removeAttribute('data-theme');
  } else if (theme === 'system') {
    // システム設定に従う場合は属性を削除し、
    // CSSメディアクエリで自動判定させる
    document.documentElement.removeAttribute('data-theme');
  } else {
    // 手動でテーマを指定する場合は属性を設定
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * テーマを同期的に適用する（カスタムテーマ非対応、既存コード互換用）
 * @param theme テーマ設定
 */
export function applyThemeSync(theme: ThemeSetting): void {
  if (theme === 'system' || isCustomTheme(theme)) {
    document.documentElement.removeAttribute('data-theme');
  } else {
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

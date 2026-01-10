/**
 * TabBurrow - カスタムテーマ管理
 * ユーザー定義のカスタムテーマの型定義とストレージ操作
 */

import browser from './browserApi';

// テーマカラー設定の型定義
export interface ThemeColors {
  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  // テキスト色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // ボーダー
  borderColor: string;
  domainGroupBorder: string;
  // アクセント
  accentColor: string;
  accentHover: string;
  accentLight: string;
  accentSubtleSolid: string;
  // 危険色
  dangerColor: string;
  dangerHover: string;
  dangerLight: string;
  // 成功色
  successColor: string;
  successLight: string;
  // 警告色
  warningColor: string;
  warningLight: string;
  // シャドウ
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  // フォント設定
  fontFamily: string;
  fontSizeBase: string;
  fontSizeSmall: string;
}

// カスタムテーマの型定義
export interface CustomTheme {
  id: string;           // ユニークID (UUID)
  name: string;         // テーマ名
  createdAt: number;    // 作成日時
  updatedAt: number;    // 更新日時
  colors: ThemeColors;  // カラー設定
}

// ストレージキー
const CUSTOM_THEMES_KEY = 'customThemes';

// ライトモードのデフォルト値
export const LIGHT_THEME_DEFAULTS: ThemeColors = {
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  borderColor: '#e2e8f0',
  domainGroupBorder: '#cbd5e1',
  accentColor: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99, 102, 241, 0.1)',
  accentSubtleSolid: '#eff0fe',
  dangerColor: '#ef4444',
  dangerHover: '#dc2626',
  dangerLight: 'rgba(239, 68, 68, 0.1)',
  successColor: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.1)',
  warningColor: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSizeBase: '16px',
  fontSizeSmall: '14px',
};

// ダークモードのデフォルト値
export const DARK_THEME_DEFAULTS: ThemeColors = {
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  borderColor: '#334155',
  domainGroupBorder: '#475569',
  accentColor: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99, 102, 241, 0.2)',
  accentSubtleSolid: '#1e2544',
  dangerColor: '#ef4444',
  dangerHover: '#dc2626',
  dangerLight: 'rgba(239, 68, 68, 0.2)',
  successColor: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.2)',
  warningColor: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.25)',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.2)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSizeBase: '16px',
  fontSizeSmall: '14px',
};

/**
 * 新しいカスタムテーマを作成
 */
export function createCustomTheme(name: string, basedOn: 'light' | 'dark' = 'light'): CustomTheme {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    colors: basedOn === 'dark' ? { ...DARK_THEME_DEFAULTS } : { ...LIGHT_THEME_DEFAULTS },
  };
}

/**
 * すべてのカスタムテーマを取得
 */
export async function getCustomThemes(): Promise<CustomTheme[]> {
  const result = await browser.storage.local.get(CUSTOM_THEMES_KEY);
  return (result[CUSTOM_THEMES_KEY] as CustomTheme[] | undefined) || [];
}

/**
 * 特定のカスタムテーマを取得
 */
export async function getCustomTheme(id: string): Promise<CustomTheme | null> {
  const themes = await getCustomThemes();
  return themes.find(t => t.id === id) || null;
}

/**
 * カスタムテーマを保存（新規作成または更新）
 */
export async function saveCustomTheme(theme: CustomTheme): Promise<void> {
  const themes = await getCustomThemes();
  const existingIndex = themes.findIndex(t => t.id === theme.id);
  
  if (existingIndex >= 0) {
    // 既存のテーマを更新
    themes[existingIndex] = {
      ...theme,
      updatedAt: Date.now(),
    };
  } else {
    // 新規テーマを追加
    themes.push(theme);
  }
  
  await browser.storage.local.set({ [CUSTOM_THEMES_KEY]: themes });
}

/**
 * カスタムテーマを削除
 */
export async function deleteCustomTheme(id: string): Promise<void> {
  const themes = await getCustomThemes();
  const filteredThemes = themes.filter(t => t.id !== id);
  await browser.storage.local.set({ [CUSTOM_THEMES_KEY]: filteredThemes });
}

/**
 * カスタムテーマを複製
 */
export async function duplicateCustomTheme(id: string, newName: string): Promise<CustomTheme | null> {
  const original = await getCustomTheme(id);
  if (!original) {
    return null;
  }
  
  const now = Date.now();
  const duplicated: CustomTheme = {
    id: crypto.randomUUID(),
    name: newName,
    createdAt: now,
    updatedAt: now,
    colors: { ...original.colors },
  };
  
  await saveCustomTheme(duplicated);
  return duplicated;
}

/**
 * カスタムテーマをエクスポート用のJSONに変換
 */
export function exportThemeToJson(theme: CustomTheme): string {
  return JSON.stringify(theme, null, 2);
}

/**
 * 複数のカスタムテーマをエクスポート用のJSONに変換
 */
export function exportThemesToJson(themes: CustomTheme[]): string {
  return JSON.stringify(themes, null, 2);
}

/**
 * JSONからカスタムテーマをインポート
 */
export function importThemeFromJson(json: string): CustomTheme | CustomTheme[] | null {
  try {
    const parsed = JSON.parse(json);
    
    // 配列の場合
    if (Array.isArray(parsed)) {
      const validThemes: CustomTheme[] = [];
      for (const item of parsed) {
        if (isValidCustomTheme(item)) {
          validThemes.push(item);
        }
      }
      return validThemes.length > 0 ? validThemes : null;
    }
    
    // 単一テーマの場合
    if (isValidCustomTheme(parsed)) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * オブジェクトがCustomThemeの形式かどうかを検証
 */
function isValidCustomTheme(obj: unknown): obj is CustomTheme {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const theme = obj as Record<string, unknown>;
  
  // 必須プロパティの存在確認
  if (typeof theme.id !== 'string' || typeof theme.name !== 'string') {
    return false;
  }
  
  if (typeof theme.colors !== 'object' || theme.colors === null) {
    return false;
  }
  
  // colorsの各プロパティの存在確認（すべて文字列である必要）
  const colors = theme.colors as Record<string, unknown>;
  const requiredColorKeys: (keyof ThemeColors)[] = [
    'bgPrimary', 'bgSecondary', 'bgTertiary',
    'textPrimary', 'textSecondary', 'textMuted',
    'borderColor', 'domainGroupBorder',
    'accentColor', 'accentHover', 'accentLight', 'accentSubtleSolid',
    'dangerColor', 'dangerHover', 'dangerLight',
    'successColor', 'successLight',
    'warningColor', 'warningLight',
    'shadowSm', 'shadowMd', 'shadowLg',
    'fontFamily', 'fontSizeBase', 'fontSizeSmall',
  ];
  
  for (const key of requiredColorKeys) {
    if (typeof colors[key] !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * ThemeColorsのキーから対応するCSS変数名を取得
 */
export function getCssVariableName(key: keyof ThemeColors): string {
  const mapping: Record<keyof ThemeColors, string> = {
    bgPrimary: '--bg-primary',
    bgSecondary: '--bg-secondary',
    bgTertiary: '--bg-tertiary',
    textPrimary: '--text-primary',
    textSecondary: '--text-secondary',
    textMuted: '--text-muted',
    borderColor: '--border-color',
    domainGroupBorder: '--domain-group-border',
    accentColor: '--accent-color',
    accentHover: '--accent-hover',
    accentLight: '--accent-light',
    accentSubtleSolid: '--accent-subtle-solid',
    dangerColor: '--danger-color',
    dangerHover: '--danger-hover',
    dangerLight: '--danger-light',
    successColor: '--success-color',
    successLight: '--success-light',
    warningColor: '--warning-color',
    warningLight: '--warning-light',
    shadowSm: '--shadow-sm',
    shadowMd: '--shadow-md',
    shadowLg: '--shadow-lg',
    fontFamily: '--font-family',
    fontSizeBase: '--font-size-base',
    fontSizeSmall: '--font-size-small',
  };
  
  return mapping[key];
}

/**
 * ThemeColorsをCSS変数としてドキュメントに適用
 */
export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;
  
  for (const key of Object.keys(colors) as (keyof ThemeColors)[]) {
    const cssVarName = getCssVariableName(key);
    root.style.setProperty(cssVarName, colors[key]);
  }
}

/**
 * 適用されたカスタムテーマのCSS変数をクリア
 */
export function clearCustomThemeStyles(): void {
  const root = document.documentElement;
  const allKeys: (keyof ThemeColors)[] = [
    'bgPrimary', 'bgSecondary', 'bgTertiary',
    'textPrimary', 'textSecondary', 'textMuted',
    'borderColor', 'domainGroupBorder',
    'accentColor', 'accentHover', 'accentLight', 'accentSubtleSolid',
    'dangerColor', 'dangerHover', 'dangerLight',
    'successColor', 'successLight',
    'warningColor', 'warningLight',
    'shadowSm', 'shadowMd', 'shadowLg',
    'fontFamily', 'fontSizeBase', 'fontSizeSmall',
  ];
  
  for (const key of allKeys) {
    const cssVarName = getCssVariableName(key);
    root.style.removeProperty(cssVarName);
  }
}

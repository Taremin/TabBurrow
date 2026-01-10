/**
 * customTheme.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCustomTheme,
  exportThemeToJson,
  exportThemesToJson,
  importThemeFromJson,
  getCssVariableName,
  applyThemeColors,
  clearCustomThemeStyles,
  LIGHT_THEME_DEFAULTS,
  DARK_THEME_DEFAULTS,
  type CustomTheme,
} from './customTheme';

// browserApiをモック
vi.mock('./browserApi.js', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
  },
}));

describe('customTheme', () => {
  beforeEach(() => {
    // DOMの状態をリセット
    document.documentElement.style.cssText = '';
  });

  describe('createCustomTheme', () => {
    it('ライトテーマベースで新しいテーマを作成できる', () => {
      const theme = createCustomTheme('テストテーマ', 'light');
      
      expect(theme.name).toBe('テストテーマ');
      expect(theme.id).toBeDefined();
      expect(theme.createdAt).toBeDefined();
      expect(theme.updatedAt).toBeDefined();
      expect(theme.colors.bgPrimary).toBe(LIGHT_THEME_DEFAULTS.bgPrimary);
    });

    it('ダークテーマベースで新しいテーマを作成できる', () => {
      const theme = createCustomTheme('ダークテーマ', 'dark');
      
      expect(theme.colors.bgPrimary).toBe(DARK_THEME_DEFAULTS.bgPrimary);
    });

    it('デフォルトはライトテーマベース', () => {
      const theme = createCustomTheme('デフォルト');
      
      expect(theme.colors.bgPrimary).toBe(LIGHT_THEME_DEFAULTS.bgPrimary);
    });
  });

  describe('exportThemeToJson / importThemeFromJson', () => {
    it('テーマをJSONにエクスポートして再インポートできる', () => {
      const original = createCustomTheme('エクスポートテスト');
      const json = exportThemeToJson(original);
      const imported = importThemeFromJson(json);
      
      expect(imported).toEqual(original);
    });

    it('複数テーマをエクスポートして再インポートできる', () => {
      const themes = [
        createCustomTheme('テーマ1'),
        createCustomTheme('テーマ2'),
      ];
      const json = exportThemesToJson(themes);
      const imported = importThemeFromJson(json) as CustomTheme[];
      
      expect(imported).toHaveLength(2);
      expect(imported[0].name).toBe('テーマ1');
      expect(imported[1].name).toBe('テーマ2');
    });

    it('無効なJSONはnullを返す', () => {
      expect(importThemeFromJson('invalid json')).toBeNull();
      expect(importThemeFromJson('{}')).toBeNull();
      expect(importThemeFromJson('{"id": "test"}')).toBeNull();
    });
  });

  describe('getCssVariableName', () => {
    it('キャメルケースをCSS変数名に変換できる', () => {
      expect(getCssVariableName('bgPrimary')).toBe('--bg-primary');
      expect(getCssVariableName('textSecondary')).toBe('--text-secondary');
      expect(getCssVariableName('accentColor')).toBe('--accent-color');
      expect(getCssVariableName('fontFamily')).toBe('--font-family');
    });
  });

  describe('applyThemeColors', () => {
    it('テーマカラーをCSS変数として適用できる', () => {
      applyThemeColors(LIGHT_THEME_DEFAULTS);
      
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--bg-primary')).toBe('#f8fafc');
      expect(style.getPropertyValue('--text-primary')).toBe('#1e293b');
      expect(style.getPropertyValue('--accent-color')).toBe('#6366f1');
    });
  });

  describe('clearCustomThemeStyles', () => {
    it('適用されたCSS変数をクリアできる', () => {
      // まずテーマを適用
      applyThemeColors(LIGHT_THEME_DEFAULTS);
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#f8fafc');
      
      // クリア
      clearCustomThemeStyles();
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('');
    });
  });

  describe('LIGHT_THEME_DEFAULTS / DARK_THEME_DEFAULTS', () => {
    it('ライトテーマのデフォルト値がすべて定義されている', () => {
      expect(LIGHT_THEME_DEFAULTS.bgPrimary).toBeDefined();
      expect(LIGHT_THEME_DEFAULTS.textPrimary).toBeDefined();
      expect(LIGHT_THEME_DEFAULTS.accentColor).toBeDefined();
      expect(LIGHT_THEME_DEFAULTS.fontFamily).toBeDefined();
      expect(LIGHT_THEME_DEFAULTS.fontSizeBase).toBeDefined();
    });

    it('ダークテーマのデフォルト値がすべて定義されている', () => {
      expect(DARK_THEME_DEFAULTS.bgPrimary).toBeDefined();
      expect(DARK_THEME_DEFAULTS.textPrimary).toBeDefined();
      expect(DARK_THEME_DEFAULTS.accentColor).toBeDefined();
    });

    it('ライトとダークでbgPrimaryが異なる', () => {
      expect(LIGHT_THEME_DEFAULTS.bgPrimary).not.toBe(DARK_THEME_DEFAULTS.bgPrimary);
    });
  });
});

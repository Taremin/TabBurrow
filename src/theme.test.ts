/**
 * theme.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// customThemeモジュールをモック
vi.mock('./customTheme.js', () => ({
  getCustomTheme: vi.fn().mockResolvedValue(null),
  applyThemeColors: vi.fn(),
  clearCustomThemeStyles: vi.fn(),
}));

import { applyTheme, getSystemTheme, isCustomTheme, extractCustomThemeId, createCustomThemeSetting } from './theme';

describe('theme', () => {
  beforeEach(() => {
    // DOMの状態をリセット
    document.documentElement.removeAttribute('data-theme');
    // インラインスタイルもクリア
    document.documentElement.style.cssText = '';
  });

  describe('applyTheme', () => {
    it('darkテーマを適用できる', async () => {
      await applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('lightテーマを適用できる', async () => {
      await applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('systemテーマの場合はdata-theme属性を削除する', async () => {
      // 先にdarkを設定
      await applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      // systemを適用すると属性が削除される
      await applyTheme('system');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });

  describe('isCustomTheme', () => {
    it('custom-で始まるテーマをカスタムテーマと判定する', () => {
      expect(isCustomTheme('custom-abc123')).toBe(true);
      expect(isCustomTheme('custom-')).toBe(true);
    });

    it('プリセットテーマはカスタムテーマと判定しない', () => {
      expect(isCustomTheme('system')).toBe(false);
      expect(isCustomTheme('dark')).toBe(false);
      expect(isCustomTheme('light')).toBe(false);
    });
  });

  describe('extractCustomThemeId', () => {
    it('カスタムテーマからIDを抽出できる', () => {
      expect(extractCustomThemeId('custom-abc123')).toBe('abc123');
      expect(extractCustomThemeId('custom-my-theme-id')).toBe('my-theme-id');
    });

    it('プリセットテーマからはnullを返す', () => {
      expect(extractCustomThemeId('system')).toBeNull();
      expect(extractCustomThemeId('dark')).toBeNull();
    });
  });

  describe('createCustomThemeSetting', () => {
    it('IDからテーマ設定値を生成できる', () => {
      expect(createCustomThemeSetting('abc123')).toBe('custom-abc123');
      expect(createCustomThemeSetting('my-theme')).toBe('custom-my-theme');
    });
  });

  describe('getSystemTheme', () => {
    it('ダークモード設定時はdarkを返す', () => {
      // matchMediaをモック
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('dark');
      vi.unstubAllGlobals();
    });

    it('ライトモード設定時はlightを返す', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('light');
      vi.unstubAllGlobals();
    });
  });
});

/**
 * theme.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyTheme, getSystemTheme } from './theme.js';

describe('theme', () => {
  beforeEach(() => {
    // DOMの状態をリセット
    document.documentElement.removeAttribute('data-theme');
  });

  describe('applyTheme', () => {
    it('darkテーマを適用できる', () => {
      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('lightテーマを適用できる', () => {
      applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('systemテーマの場合はdata-theme属性を削除する', () => {
      // 先にdarkを設定
      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      
      // systemを適用すると属性が削除される
      applyTheme('system');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
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

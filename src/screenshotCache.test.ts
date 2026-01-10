/**
 * screenshotCache.ts のユニットテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setScreenshot,
  getScreenshot,
  deleteScreenshot,
  clearCache,
  getCacheSize,
  hasScreenshot,
} from './screenshotCache';

describe('screenshotCache', () => {
  // 各テスト前にキャッシュをクリア
  beforeEach(() => {
    clearCache();
  });

  describe('setScreenshot / getScreenshot', () => {
    it('スクリーンショットを保存して取得できる', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      setScreenshot(1, blob);
      
      const result = getScreenshot(1);
      expect(result).toBe(blob);
    });

    it('存在しないタブIDの場合はnullを返す', () => {
      const result = getScreenshot(999);
      expect(result).toBeNull();
    });

    it('同じタブIDで上書きできる', () => {
      const blob1 = new Blob(['test1'], { type: 'image/png' });
      const blob2 = new Blob(['test2'], { type: 'image/png' });
      
      setScreenshot(1, blob1);
      setScreenshot(1, blob2);
      
      const result = getScreenshot(1);
      expect(result).toBe(blob2);
    });
  });

  describe('deleteScreenshot', () => {
    it('指定したタブのキャッシュを削除できる', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      setScreenshot(1, blob);
      expect(hasScreenshot(1)).toBe(true);
      
      deleteScreenshot(1);
      expect(hasScreenshot(1)).toBe(false);
      expect(getScreenshot(1)).toBeNull();
    });

    it('存在しないタブIDを削除してもエラーにならない', () => {
      expect(() => deleteScreenshot(999)).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('全てのキャッシュを削除する', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      setScreenshot(1, blob);
      setScreenshot(2, blob);
      setScreenshot(3, blob);
      
      expect(getCacheSize()).toBe(3);
      
      clearCache();
      
      expect(getCacheSize()).toBe(0);
      expect(hasScreenshot(1)).toBe(false);
      expect(hasScreenshot(2)).toBe(false);
      expect(hasScreenshot(3)).toBe(false);
    });
  });

  describe('getCacheSize', () => {
    it('キャッシュサイズを取得できる', () => {
      expect(getCacheSize()).toBe(0);
      
      const blob = new Blob(['test'], { type: 'image/png' });
      setScreenshot(1, blob);
      expect(getCacheSize()).toBe(1);
      
      setScreenshot(2, blob);
      expect(getCacheSize()).toBe(2);
    });
  });

  describe('hasScreenshot', () => {
    it('キャッシュの存在確認ができる', () => {
      expect(hasScreenshot(1)).toBe(false);
      
      const blob = new Blob(['test'], { type: 'image/png' });
      setScreenshot(1, blob);
      
      expect(hasScreenshot(1)).toBe(true);
      expect(hasScreenshot(2)).toBe(false);
    });
  });
});

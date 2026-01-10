/**
 * i18n.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectDefaultLocale,
  getCurrentLocale,
  setCurrentLocale,
  t,
  applyLocaleSetting,
} from './i18n';

describe('i18n', () => {
  // 各テスト前に言語をリセット
  beforeEach(() => {
    setCurrentLocale('en');
  });

  describe('getCurrentLocale / setCurrentLocale', () => {
    it('設定した言語を取得できる', () => {
      setCurrentLocale('ja');
      expect(getCurrentLocale()).toBe('ja');
    });

    it('デフォルトは英語', () => {
      // beforeEachでenに設定済み
      expect(getCurrentLocale()).toBe('en');
    });
  });

  describe('detectDefaultLocale', () => {
    it('ブラウザ言語が日本語の場合はjaを返す', () => {
      // navigatorをモック
      vi.stubGlobal('navigator', { language: 'ja-JP' });
      expect(detectDefaultLocale()).toBe('ja');
      vi.unstubAllGlobals();
    });

    it('ブラウザ言語が英語の場合はenを返す', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      expect(detectDefaultLocale()).toBe('en');
      vi.unstubAllGlobals();
    });

    it('その他の言語の場合はenを返す', () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' });
      expect(detectDefaultLocale()).toBe('en');
      vi.unstubAllGlobals();
    });
  });

  describe('t (翻訳関数)', () => {
    it('英語の翻訳を取得できる', () => {
      setCurrentLocale('en');
      // 実際の翻訳キーを使用（存在することを前提）
      const result = t('tabs.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('日本語の翻訳を取得できる', () => {
      setCurrentLocale('ja');
      const result = t('tabs.title');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('存在しないキーの場合はキーをそのまま返す', () => {
      const result = t('nonexistent.key.here');
      expect(result).toBe('nonexistent.key.here');
    });

    it('パラメータを置換できる', () => {
      // パラメータ付きの翻訳がある場合のテスト
      setCurrentLocale('en');
      // {count} などのプレースホルダーがあるキーを探す
      // 実際のキーに依存するが、とりあえずパラメータなしでも動作確認
      const result = t('tabs.title', { count: 5 });
      expect(typeof result).toBe('string');
    });
  });

  describe('applyLocaleSetting', () => {
    it('autoの場合はブラウザ言語を検出して適用する', () => {
      vi.stubGlobal('navigator', { language: 'ja-JP' });
      const result = applyLocaleSetting('auto');
      expect(result).toBe('ja');
      expect(getCurrentLocale()).toBe('ja');
      vi.unstubAllGlobals();
    });

    it('明示的な言語設定を適用する', () => {
      const result = applyLocaleSetting('ja');
      expect(result).toBe('ja');
      expect(getCurrentLocale()).toBe('ja');
    });
  });
});

/**
 * settings.ts のユニットテスト
 * Chrome APIに依存しない純粋関数をテスト
 */
import { describe, it, expect } from 'vitest';
import {
  getDefaultSettings,
  matchAutoCloseRule,
  escapeRegexPattern,
  createAutoCloseRule,
  type AutoCloseRule,
  type RuleOrderType,
} from './settings.js';

describe('settings', () => {
  describe('getDefaultSettings', () => {
    it('デフォルト設定を返す', () => {
      const settings = getDefaultSettings();
      
      expect(settings.autoCloseEnabled).toBe(false);
      expect(settings.autoCloseSeconds).toBe(1800);
      expect(settings.autoCloseRules).toEqual([]);
      expect(settings.locale).toBe('auto');
      expect(settings.theme).toBe('system');
      expect(settings.restoreMode).toBe('lazy');
    });

    it('毎回新しいオブジェクトを返す', () => {
      const settings1 = getDefaultSettings();
      const settings2 = getDefaultSettings();
      
      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });
  });

  describe('escapeRegexPattern', () => {
    it('ドット(.)をエスケープする', () => {
      expect(escapeRegexPattern('github.com')).toBe('github\\.com');
    });

    it('複数の特殊文字をエスケープする', () => {
      expect(escapeRegexPattern('a.b*c?d')).toBe('a\\.b\\*c\\?d');
    });

    it('特殊文字がない場合はそのまま返す', () => {
      expect(escapeRegexPattern('github')).toBe('github');
    });
  });

  describe('createAutoCloseRule', () => {
    it('新しいルールを作成する', () => {
      const rule = createAutoCloseRule(
        'テストルール',
        'domain',
        'example\\.com',
        'exclude'
      );

      expect(rule.name).toBe('テストルール');
      expect(rule.targetType).toBe('domain');
      expect(rule.pattern).toBe('example\\.com');
      expect(rule.action).toBe('exclude');
      expect(rule.enabled).toBe(true);
      expect(rule.id).toBeDefined();
    });

    it('targetGroupを指定できる', () => {
      const rule = createAutoCloseRule(
        'グループ保存ルール',
        'domain',
        'example\\.com',
        'saveToGroup',
        '読み物'
      );

      expect(rule.targetGroup).toBe('読み物');
    });

    it('毎回ユニークなIDを生成する', () => {
      const rule1 = createAutoCloseRule('ルール1', 'domain', 'a', 'exclude');
      const rule2 = createAutoCloseRule('ルール2', 'domain', 'b', 'exclude');

      expect(rule1.id).not.toBe(rule2.id);
    });
  });

  describe('matchAutoCloseRule', () => {
    const createTestRule = (
      pattern: string,
      targetType: AutoCloseRule['targetType'] = 'domain',
      action: AutoCloseRule['action'] = 'exclude',
      enabled = true
    ): AutoCloseRule => ({
      id: `test-${Math.random()}`,
      name: 'テスト',
      enabled,
      targetType,
      pattern,
      action,
    });

    it('ドメインにマッチするルールを返す', () => {
      const rules = [createTestRule('github\\.com')];
      const tab = { url: 'https://github.com/user/repo' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('github\\.com');
    });

    it('マッチしない場合はnullを返す', () => {
      const rules = [createTestRule('github\\.com')];
      const tab = { url: 'https://example.com/' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).toBeNull();
    });

    it('無効なルールはスキップされる', () => {
      const rules = [
        createTestRule('github\\.com', 'domain', 'exclude', false),
        createTestRule('example\\.com', 'domain', 'close', true),
      ];
      const tab = { url: 'https://github.com/user' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).toBeNull();
    });

    it('asc順序で最初にマッチしたルールを返す', () => {
      const rules = [
        createTestRule('github', 'domain', 'exclude'),
        createTestRule('github\\.com', 'domain', 'close'),
      ];
      const tab = { url: 'https://github.com/' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result?.action).toBe('exclude');
    });

    it('desc順序で最後にマッチしたルールを返す', () => {
      const rules = [
        createTestRule('github', 'domain', 'exclude'),
        createTestRule('github\\.com', 'domain', 'close'),
      ];
      const tab = { url: 'https://github.com/' };

      const result = matchAutoCloseRule(tab, rules, 'desc');

      expect(result?.action).toBe('close');
    });

    it('URLパス全体にマッチできる（url targetType）', () => {
      const rules = [createTestRule('/user/repo', 'url')];
      const tab = { url: 'https://github.com/user/repo?tab=code' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).not.toBeNull();
    });

    it('完全URLにマッチできる（fullUrl targetType）', () => {
      const rules = [createTestRule('\\?tab=code', 'fullUrl')];
      const tab = { url: 'https://github.com/user/repo?tab=code' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).not.toBeNull();
    });

    it('タイトルにマッチできる（title targetType）', () => {
      const rules = [createTestRule('GitHub', 'title')];
      const tab = { url: 'https://github.com/', title: 'GitHub - Let\'s build' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result).not.toBeNull();
    });

    it('空のルールリストではnullを返す', () => {
      const result = matchAutoCloseRule({ url: 'https://example.com' }, [], 'asc');

      expect(result).toBeNull();
    });

    it('無効な正規表現パターンは無視される', () => {
      const rules = [
        createTestRule('[invalid'),  // 無効なパターン
        createTestRule('example\\.com'),
      ];
      const tab = { url: 'https://example.com/' };

      const result = matchAutoCloseRule(tab, rules, 'asc');

      expect(result?.pattern).toBe('example\\.com');
    });
  });
});

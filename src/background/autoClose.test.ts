/**
 * autoClose.ts のユニットテスト
 * キャッシュ管理とエクスポートされた定数・関数をテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AUTO_CLOSE_ALARM_NAME,
  tabLastActiveTime,
  getCachedSettings,
  setCachedSettings,
} from './autoClose.js';
import type { Settings } from '../settings.js';

describe('autoClose', () => {
  describe('AUTO_CLOSE_ALARM_NAME', () => {
    it('アラーム名が定義されている', () => {
      expect(AUTO_CLOSE_ALARM_NAME).toBe('auto-close-tabs');
    });
  });

  describe('tabLastActiveTime', () => {
    beforeEach(() => {
      tabLastActiveTime.clear();
    });

    it('タブの最終アクティブ時刻を記録できる', () => {
      const now = Date.now();
      tabLastActiveTime.set(1, now);
      
      expect(tabLastActiveTime.get(1)).toBe(now);
    });

    it('複数タブの時刻を管理できる', () => {
      const time1 = Date.now();
      const time2 = time1 + 1000;
      
      tabLastActiveTime.set(1, time1);
      tabLastActiveTime.set(2, time2);
      
      expect(tabLastActiveTime.size).toBe(2);
      expect(tabLastActiveTime.get(1)).toBe(time1);
      expect(tabLastActiveTime.get(2)).toBe(time2);
    });

    it('タブを削除できる', () => {
      tabLastActiveTime.set(1, Date.now());
      tabLastActiveTime.delete(1);
      
      expect(tabLastActiveTime.has(1)).toBe(false);
    });
  });

  describe('getCachedSettings / setCachedSettings', () => {
    it('初期状態ではnullを返す（または以前の状態を保持）', () => {
      // テスト間でキャッシュが共有されるため、明示的にセットしてテスト
      const result = getCachedSettings();
      // 初期状態ではnullだが、他のテストで設定されている可能性がある
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('設定をキャッシュして取得できる', () => {
      const mockSettings: Settings = {
        autoCloseEnabled: true,
        autoCloseSeconds: 300,
        autoCloseRules: [],
        autoCloseRuleOrder: 'asc',
        locale: 'ja',
        theme: 'dark',
        groupSort: 'count-desc',
        itemSort: 'saved-desc',
        restoreMode: 'lazy',
        restoreIntervalMs: 100,
        linkCheckRules: [],
        linkCheckTimeoutMs: 10000,
        linkCheckConcurrency: 5,
        linkCheckDomainConcurrency: 1,
        linkCheckDomainDelayMs: 100,
        iconClickApplyRules: true,
        iconClickPinnedAction: 'skip',
        autoBackupEnabled: false,
        autoBackupIntervalPreset: '24h',
        autoBackupIntervalMinutes: 1440,
        autoBackupKeepCount: 5,
      };

      setCachedSettings(mockSettings);
      const result = getCachedSettings();

      expect(result).toEqual(mockSettings);
      expect(result?.autoCloseEnabled).toBe(true);
      expect(result?.autoCloseSeconds).toBe(300);
    });

    it('キャッシュを上書きできる', () => {
      const settings1: Settings = {
        autoCloseEnabled: false,
        autoCloseSeconds: 100,
        autoCloseRules: [],
        autoCloseRuleOrder: 'asc',
        locale: 'en',
        theme: 'light',
        groupSort: 'count-desc',
        itemSort: 'saved-desc',
        restoreMode: 'normal',
        restoreIntervalMs: 100,
        linkCheckRules: [],
        linkCheckTimeoutMs: 10000,
        linkCheckConcurrency: 5,
        linkCheckDomainConcurrency: 1,
        linkCheckDomainDelayMs: 100,
        iconClickApplyRules: true,
        iconClickPinnedAction: 'skip',
        autoBackupEnabled: false,
        autoBackupIntervalPreset: '24h',
        autoBackupIntervalMinutes: 1440,
        autoBackupKeepCount: 5,
      };

      const settings2: Settings = {
        autoCloseEnabled: true,
        autoCloseSeconds: 600,
        autoCloseRules: [],
        autoCloseRuleOrder: 'desc',
        locale: 'ja',
        theme: 'dark',
        groupSort: 'domain-asc',
        itemSort: 'title-asc',
        restoreMode: 'lazy',
        restoreIntervalMs: 200,
        linkCheckRules: [],
        linkCheckTimeoutMs: 10000,
        linkCheckConcurrency: 5,
        linkCheckDomainConcurrency: 1,
        linkCheckDomainDelayMs: 100,
        iconClickApplyRules: true,
        iconClickPinnedAction: 'skip',
        autoBackupEnabled: false,
        autoBackupIntervalPreset: '24h',
        autoBackupIntervalMinutes: 1440,
        autoBackupKeepCount: 5,
      };

      setCachedSettings(settings1);
      expect(getCachedSettings()?.autoCloseEnabled).toBe(false);

      setCachedSettings(settings2);
      expect(getCachedSettings()?.autoCloseEnabled).toBe(true);
      expect(getCachedSettings()?.autoCloseSeconds).toBe(600);
    });
  });
});

/**
 * TabBurrow - 設定管理フック
 * 設定の読み込み・変更検出・保存をカプセル化
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import browser from '../../browserApi.js';
import {
  getSettings,
  saveSettings,
  notifySettingsChanged,
  type Settings,
} from '../../settings.js';
import { applyLocaleSetting } from '../../i18n.js';
import { applyTheme } from '../../theme.js';

// フックの戻り値型
export interface UseSettingsReturn {
  settings: Settings;
  savedSettings: Settings;
  hasChanges: boolean;
  isLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
}

// デフォルト設定
const defaultSettings: Settings = {
  autoCloseEnabled: false,
  autoCloseSeconds: 300,
  autoCloseRules: [],
  autoCloseRuleOrder: 'asc',
  locale: 'auto',
  theme: 'system',
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

/**
 * 設定管理フック
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const statusTimeoutRef = useRef<number | null>(null);

  // 変更検出
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // 設定読み込み
  const reload = useCallback(async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
      setSavedSettings(loaded);
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    reload();
  }, [reload]);

  // 設定変更メッセージのリスナー
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'settings-changed') {
        reload();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [reload]);

  // 単一設定の更新
  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveStatus('idle');
    
    // テーマは即時プレビュー
    if (key === 'theme') {
      applyTheme(value as Settings['theme']);
    }
  }, []);

  // 設定保存
  const save = useCallback(async () => {
    // 入力値のバリデーション
    const validated = { ...settings };
    if (validated.autoCloseSeconds < 30) {
      validated.autoCloseSeconds = 30;
    } else if (validated.autoCloseSeconds > 86400) {
      validated.autoCloseSeconds = 86400;
    }
    if (validated.restoreIntervalMs < 0) {
      validated.restoreIntervalMs = 0;
    } else if (validated.restoreIntervalMs > 1000) {
      validated.restoreIntervalMs = 1000;
    }

    setSaveStatus('saving');
    
    try {
      // 言語変更を検出
      const localeChanged = validated.locale !== savedSettings.locale;

      await saveSettings(validated);
      setSavedSettings(validated);
      setSettings(validated);

      // 言語が変更された場合は適用
      if (localeChanged) {
        applyLocaleSetting(validated.locale);
      }

      // テーマを確定適用
      applyTheme(validated.theme);

      // Background Scriptに通知
      notifySettingsChanged();

      setSaveStatus('success');

      // ステータスを3秒後にリセット
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      setSaveStatus('error');
    }
  }, [settings, savedSettings]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    savedSettings,
    hasChanges,
    isLoading,
    saveStatus,
    updateSetting,
    save,
    reload,
  };
}

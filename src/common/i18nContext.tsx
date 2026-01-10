/**
 * TabBurrow - React用i18nコンテキスト（共通モジュール）
 * 言語状態を管理し、翻訳フックを提供
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import browser from '../browserApi';
import { 
  t as translate, 
  applyLocaleSetting, 
  getCurrentLocale, 
  type SupportedLocale, 
  type LocaleSetting 
} from '../i18n';
import { getSettings } from '../settings';

// コンテキストの型
interface I18nContextType {
  locale: SupportedLocale;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// デフォルト値
const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  t: (key) => key,
});

// Provider Props
interface I18nProviderProps {
  children: ReactNode;
}

/**
 * I18n Provider
 * アプリ全体で言語状態を共有
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<SupportedLocale>('en');
  const [isReady, setIsReady] = useState(false);

  // 初期化時に設定から言語を読み込み
  useEffect(() => {
    async function initLocale() {
      try {
        const settings = await getSettings();
        const appliedLocale = applyLocaleSetting(settings.locale);
        setLocale(appliedLocale);
      } catch (error) {
        console.error('言語設定の読み込みに失敗:', error);
        setLocale('en');
      }
      setIsReady(true);
    }
    initLocale();

    // 設定変更メッセージを監視
    const listener = (message: unknown) => {
      const msg = message as { type?: string };
      if (msg.type === 'settings-changed') {
        initLocale();
      }
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  // 翻訳関数（現在の言語でラップ）
  const t = (key: string, params?: Record<string, string | number>): string => {
    return translate(key, params);
  };

  // 初期化完了まで待機（ちらつき防止）
  if (!isReady) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * 翻訳フック
 * コンポーネント内で翻訳を使用
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

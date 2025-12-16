/**
 * TabBurrow - 国際化（i18n）モジュール
 * 日本語/英語の翻訳データと言語切り替えロジックを提供
 */

// 翻訳データをJSONからインポート
import ja from './locales/ja.json';
import en from './locales/en.json';

// 対応言語
export type SupportedLocale = 'ja' | 'en';
export type LocaleSetting = SupportedLocale | 'auto';

// 翻訳データの型
type TranslationData = {
  [key: string]: string | TranslationData;
};

// 翻訳データマップ
const translations: Record<SupportedLocale, TranslationData> = { 
  ja: ja as TranslationData, 
  en: en as TranslationData 
};

// 現在の言語（キャッシュ）
let currentLocale: SupportedLocale = 'en';

/**
 * ブラウザ言語からデフォルト言語を判定
 */
export function detectDefaultLocale(): SupportedLocale {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
}

/**
 * 現在の言語を取得
 */
export function getCurrentLocale(): SupportedLocale {
  return currentLocale;
}

/**
 * 言語を設定（内部キャッシュ更新）
 */
export function setCurrentLocale(locale: SupportedLocale): void {
  currentLocale = locale;
}

/**
 * ネストされたオブジェクトからキーで値を取得
 * キーは "settings.language.title" のようなドット区切り形式
 */
function getNestedValue(obj: TranslationData, key: string): string | undefined {
  const keys = key.split('.');
  let current: TranslationData | string | undefined = obj;

  for (const k of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[k];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * 翻訳関数
 * @param key 翻訳キー（ドット区切り、例: "settings.language.title"）
 * @param params プレースホルダー置換用パラメータ
 * @returns 翻訳されたテキスト
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const data = translations[currentLocale];
  let text = getNestedValue(data, key);

  // 翻訳が見つからない場合、英語にフォールバック
  if (text === undefined && currentLocale !== 'en') {
    text = getNestedValue(translations.en, key);
  }

  // それでも見つからない場合はキーをそのまま返す
  if (text === undefined) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  // パラメータ置換
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }

  return text;
}

/**
 * 言語設定を適用
 * 'auto'の場合はブラウザ言語を検出して設定
 */
export function applyLocaleSetting(setting: LocaleSetting): SupportedLocale {
  const locale = setting === 'auto' ? detectDefaultLocale() : setting;
  setCurrentLocale(locale);
  return locale;
}

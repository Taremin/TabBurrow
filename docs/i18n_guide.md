# 国際化（i18n）ガイド

## 概要
TabBurrowは日本語と英語の2言語に対応しています。翻訳データはJSONファイルで管理し、独自のi18nモジュールで処理します。

## ファイル構成
```
src/
├── i18n.ts              # i18nモジュール（翻訳関数）
└── locales/
    ├── ja.json          # 日本語
    └── en.json          # 英語
```

## 翻訳データ形式
JSONファイルはネスト構造をサポートしています：
```json
{
  "tabs": {
    "title": "タブ管理",
    "search": {
      "placeholder": "検索..."
    }
  },
  "settings": {
    "title": "設定"
  }
}
```

## 翻訳関数の使い方

### 基本
```typescript
import { t } from '../i18n.js';

// ドット区切りでキーを指定
const text = t('tabs.title');  // → "タブ管理"
```

### パラメータ置換
```typescript
// JSONで定義: "count": "{count}件のタブ"
const text = t('tabs.count', { count: 5 });  // → "5件のタブ"
```

## 新しい翻訳キーの追加手順

1. **両方のJSONに追加**
   ```json
   // ja.json
   { "newFeature": { "title": "新機能" } }
   
   // en.json
   { "newFeature": { "title": "New Feature" } }
   ```

2. **コードで使用**
   ```typescript
   const title = t('newFeature.title');
   ```

3. **整合性チェック**
   ```bash
   npm run i18n:check
   ```
   両言語で不足しているキーがあれば警告が表示されます。

## 言語設定

### 設定値
- `'auto'`: ブラウザ言語を自動検出
- `'ja'`: 日本語固定
- `'en'`: 英語固定

### 言語の適用
```typescript
import { applyLocaleSetting, setCurrentLocale } from '../i18n.js';

// 設定から適用
applyLocaleSetting(settings.locale);

// 直接設定
setCurrentLocale('ja');
```

## 注意事項
- 翻訳が見つからない場合は英語にフォールバック
- 英語にも存在しない場合はキー名がそのまま表示される（コンソールに警告）
- コンテキストメニューは`browser.i18n`ではなく独自モジュールを使用

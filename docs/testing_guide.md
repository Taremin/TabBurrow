# テストガイド

## 概要
TabBurrowは以下のテストフレームワークを使用しています：
- **Vitest**: ユニットテスト
- **Playwright**: E2Eテスト

## ユニットテスト（Vitest）

### 実行コマンド
```bash
# 全テスト実行
npm test

# ウォッチモード（ファイル変更時に自動再実行）
npm run test:watch

# カバレッジレポート付き
npm run test:coverage
```

### 設定 (`vitest.config.ts`)
- **環境**: `happy-dom`（軽量なDOM実装）
- **セットアップ**: `src/__tests__/setup.ts`
- **対象**: `src/**/*.test.ts`, `src/**/*.test.tsx`

### テストファイル配置
```
src/
├── __tests__/
│   └── setup.ts          # 共通セットアップ
├── background/
│   ├── autoClose.test.ts
│   ├── contextMenu.test.ts
│   └── tabSaver.test.ts
└── tabs/
    ├── ConfirmDialog.test.tsx
    ├── GroupHeader.test.tsx
    └── utils.test.ts
```

### モック

#### IndexedDB (`fake-indexeddb`)
```typescript
import 'fake-indexeddb/auto';
// setup.tsで自動的に有効化
```

#### Browser API
```typescript
// グローバルモック（setup.tsで定義）
vi.mock('../browserApi.js', () => ({
  default: {
    storage: { local: { get: vi.fn(), set: vi.fn() } },
    runtime: { sendMessage: vi.fn() },
    // ...
  },
}));
```

## E2Eテスト（Playwright）

### 実行コマンド
```bash
# 全テスト
npm run e2e

# Chromeのみ
npm run e2e:chrome

# ブラウザ表示モード
npm run e2e:headed

# デバッグモード
npm run e2e:debug
```

### 設定 (`playwright.config.ts`)
- **プロジェクト**: Chromium（拡張機能テスト用）
- **拡張機能パス**: `dist/chrome`

### テストファイル配置
```
e2e/
├── extension.spec.ts   # 拡張機能基本テスト
├── options.spec.ts     # 設定画面テスト
└── fixtures/           # テスト用フィクスチャ
```

### 注意事項
- E2Eテスト実行前に `npm run build:chrome` でビルドが必要
- 日本語でテスト名を指定する場合、コマンドラインでエラーになることがあるため、ファイル名と行番号で指定する
  ```bash
  npx playwright test e2e/extension.spec.ts:10
  ```

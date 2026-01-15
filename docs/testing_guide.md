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
├── i18n.spec.ts        # 翻訳キー表示テスト
├── linkCheck.spec.ts   # リンクチェック機能テスト
├── options.spec.ts     # 設定画面テスト
├── tabs.spec.ts        # タブ管理画面テスト
├── helpers.ts          # テスト用ヘルパー関数
└── fixtures.ts         # テスト用フィクスチャ
```

### IndexedDB の操作
E2Eテストやデバッグスクリプトで直接 IndexedDB を操作（データの注入やクリアなど）する場合は、以下の点に注意してください。

- **定数の一元化**: DB名、バージョン、ストア名などの定数は、ハードコードせずに必ず `src/dbSchema.ts` からインポートして使用してください。
- **ブラウザ側への引き渡し**: `page.evaluate` 内で DB 操作を行う場合、外部モジュールを直接インポートできないため、実行コンテキスト（Node側）でインポートした定数を引数として渡す必要があります。

例:
```typescript
import { DB_NAME, DB_VERSION } from '../src/dbSchema';

await page.evaluate(async ({ dbName, dbVersion }) => {
  const request = indexedDB.open(dbName, dbVersion);
  // ...
}, { dbName: DB_NAME, dbVersion: DB_VERSION });
```

  ```bash
  npx playwright test e2e/extension.spec.ts:10
  ```

### ブラウザの再利用と自動初期化
E2Eテストの効率化と安定化のため、以下の仕組みを導入しています。

- **ブラウザの再利用**: Workerスコープのコンテキスト（`workerContext`）を使用し、Workerプロセスごとにブラウザを一度だけ起動してテスト間で再利用します。
- **自動初期化**: `initializeTest` フィクスチャにより、各テストの開始前に `chrome.storage.local` と IndexedDB (`TabBurrowDB`) の全ストアを自動的にクリアします。
- **タブの自動クリーンアップ**: 各テスト終了時、そのテストで開かれたタブを自動的に閉じます（ブラウザの終了を避けるため、1枚の `about:blank` ページのみを維持します）。

これらにより、テスト間の干渉を防ぎつつ、高速なテスト実行が可能です。

## i18n（国際化）テスト

### 翻訳キー整合性チェック
```bash
npm run i18n:check
```
日本語(ja.json)を基準として、他言語ファイルに欠落キーがないかチェックします。

### 翻訳キー表示テスト (`e2e/i18n.spec.ts`)
各ページ（tabs.html, options.html, credits.html）で翻訳キー（例: `tabManager.title`）がそのまま表示されていないことを確認するE2Eテストです。

**テスト戦略:**
- **E2Eテスト**: 日本語（基準言語）で画面上に翻訳キーが表示されていないことを確認
- **多言語対応**: `npm run i18n:check` で言語間のキー整合性を担保

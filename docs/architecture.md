# アーキテクチャ概要

## 全体構成
CompactTabは、Chrome Extension Manifest V3に基づいたタブ管理拡張機能です。
主に以下の要素で構成されています。

1.  **Background Service Worker**: 常駐スクリプト。自動クローズの監視、コンテキストメニューの処理、タブ保存の実データ処理を担当。
2.  **Tab Manager UI (React)**: 保存されたタブの一覧・管理・検索を行うフロントエンド。仮想スクロールを採用。
3.  **Storage Layer**:
    *   **IndexedDB**: タブ情報とスクリーンショット（Blob）の保存。大量のデータを扱うため使用。
    *   **Chrome Storage (Local)**: ユーザー設定（自動クローズ設定、ソート順など）の保存。

## ディレクトリ構成 (`src/`)

*   **`background/`**: バックグラウンドスクリプト群。
    *   `index.ts`: エントリーポイント。
    *   `autoClose.ts`: 自動クローズロジック。
    *   `tabSaver.ts`: タブ保存・スクリーンショット取得。
*   **`tabs/`**: タブ管理画面（Reactアプリケーション）。
    *   `App.tsx`: メインコンポーネント。状態管理。
    *   `TabList.tsx`: 仮想スクロールリスト。
*   **ルートファイル**:
    *   `storage.ts`: IndexedDBラッパー。
    *   `settings.ts`: Chrome Storageラッパー。
    *   `manifest.json`: 拡張機能定義。

## データフロー

1.  **自動クローズ**:
    *   `autoClose.ts` が `chrome.alarms` で定期実行。
    *   非アクティブなタブを検出し、ルール（`settings.ts`）に照合。
    *   条件に一致した場合、`tabSaver.ts` を通じてスクリーンショットを取得し、 `storage.ts` でIndexedDBに保存してタブを閉じる。
2.  **手動保存**:
    *   ツールバーアイコンクリック (`background/index.ts`) またはコンテキストメニュー。
    *   現在のアクティブタブ（または全タブ）を対象に保存処理を実行。
3.  **復元**:
    *   Tab Manager (`tabs/App.tsx`) から復元指示。
    *   設定 (`restoreMode`) に応じて、「遅延読み込み（Lazy Load）」や「即時破棄（Immediate Discard）」を行い、メモリ消費を抑えつつタブを開く。

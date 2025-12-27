# アーキテクチャ概要

## 全体構成
TabBurrowは、Browser Extension Manifest V3に基づいたタブ管理拡張機能です（Chrome/Firefox/Vivaldi対応）。
主に以下の要素で構成されています。

1.  **Background Service Worker**: 常駐スクリプト。自動収納の監視、コンテキストメニューの処理、タブ保存、リンクチェック、自動バックアップを担当。
2.  **Tab Manager UI (React)**: 保存されたタブの一覧・管理・検索を行うフロントエンド。仮想スクロールを採用。
3.  **Options UI (React)**: 設定画面。自動収納、リンクチェック、アイコンクリック動作、バックアップなどの設定を管理。
4.  **Storage Layer**:
    *   **IndexedDB**: タブ情報、スクリーンショット（Blob）、バックアップの保存。大量のデータを扱うため使用。
    *   **Browser Storage (Local)**: ユーザー設定（自動収納設定、ソート順、リンクチェック設定など）の保存。

## ディレクトリ構成 (`src/`)

*   **`background/`**: バックグラウンドスクリプト群。
    *   `index.ts`: エントリーポイント。メッセージハンドリング、アクションクリック処理。
    *   `autoClose.ts`: 自動収納ロジック。
    *   `tabSaver.ts`: タブ保存処理。
    *   `screenshot.ts`: スクリーンショット取得・リサイズ。
    *   `contextMenu.ts`: コンテキストメニューの作成・ハンドリング。
    *   `tabEvents.ts`: タブイベント監視（アクティベート、更新時のスクショキャッシュ）。
    *   `linkChecker.ts`: リンク切れチェック機能。
    *   `backup.ts`: 自動バックアップ機能。
*   **`tabs/`**: タブ管理画面（Reactアプリケーション）。
    *   `App.tsx`: メインコンポーネント。状態管理。
    *   `TabList.tsx`: 仮想スクロールリスト（GroupedVirtuoso使用）。
    *   `TabCard.tsx`: 個々のタブカード表示。
    *   `GroupHeader.tsx`: グループヘッダー（一括操作ボタン含む）。
    *   `Header.tsx`: 検索バー、統計情報、検索オプション。
    *   `LinkCheckDialog.tsx`: リンクチェックダイアログ。
    *   `DateRangeFilter.tsx`: 日付範囲フィルタ。
*   **`options/`**: 設定画面（Reactアプリケーション）。
    *   `App.tsx`: 設定画面メイン。
    *   `components/`: 各種設定コンポーネント。
        *   `CustomGroupSettings.tsx`: カスタムグループの管理（一覧・作成・編集・削除）。
        *   `SettingsSection.tsx`: 設定セクションの共通レイアウト。
*   **`common/`**: 共通コンポーネントとフック。
    *   `ConfirmDialog.tsx`: 確認ダイアログ。
    *   `AlertDialog.tsx`: 通知ダイアログ。
    *   `PromptDialog.tsx`: 入力ダイアログ。
    *   `hooks/useDialog.ts`: ダイアログ共通ロジック（ESCキー、オーバーレイクリック）。
    *   `hooks/useClickOutside.ts`: 外部クリック検出フック。
*   **`utils/`**: 共通ユーティリティ関数。
    *   `url.ts`: URL関連ユーティリティ（extractDomainなど）。
*   **ルートファイル**:
    *   `storage.ts`: IndexedDBラッパー。
    *   `dbSchema.ts`: IndexedDBスキーマ定義。
    *   `settings.ts`: Browser Storageラッパー。
    *   `browserApi.ts`: webextension-polyfillのラッパー。
    *   `i18n.ts`: 国際化対応。
    *   `theme.ts`: テーマ管理。
    *   `manifest.json` / `manifest.firefox.json`: 拡張機能定義。

## データフロー

1.  **自動収納**:
    *   `autoClose.ts` が `chrome.alarms` で定期実行。
    *   非アクティブなタブを検出し、ルール（`settings.ts`）に照合。
    *   条件に一致した場合、`tabSaver.ts` を通じてスクリーンショットを取得し、 `storage.ts` でIndexedDBに保存してタブを収納。
2.  **手動保存**:
    *   ツールバーアイコンクリック (`background/index.ts`) またはコンテキストメニュー。
    *   現在のアクティブタブ（または全タブ）を対象に保存処理を実行。
3.  **復元**:
    *   Tab Manager (`tabs/App.tsx`) から復元指示。
    *   設定 (`restoreMode`) に応じて、「遅延読み込み（Lazy Load）」や「即時破棄（Immediate Discard）」を行い、メモリ消費を抑えつつタブを開く。

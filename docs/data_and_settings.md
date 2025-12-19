# データモデルと設定

## IndexedDB (`storage.ts`, `dbSchema.ts`)

`TabBurrowDB` (Version 3) を使用。

### `tabs` ストア
保存されたタブのメインデータ。
*   **id**: UUID (PK)
*   **url**: タブのURL
*   **title**: ページタイトル
*   **domain**: ドメイン名（後方互換性のため保持）
*   **group**: グループ名（ドメインまたはカスタムグループ名）
*   **groupType**: `'domain' | 'custom'`
*   **favIconUrl**: ファビコンURL
*   **screenshot**: スクリーンショット画像 (Blob/JPEG, 512x512)
*   **lastAccessed**: 最終アクセス日時（タブから取得）
*   **savedAt**: 保存日時 (timestamp)

### `customGroups` ストア
ユーザー定義のカスタムグループ情報。
*   **name**: グループ名 (PK)
*   **createdAt**: 作成日時
*   **updatedAt**: 更新日時

### `backups` ストア (Version 3で追加)
自動バックアップデータ。
*   **id**: "backup-{timestamp}" (PK)
*   **createdAt**: バックアップ作成日時
*   **version**: スキーマバージョン（復元時の互換性用）
*   **tabCount**: タブ数（一覧表示用）
*   **customGroups**: カスタムグループ配列
*   **tabs**: タブデータ配列（Blob含む）

## Browser Storage (`settings.ts`)

`browser.storage.local` を使用して設定を JSON オブジェクトとして保存。

### 主要な設定項目 (`Settings`インターフェース)

#### 基本設定
*   **locale**: 言語設定 (`'ja' | 'en' | 'auto'`)
*   **theme**: テーマ設定 (`'system' | 'dark' | 'light'`)

#### 自動クローズ設定
*   **autoCloseEnabled**: 自動クローズのON/OFF
*   **autoCloseSeconds**: 自動クローズまでの待機時間（秒）
*   **autoCloseRules**: ルール配列
    *   `targetType`: `'domain' | 'url' | 'fullUrl' | 'title'`
    *   `pattern`: 正規表現パターン
    *   `action`: `'exclude' | 'saveToGroup' | 'saveOnly' | 'close' | 'pin'`
*   **autoCloseRuleOrder**: ルール評価順序 (`'asc' | 'desc'`)

#### 表示設定
*   **groupSort**: グループソート順
*   **itemSort**: アイテムソート順
*   **defaultViewMode**: デフォルトグループ化モード (`'grouped' | 'flat'`)
*   **defaultDisplayDensity**: デフォルト表示密度 (`'normal' | 'compact'`)

#### タブ復元設定
*   **restoreMode**: 復元時の挙動
    *   `normal`: 通常通り開く
    *   `lazy`: 読み込み完了後に discard (メモリ解放)
    *   `immediate`: 開いた直後に discard
*   **restoreIntervalMs**: タブ復元時のインターバル（ミリ秒）

#### アイコンクリック設定
*   **iconClickApplyRules**: 自動クローズルールを適用するか
*   **iconClickPinnedAction**: 固定タブの扱い (`'skip' | 'suspend'`)

#### リンクチェック設定
*   **linkCheckRules**: リンクチェックルール配列
*   **linkCheckTimeoutMs**: タイムアウト（ミリ秒）
*   **linkCheckConcurrency**: グローバル同時リクエスト数
*   **linkCheckDomainConcurrency**: ドメイン別同時リクエスト数
*   **linkCheckDomainDelayMs**: 同一ドメイン間ディレイ

#### バックアップ設定
*   **autoBackupEnabled**: 自動バックアップ有効/無効
*   **autoBackupIntervalPreset**: プリセット選択 (`'off' | '1h' | '6h' | '12h' | '24h' | 'custom'`)
*   **autoBackupIntervalMinutes**: カスタム間隔（分）
*   **autoBackupKeepCount**: 保持する世代数

## 設定の同期
*   UI (`options/` や `tabs/App.tsx`) で設定を変更すると `saveSettings()` で保存し、`notifySettingsChanged()` でメッセージを送信。
*   Background (`background/index.ts`) はメッセージを受け取り、キャッシュされた設定を更新して即座に反映させる。

# データモデルと設定

## IndexedDB (`storage.ts`)

`TabBurrowDB` (Version 1) を使用。

### `tabs` ストア
保存されたタブのメインデータ。
*   **id**: UUID (PK)
*   **url**: タブのURL
*   **title**: ページタイトル
*   **domain**: ドメイン名
*   **group**: グループ名（初期値はドメイン、カスタムグループ名も可）
*   **groupType**: `'domain' | 'custom'`
*   **screenshot**: スクリーンショット画像 (Blob/JPEG)
*   **savedAt**: 保存日時 (timestamp)

### `customGroups` ストア
ユーザー定義のカスタムグループ情報。
*   **name**: グループ名 (PK)
*   **createdAt**: 作成日時
*   **updatedAt**: 更新日時

## Chrome Storage (`settings.ts`)

`chrome.storage.local` を使用して設定を JSON オブジェクトとして保存。

### 主要な設定項目 (`Settings`インターフェース)
*   **autoCloseEnabled**: 自動クローズのON/OFF
*   **autoCloseSeconds**: 自動クローズまでの待機時間（秒）
*   **autoCloseRules**: ルール配列
    *   `targetType`: `'domain' | 'url' | 'title'` など
    *   `pattern`: 正規表現パターン
    *   `action`: `'exclude' | 'saveToGroup' | 'close'` など
*   **restoreMode**: 復元時の挙動
    *   `normal`: 通常通り開く
    *   `lazy`: 読み込み完了後に discard (メモリ解放)
    *   `immediate`: 開いた直後に discard (高速だがアイコンが出ない場合あり)

## 設定の同期
*   UI (`options.ts` や `tabs/App.tsx`) で設定を変更すると `saveSettings()` で保存し、`notifySettingsChanged()` でメッセージを送信。
*   Background (`background/index.ts`) はメッセージを受け取り、キャッシュされた設定 (`autoClose.ts`) を更新して即座に反映させる。

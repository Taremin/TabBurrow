# 内部メッセージAPI

## 概要
Background Service WorkerとUI（tabs/options）間の通信は`browser.runtime.sendMessage`/`onMessage`を使用します。

## メッセージ一覧

### 設定関連

#### `settings-changed`
設定が変更されたことをBackgroundに通知。
```typescript
// 送信（UI → Background）
browser.runtime.sendMessage({ type: 'settings-changed' });

// 応答
{ success: true }
```

### リンクチェック関連

#### `link-check-start`
リンクチェックを開始。
```typescript
// 送信
{
  type: 'link-check-start',
  checkId: 'check-1234567890',    // オプション
  tabIds: ['id1', 'id2'],         // オプション（指定タブのみ）
  excludeTabIds: ['id3']          // オプション（除外タブ）
}

// 応答
{ success: true, started: true }
```

#### `link-check-progress`
チェック進捗の通知（Background → UI）。
```typescript
{
  type: 'link-check-progress',
  checkId: 'check-1234567890',
  checked: 50,
  total: 100,
  currentUrl: 'https://example.com'
}
```

#### `link-check-complete`
チェック完了の通知（Background → UI）。
```typescript
{
  type: 'link-check-complete',
  checkId: 'check-1234567890',
  results: [
    { tabId: 'id1', url: '...', status: 'alive', statusCode: 200 },
    { tabId: 'id2', url: '...', status: 'dead', statusCode: 404 }
  ]
}
```

#### `link-check-cancel`
リンクチェックをキャンセル。
```typescript
{ type: 'link-check-cancel' }
// 応答: { success: true, cancelled: true }
```

#### `link-check-status`
現在のチェック状態を取得。
```typescript
{ type: 'link-check-status' }
// 応答: { success: true, running: true/false }
```

### タブデータ関連

#### `tabs-changed`
タブデータが変更されたことをUIに通知（Background → UI）。
```typescript
{ type: 'tabs-changed' }
```

### バックアップ関連

#### `backup-list`
バックアップ一覧を取得。
```typescript
{ type: 'backup-list' }
// 応答: { success: true, backups: [...] }
```

#### `backup-restore`
バックアップから復元。
```typescript
{
  type: 'backup-restore',
  backupId: 'backup-1234567890',
  mode: 'merge' | 'overwrite'
}
// 応答: { success: true }
```

#### `backup-delete`
バックアップを削除。
```typescript
{ type: 'backup-delete', backupId: 'backup-1234567890' }
// 応答: { success: true }
```

#### `backup-export`
バックアップをJSON形式でエクスポート。
```typescript
{ type: 'backup-export', backupId: 'backup-1234567890' }
// 応答: { success: true, jsonData: '...', createdAt: 1234567890 }
```

#### `backup-trigger`
手動でバックアップを実行。
```typescript
{ type: 'backup-trigger' }
// 応答: { success: true }
```

## 使用例

### UIからBackgroundへ送信
```typescript
const response = await browser.runtime.sendMessage({
  type: 'link-check-start',
  checkId: `check-${Date.now()}`
});
```

### Backgroundでメッセージを受信
```typescript
browser.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'settings-changed':
      // 設定再読み込み
      return Promise.resolve({ success: true });
  }
});
```

### UIでBackgroundからの通知を受信
```typescript
useEffect(() => {
  const listener = (message: { type: string }) => {
    if (message.type === 'tabs-changed') {
      loadTabs();
    }
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}, []);
```

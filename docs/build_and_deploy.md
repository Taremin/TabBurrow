# ビルド・デプロイガイド

## ビルドコマンド

### 開発用
```bash
# Chrome向けビルド（ウォッチモード）
npm run watch

# Firefox向けビルド（ウォッチモード）
npm run watch:firefox
```

### 本番用
```bash
# 両ブラウザ向けビルド（Chrome + Firefox Desktop）
npm run build

# Chrome専用ビルド
npm run build:chrome

# Firefox専用ビルド
npm run build:firefox

# Firefox Android専用ビルド
npm run build:firefox-android

# 出力先をクリア
npm run clean
```

## 出力ディレクトリ
```
dist/
├── chrome/              # Chrome用ビルド
│   ├── manifest.json
│   ├── background.js
│   ├── tabs.html
│   ├── tabs.js
│   ├── options.html
│   ├── options.js
│   └── locales/
├── firefox/             # Firefox Desktop用ビルド
│   ├── manifest.json    # Firefox固有の設定
│   └── ...
└── firefox-android/     # Firefox Android用ビルド
    ├── manifest.json    # tabGroups権限なし、名前=TabBurrow Lite
    └── ...
```

## マニフェストの違い

| 項目 | Chrome | Firefox Desktop | Firefox Android |
|------|--------|-----------------|-----------------|
| ソースファイル | `manifest.chrome.json` | `manifest.firefox.json` | `manifest.firefox-android.json` |
| 拡張機能名 | TabBurrow | TabBurrow | TabBurrow Lite |
| background | `service_worker` | `scripts` | `scripts` |
| browser_specific_settings | なし | `gecko.id` | `gecko_android.id` |
| tabGroups権限 | あり | あり | **なし**（非対応） |
| 下限バージョン | - | 142.0 | 128.0 |

## 型チェック
```bash
npm run typecheck
```

## GitHub Actionsリリースワークフロー

### トリガー
- **自動**: `v*.*.*` 形式のタグをプッシュ
- **手動**: Actions画面から `workflow_dispatch` を実行

### フロー
1. 依存関係インストール (`npm ci`)
2. ビルド実行 (`npm run build`)
3. Chrome/Firefox用ZIPを作成
4. 前バージョンからのコミット履歴を生成
5. ドラフトリリースを作成

### リリース手順
1. `package.json`のバージョンを更新
2. タグを作成してプッシュ
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. GitHub Actionsが自動でドラフトリリースを作成
4. リリースノートを確認・編集して公開

### プレリリース
`-` を含むタグ（例: `v1.0.1-RC1`）は自動的にプレリリースとしてマーク

## ローカルテスト

### Chrome
1. `npm run build:chrome`
2. `chrome://extensions` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」
5. `dist/chrome` フォルダを選択

### Firefox
1. `npm run build:firefox`
2. `about:debugging` を開く
3. 「この Firefox」→「一時的なアドオンを読み込む」
4. `dist/firefox/manifest.json` を選択

## ストア公開ワークフロー

手動実行でChrome ウェブストア / Firefox Add-onsに公開できます。

### Chrome Web Store
**ワークフロー**: `.github/workflows/publish-chrome.yml`

**必要なSecrets**:
| Secret名 | 説明 |
|----------|------|
| `CHROME_EXTENSION_ID` | 拡張機能ID（32文字の英字） |
| `CHROME_CLIENT_ID` | Google Cloud OAuth 2.0 クライアントID |
| `CHROME_CLIENT_SECRET` | Google Cloud OAuth 2.0 クライアントシークレット |
| `CHROME_REFRESH_TOKEN` | OAuth 2.0 Playgroundで取得したリフレッシュトークン |

### Firefox Add-ons
**ワークフロー**: `.github/workflows/publish-firefox.yml`

**必要なSecrets**:
| Secret名 | 説明 |
|----------|------|
| `FIREFOX_API_KEY` | AMO Developer Hub → API Credentials → JWT issuer |
| `FIREFOX_API_SECRET` | AMO Developer Hub → API Credentials → JWT secret |

### 公開手順
1. GitHub Actionsの該当ワークフローを開く
2. 「Run workflow」をクリック
3. バージョン（例: `v1.0.0`）を入力して実行


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
# 両ブラウザ向けビルド
npm run build

# Chrome専用ビルド
npm run build:chrome

# Firefox専用ビルド
npm run build:firefox

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
└── firefox/             # Firefox用ビルド
    ├── manifest.json    # Firefox固有の設定
    └── ...
```

## マニフェストの違い

| 項目 | Chrome | Firefox |
|------|--------|---------|
| ソースファイル | `manifest.json` | `manifest.firefox.json` |
| background | `service_worker` | `scripts` |
| browser_specific_settings | なし | `gecko.id`を指定 |

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

# プロジェクト知識ベース (`docs/`)

このディレクトリには、プロジェクトの開発において共有すべき知識、仕様、技術的な詳細を格納します。
Antigravity（AI）はタスク実行時にこのディレクトリ内のドキュメントを参照します。

## 推奨されるドキュメント構成

- **[`architecture.md`](./architecture.md)**: システム全体のアーキテクチャ、ディレクトリ構成の意図など。
- **[`data_and_settings.md`](./data_and_settings.md)**: IndexedDBのデータモデル、Browser Storageの設定項目、データフロー。
- **[`background_features.md`](./background_features.md)**: 自動クローズ、タブ保存、コンテキストメニュー、リンクチェック、バックアップの詳細ロジック。
- **[`ui_guide.md`](./ui_guide.md)**: Reactコンポーネント構成、仮想スクロールの実装解説。
- **[`testing_guide.md`](./testing_guide.md)**: Vitest/Playwrightテストの実行方法とモックの使い方。
- **[`i18n_guide.md`](./i18n_guide.md)**: 国際化ファイルの構成と翻訳キーの追加方法。
- **[`build_and_deploy.md`](./build_and_deploy.md)**: ビルドコマンドとGitHub Actionsリリースワークフロー。
- **[`api_messages.md`](./api_messages.md)**: Background ↔ UI間の内部メッセージAPI定義。

## 更新ルール

- AIは開発中に得られた有用な知見をこれらのファイルに追記・整理します。
- ユーザーも自由にこれらのファイルを編集し、AIに守らせたい仕様や知識を追加できます。

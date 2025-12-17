# プロジェクト知識ベース (`docs/`)

このディレクトリには、プロジェクトの開発において共有すべき知識、仕様、技術的な詳細を格納します。
Antigravity（AI）はタスク実行時にこのディレクトリ内のドキュメントを参照します。

## 推奨されるドキュメント構成

- **[`architecture.md`](./architecture.md)**: システム全体のアーキテクチャ、ディレクトリ構成の意図など。
- **[`data_and_settings.md`](./data_and_settings.md)**: IndexedDBのデータモデル、Chrome Storageの設定項目、データフロー。
- **[`background_features.md`](./background_features.md)**: 自動クローズ、タブ保存、コンテキストメニューの詳細ロジック。
- **[`ui_guide.md`](./ui_guide.md)**: Reactコンポーネント構成、仮想スクロールの実装解説。
- **`manifest_spec.md`**: (Optional) Manifest V3固有の設定や権限についてのメモ。

## 更新ルール

- AIは開発中に得られた有用な知見をこれらのファイルに追記・整理します。
- ユーザーも自由にこれらのファイルを編集し、AIに守らせたい仕様や知識を追加できます。

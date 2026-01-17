# Android版Firefoxにおける拡張機能の制限と挙動

Android版Firefox（Fenix）において、デスクトップ版と異なる挙動や、開発時に注意が必要な制限事項についての調査結果です。

## 1. タブ取得（tabs.query）の制限

### `currentWindow: true` の挙動
Android版Firefoxでは、`browser.tabs.query({ currentWindow: true })` を実行すると、**現在アクティブなタブのみ**が返される場合があります。
これは、Android版の内部実装において、各タブが独自の「ウィンドウ」のようなコンテキストを持っている、あるいは「現在のウィンドウ」のスコープがアクティビティ（表示中の画面）に限定されているためと考えられます。

- **対策**: 全てのタブを対象にする必要がある場合は、`currentWindow` フィルタを外してクエリを発行し、必要に応じて `incognito`（プライベートブラウジング）などの属性で手動フィルタリングを行う必要があります。

### 未表示・アンロードされたタブの欠落
Android OSのメモリ管理により、バックグラウンドにあるタブは頻繁に「アンロード（discarded）」状態になります。現在、**`browser.tabs.query` がこれらの未ロード状態のタブを結果に含めない**という重大なバグが報告されています。

- **報告されているバグ**: [[Bug]: tabs.query doesn't return unloaded tabs · Issue #22197 · mozilla-mobile/fenix](https://github.com/mozilla-mobile/fenix/issues/22197)
- **影響**: 「すべてのタブを閉じる/収納する」といった機能が、最近開いたタブ（メモリ上にあるタブ）に対してしか機能しません。

## 2. ウィンドウモデルの相違

Firefox for Androidは「シングルウィンドウ」モデルですが、WebExtension APIレベルではデスクトップ版との互換性のために複数のウィンドウIDが存在するように振る舞うことがあります。

- **Window ID**: 各タブが異なる `windowId` を持っていると報告されるケースがあります。
- **タブインデックス**: 全てのタブの `index` が `0` として返される場合があり、順序に基づいた処理が困難な場合があります。
- **参考資料**: [Differences between desktop and Android extensions | Firefox Extension Workshop](https://extensionworkshop.com/documentation/develop/differences-between-desktop-and-android-extensions/)

## 3. 利用できないAPI

Android版では一部のAPIが未実装または制限されています。

- **タブグループ API**: `browser.tabs.group` および `browser.tabGroups` は非対応です。
- **スクリーンショット API**: `browser.tabs.captureVisibleTab` は非対応です。
- **セッションストレージ**: `browser.storage.session` は一部のバージョンや環境で制限がある場合があります。

## 参照リンク

- [MDN: tabs.query() browser compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/query#browser_compatibility)
- [Mozilla Extension Workshop: Differences between desktop and Android extensions](https://extensionworkshop.com/documentation/develop/differences-between-desktop-and-android-extensions/)
- [Fenix (Firefox for Android) Issue Tracker: #22197](https://github.com/mozilla-mobile/fenix/issues/22197)

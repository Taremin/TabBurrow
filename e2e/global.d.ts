/**
 * E2Eテスト用のグローバル型定義
 * page.evaluate()内でブラウザコンテキストのグローバル変数を使用するため
 */

// Firefox (webextension-polyfill) のグローバル変数
// browser APIはchrome APIと互換性がある
declare const browser: typeof chrome | undefined;

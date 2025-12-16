/**
 * browserApi.ts - ブラウザAPI統一層
 * webextension-polyfillを使用してChrome/Firefox両方で動作するAPIを提供
 */
import browser from 'webextension-polyfill';

export { browser };
export default browser;

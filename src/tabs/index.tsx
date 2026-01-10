/**
 * TabBurrow - タブ管理画面エントリポイント
 */

import { createRoot } from 'react-dom/client';
import browser from '../browserApi';
import { App } from './App';
import { I18nProvider } from '../common/i18nContext';
import { getSettings } from '../settings';
import { applyTheme } from '../theme';

// DOMContentLoaded時に初期化
async function init() {
  // テーマを適用
  const settings = await getSettings();
  await applyTheme(settings.theme);

  // 設定変更メッセージを監視してテーマを再適用
  browser.runtime.onMessage.addListener(async (message: unknown) => {
    const msg = message as { type?: string };
    if (msg.type === 'settings-changed') {
      const newSettings = await getSettings();
      await applyTheme(newSettings.theme);
    }
  });

  const container = document.getElementById('root');
  if (!container) {
    console.error('Root element not found');
    return;
  }
  
  const root = createRoot(container);
  root.render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

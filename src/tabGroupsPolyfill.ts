/**
 * tabGroupsPolyfill.ts - Vivaldi用タブグループAPIポリフィル
 * 
 * Chrome/Firefoxの標準tabs.group/tabGroups APIをVivaldiのvivExtDataで模倣する
 * このファイルをインポートするだけで、browser.tabs.groupとbrowser.tabGroupsが
 * Vivaldiでも動作するようになる
 * 
 * 実験的実装: Vivaldiの内部APIは非公式のため将来的に動作しなくなる可能性あり
 */
import browser, { type Browser } from 'webextension-polyfill';

const browserAny = browser as Browser;

// Vivaldiかどうかのキャッシュ（非同期で検出）
let isVivaldi: boolean | null = null;

/**
 * Vivaldiかどうかを非同期で検出
 * windows.getCurrent()のvivExtDataプロパティの存在で判定
 */
async function detectVivaldi(): Promise<boolean> {
  if (isVivaldi !== null) {
    return isVivaldi;
  }
  
  try {
    // 現在のウィンドウを取得してvivExtDataがあるか確認
    const currentWindow = await browser.windows.getCurrent();
    isVivaldi = 'vivExtData' in currentWindow;
  } catch {
    isVivaldi = false;
  }
  
  return isVivaldi;
}

/**
 * Vivaldi用のtabs.group polyfill
 * タブをvivExtData.groupでグループ化してタブスタックを作成
 */
async function vivaldiTabsGroup(options: { tabIds: number[] }): Promise<number> {
  const { tabIds } = options;
  if (tabIds.length === 0) {
    throw new Error('少なくとも1つのタブIDが必要です');
  }
  
  // 最初のタブのIDをグループIDとして使用
  const groupId = tabIds[0];
  const groupIdStr = String(groupId);
  
  for (const tabId of tabIds) {
    const tab = await browser.tabs.get(tabId);
    const vivExtData = JSON.parse(tab.vivExtData || '{}');
    vivExtData.group = groupIdStr;
    await browser.tabs.update(tabId, { vivExtData: JSON.stringify(vivExtData) });
  }
  
  return groupId;
}

/**
 * Vivaldi用のtabGroups.update polyfill
 * Vivaldiのタブスタックにはタイトル/色の設定がないため、何もしない
 */
async function vivaldiTabGroupsUpdate(
  _groupId: number, 
  _updateProperties: { title?: string; collapsed?: boolean; color?: string }
): Promise<import('webextension-polyfill').TabGroups.TabGroup> {
  // Vivaldiのタブスタックには名前/色の設定機能がない
  return {
    id: _groupId,
    collapsed: _updateProperties.collapsed || false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    color: (_updateProperties.color as any) || 'grey',
    title: _updateProperties.title,
    windowId: 0
  };
}

/**
 * 標準APIをラップしてVivaldi対応にする
 */
async function wrappedTabsGroup(options: { tabIds: number[] }): Promise<number> {
  const vivaldi = await detectVivaldi();
  if (vivaldi) {
    return vivaldiTabsGroup(options);
  } else {
    if (!browserAny._originalTabsGroup) {
      throw new Error('Original tabs.group is not available');
    }
    return browserAny._originalTabsGroup(options);
  }
}

async function wrappedTabGroupsUpdate(
  groupId: number, 
  updateProperties: { title?: string; collapsed?: boolean; color?: string }
): Promise<import('webextension-polyfill').TabGroups.TabGroup> {
  const vivaldi = await detectVivaldi();
  if (vivaldi) {
    return vivaldiTabGroupsUpdate(groupId, updateProperties);
  } else {
    if (!browserAny._originalTabGroupsUpdate) {
      throw new Error('Original tabGroups.update is not available');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return browserAny._originalTabGroupsUpdate(groupId, updateProperties as any);
  }
}

/**
 * polyfillを適用する
 */
export function applyTabGroupsPolyfill(): void {
  // 元のAPIを保存してラップ
  if (browserAny.tabs.group && !browserAny._originalTabsGroup) {
    browserAny._originalTabsGroup = browserAny.tabs.group;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserAny.tabs.group = wrappedTabsGroup as any;
  } else if (!browserAny.tabs.group) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserAny.tabs.group = vivaldiTabsGroup as any;
  }
  
  if (browserAny.tabGroups?.update && !browserAny._originalTabGroupsUpdate) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserAny._originalTabGroupsUpdate = (browserAny.tabGroups as any).update;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (browserAny.tabGroups as any).update = (wrappedTabGroupsUpdate as any);
  } else if (!(browserAny as any).tabGroups) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (browserAny as any).tabGroups = {
      update: vivaldiTabGroupsUpdate,
    };
  }
}

// インポート時に自動的にpolyfillを適用
applyTabGroupsPolyfill();

// エクスポート（デバッグ/テスト用）
export { detectVivaldi };

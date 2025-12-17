/**
 * tabGroupsPolyfill.ts - Vivaldi用タブグループAPIポリフィル
 * 
 * Chrome/Firefoxの標準tabs.group/tabGroups APIをVivaldiのvivExtDataで模倣する
 * このファイルをインポートするだけで、browser.tabs.groupとbrowser.tabGroupsが
 * Vivaldiでも動作するようになる
 * 
 * 実験的実装: Vivaldiの内部APIは非公式のため将来的に動作しなくなる可能性あり
 */
import browser from 'webextension-polyfill';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserAny = browser as any;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isVivaldi = 'vivExtData' in (currentWindow as any);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vivExtData = JSON.parse((tab as any).vivExtData || '{}');
    vivExtData.group = groupIdStr;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await browser.tabs.update(tabId, { vivExtData: JSON.stringify(vivExtData) } as any);
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
): Promise<void> {
  // Vivaldiのタブスタックには名前/色の設定機能がない
}

/**
 * 標準APIをラップしてVivaldi対応にする
 */
async function wrappedTabsGroup(options: { tabIds: number[] }): Promise<number> {
  const vivaldi = await detectVivaldi();
  if (vivaldi) {
    return vivaldiTabsGroup(options);
  } else {
    return browserAny._originalTabsGroup(options);
  }
}

async function wrappedTabGroupsUpdate(
  groupId: number, 
  updateProperties: { title?: string; collapsed?: boolean; color?: string }
): Promise<void> {
  const vivaldi = await detectVivaldi();
  if (vivaldi) {
    return vivaldiTabGroupsUpdate(groupId, updateProperties);
  } else {
    return browserAny._originalTabGroupsUpdate(groupId, updateProperties);
  }
}

/**
 * polyfillを適用する
 */
export function applyTabGroupsPolyfill(): void {
  // 元のAPIを保存してラップ
  if (browserAny.tabs.group && !browserAny._originalTabsGroup) {
    browserAny._originalTabsGroup = browserAny.tabs.group;
    browserAny.tabs.group = wrappedTabsGroup;
  } else if (!browserAny.tabs.group) {
    browserAny.tabs.group = vivaldiTabsGroup;
  }
  
  if (browserAny.tabGroups?.update && !browserAny._originalTabGroupsUpdate) {
    browserAny._originalTabGroupsUpdate = browserAny.tabGroups.update;
    browserAny.tabGroups.update = wrappedTabGroupsUpdate;
  } else if (!browserAny.tabGroups) {
    browserAny.tabGroups = {
      update: vivaldiTabGroupsUpdate,
    };
  }
}

// インポート時に自動的にpolyfillを適用
applyTabGroupsPolyfill();

// エクスポート（デバッグ/テスト用）
export { detectVivaldi };

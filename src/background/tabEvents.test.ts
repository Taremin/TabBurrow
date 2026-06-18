import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from '../browserApi';
import { handleTabActivated, initializeActiveTabId, resetActiveTabIdForTest } from './tabEvents';
import { tabLastActiveTime } from './autoClose';

// browser APIのモック
vi.mock('../browserApi.js', () => ({
  default: {
    tabs: {
      get: vi.fn(),
      query: vi.fn(),
    },
    contextMenus: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// settingsのモック
vi.mock('../settings.js', () => ({
  getSettings: vi.fn().mockResolvedValue({
    screenshotEnabled: false,
  }),
}));

describe('tabEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabLastActiveTime.clear();
    resetActiveTabIdForTest(); // 起動直後（サスペンド状態）をシミュレート
  });

  it('サスペンド直後（初期値null）にタブを切り替えた場合、以前のアクティブタブの時刻は更新されないこと', async () => {
    const prevTabId = 10;
    const nextTabId = 20;

    // 前のタブの仮時刻をセット (初期状態)
    tabLastActiveTime.set(prevTabId, 1000); 

    // 新しいタブ情報を返すモック
    vi.mocked(browser.tabs.get).mockResolvedValue({ id: nextTabId, active: true, windowId: 1, status: 'complete', url: 'https://example.com' } as any);

    // タブがアクティブになったイベントを発火 (ID: 20 がアクティブになった)
    // ※ currentActiveTabId が null のため、前のタブ(10)は更新されない
    // @ts-ignore
    await handleTabActivated({ tabId: nextTabId, windowId: 1 });

    // 以前アクティブだったタブ(10)の時刻が更新されていない（1000のまま）ことを検証
    expect(tabLastActiveTime.get(prevTabId)).toBe(1000);
  });

  it('初期化が行われていれば、タブ切り替え時に以前アクティブだったタブの時刻が更新されること', async () => {
    const prevTabId = 10;
    const nextTabId = 20;

    // 前のアクティブタブの仮時刻をセット (初期状態)
    tabLastActiveTime.set(prevTabId, 1000); 

    // query APIが現在のアクティブタブ(10)を返すようにモック
    vi.mocked(browser.tabs.query).mockResolvedValue([{ id: prevTabId, active: true, windowId: 1 }] as any);
    vi.mocked(browser.tabs.get).mockResolvedValue({ id: nextTabId, active: true, windowId: 1, status: 'complete', url: 'https://example.com' } as any);

    // 起動時の初期化を実行
    await initializeActiveTabId(); 

    // タブがアクティブになったイベントを発火 (ID: 20 がアクティブになった)
    // @ts-ignore
    await handleTabActivated({ tabId: nextTabId, windowId: 1 });

    // 以前アクティブだったタブ(10)の時刻が現在時刻（1000より大きい）に更新されていることを検証
    expect(tabLastActiveTime.get(prevTabId)).toBeGreaterThan(1000);
  });
});

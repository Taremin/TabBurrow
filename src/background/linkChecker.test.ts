import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkLinks } from './linkChecker.js';
import * as storage from '../storage.js';
import * as settings from '../settings.js';

// モックの定義
vi.mock('../storage.js', () => ({
  getAllTabs: vi.fn(),
}));

vi.mock('../settings.js', () => ({
  getSettings: vi.fn(),
}));

describe('linkChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GETフォールバックが有効なとき、HEADが404でGETが200ならaliveと判定される', async () => {
    // 設定のモック
    vi.mocked(settings.getSettings).mockResolvedValue({
      linkCheckUseGetFallback: true,
      linkCheckTimeoutMs: 1000,
      linkCheckConcurrency: 1,
      linkCheckDomainConcurrency: 1,
      linkCheckDomainDelayMs: 0,
      linkCheckRules: [
        { id: '1', enabled: true, name: '404', condition: '404', action: 'dead' },
        { id: '2', enabled: true, name: '2xx', condition: '2xx', action: 'alive' },
      ],
    } as any);

    // タブのモック
    vi.mocked(storage.getAllTabs).mockResolvedValue([
      { id: 'tab1', url: 'https://example.com', title: 'Test' } as any,
    ]);

    // fetchのモック
    const mockFetch = vi.mocked(fetch);
    // 1回目 (HEAD): 404
    mockFetch.mockResolvedValueOnce({ status: 404 } as Response);
    // 2回目 (GET): 200
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    const result = await checkLinks({ checkId: '1', tabIds: [] }, () => {});

    expect(result.results[0].statusCode).toBe(200);
    expect(result.results[0].action).toBe('alive');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1]?.method).toBe('HEAD');
    expect(mockFetch.mock.calls[1][1]?.method).toBe('GET');
  });

  it('GETフォールバックが無効なとき、HEADが404ならそのままdeadと判定される', async () => {
    // 設定のモック
    vi.mocked(settings.getSettings).mockResolvedValue({
      linkCheckUseGetFallback: false, // 無効
      linkCheckTimeoutMs: 1000,
      linkCheckConcurrency: 1,
      linkCheckDomainConcurrency: 1,
      linkCheckDomainDelayMs: 0,
      linkCheckRules: [
        { id: '1', enabled: true, name: '404', condition: '404', action: 'dead' },
      ],
    } as any);

    vi.mocked(storage.getAllTabs).mockResolvedValue([
      { id: 'tab1', url: 'https://example.com', title: 'Test' } as any,
    ]);

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ status: 404 } as Response);

    const result = await checkLinks({ checkId: '1', tabIds: [] }, () => {});

    expect(result.results[0].statusCode).toBe(404);
    expect(result.results[0].action).toBe('dead');
    expect(mockFetch).toHaveBeenCalledTimes(1); // GETは呼ばれない
    expect(mockFetch.mock.calls[0][1]?.method).toBe('HEAD');
  });

  it('HEADが200ならGETフォールバックは実行されない', async () => {
    vi.mocked(settings.getSettings).mockResolvedValue({
      linkCheckUseGetFallback: true,
      linkCheckTimeoutMs: 1000,
      linkCheckConcurrency: 1,
      linkCheckDomainConcurrency: 1,
      linkCheckDomainDelayMs: 0,
      linkCheckRules: [
        { id: '1', enabled: true, name: '2xx', condition: '2xx', action: 'alive' },
      ],
    } as any);

    vi.mocked(storage.getAllTabs).mockResolvedValue([
      { id: 'tab1', url: 'https://example.com', title: 'Test' } as any,
    ]);

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    const result = await checkLinks({ checkId: '1', tabIds: [] }, () => {});

    expect(result.results[0].statusCode).toBe(200);
    expect(result.results[0].action).toBe('alive');
    expect(mockFetch).toHaveBeenCalledTimes(1); // HEADのみ
  });
});

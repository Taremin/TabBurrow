/**
 * exportImport.ts のユニットテスト
 * 純粋関数とユーティリティ関数をテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateTabsExportFilename,
  generateSettingsExportFilename,
  downloadAsFile,
  formatAsUrlList,
  formatAsMarkdown,
  formatTabsData,
  parseUrlList,
  parseMarkdown,
  detectTextFormat,
} from './exportImport';


describe('exportImport', () => {
  describe('generateTabsExportFilename', () => {
    it('日付入りのファイル名を生成する', () => {
      const filename = generateTabsExportFilename();
      expect(filename).toMatch(/^tabburrow-tabs-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('生成されたファイル名は今日の日付を含む', () => {
      const today = new Date().toISOString().slice(0, 10);
      const filename = generateTabsExportFilename();
      expect(filename).toBe(`tabburrow-tabs-${today}.json`);
    });
  });

  describe('generateSettingsExportFilename', () => {
    it('日付入りのファイル名を生成する', () => {
      const filename = generateSettingsExportFilename();
      expect(filename).toMatch(/^tabburrow-settings-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('生成されたファイル名は今日の日付を含む', () => {
      const today = new Date().toISOString().slice(0, 10);
      const filename = generateSettingsExportFilename();
      expect(filename).toBe(`tabburrow-settings-${today}.json`);
    });
  });

  describe('downloadAsFile', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    // 元のURLを保存
    const originalURL = globalThis.URL;

    beforeEach(() => {
      mockClick = vi.fn();
      mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      mockRevokeObjectURL = vi.fn();

      // DOM操作のモック
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        const element = {
          href: '',
          download: '',
          click: mockClick,
        } as unknown as HTMLElement;
        return element;
      });
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown as Node);

      // URL APIのモック（createObjectURL/revokeObjectURLのみ）
      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      });
    });

    afterEach(() => {
      // グローバルURLを元に戻す
      vi.stubGlobal('URL', originalURL);
      vi.restoreAllMocks();
    });

    it('JSONファイルをダウンロードする', () => {
      const data = { test: 'data' };
      downloadAsFile(data, 'test.json');

      expect(mockClick).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });


  // ======================
  // 複数フォーマット対応テスト
  // ======================

  describe('formatAsUrlList', () => {
    it('タブデータをURLリスト形式に変換する', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [
          { id: '1', url: 'https://example.com', title: 'Example', domain: 'example.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
          { id: '2', url: 'https://test.com/page', title: 'Test Page', domain: 'test.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
        ],
      };
      const result = formatAsUrlList(data);
      expect(result).toBe('https://example.com\nhttps://test.com/page');
    });

    it('空のタブリストの場合は空文字を返す', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [],
      };
      const result = formatAsUrlList(data);
      expect(result).toBe('');
    });
  });

  describe('formatAsMarkdown', () => {
    it('タブデータをMarkdown形式に変換する', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [
          { id: '1', url: 'https://example.com', title: 'Example', domain: 'example.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
          { id: '2', url: 'https://test.com/page', title: 'Test Page', domain: 'test.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
        ],
      };
      const result = formatAsMarkdown(data);
      expect(result).toBe('- [Example](https://example.com)\n- [Test Page](https://test.com/page)');
    });

    it('タイトルがない場合はURLを使用する', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [
          { id: '1', url: 'https://example.com', title: '', domain: 'example.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
        ],
      };
      const result = formatAsMarkdown(data);
      expect(result).toBe('- [https://example.com](https://example.com)');
    });
  });

  describe('formatTabsData', () => {
    it('JSON形式でフォーマットする', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [],
      };
      const result = formatTabsData(data, 'json');
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('URLリスト形式でフォーマットする', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [
          { id: '1', url: 'https://example.com', title: 'Example', domain: 'example.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
        ],
      };
      const result = formatTabsData(data, 'urlList');
      expect(result).toBe('https://example.com');
    });

    it('Markdown形式でフォーマットする', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-01T00:00:00.000Z',
        tabs: [
          { id: '1', url: 'https://example.com', title: 'Example', domain: 'example.com', faviconUrl: '', screenshot: '', lastAccessed: 0, savedAt: 0 },
        ],
      };
      const result = formatTabsData(data, 'markdown');
      expect(result).toBe('- [Example](https://example.com)');
    });
  });

  describe('parseUrlList', () => {
    it('URLリスト形式をパースする', () => {
      const text = 'https://example.com\nhttps://test.com/page';
      const result = parseUrlList(text);
      expect(result).toEqual([
        { url: 'https://example.com', title: 'https://example.com' },
        { url: 'https://test.com/page', title: 'https://test.com/page' },
      ]);
    });

    it('OneTab形式（URL | タイトル）をパースする', () => {
      const text = 'https://example.com | Example Title\nhttps://test.com | Test Site';
      const result = parseUrlList(text);
      expect(result).toEqual([
        { url: 'https://example.com', title: 'Example Title' },
        { url: 'https://test.com', title: 'Test Site' },
      ]);
    });

    it('空行を無視する', () => {
      const text = 'https://example.com\n\nhttps://test.com';
      const result = parseUrlList(text);
      expect(result).toHaveLength(2);
    });

    it('無効なURLを無視する', () => {
      const text = 'https://example.com\nnot-a-url\nhttps://test.com';
      const result = parseUrlList(text);
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://example.com');
      expect(result[1].url).toBe('https://test.com');
    });
  });

  describe('parseMarkdown', () => {
    it('Markdown形式をパースする', () => {
      const text = '- [Example](https://example.com)\n- [Test](https://test.com)';
      const result = parseMarkdown(text);
      expect(result).toEqual([
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://test.com', title: 'Test' },
      ]);
    });

    it('リスト記号なしのMarkdownリンクもパースする', () => {
      const text = '[Example](https://example.com)\n[Test](https://test.com)';
      const result = parseMarkdown(text);
      expect(result).toEqual([
        { url: 'https://example.com', title: 'Example' },
        { url: 'https://test.com', title: 'Test' },
      ]);
    });

    it('タイトルが空の場合はURLをタイトルとして使用する', () => {
      const text = '[](https://example.com)';
      const result = parseMarkdown(text);
      expect(result).toEqual([
        { url: 'https://example.com', title: 'https://example.com' },
      ]);
    });

    it('無効なURLを無視する', () => {
      const text = '[Valid](https://example.com)\n[Invalid](not-a-url)';
      const result = parseMarkdown(text);
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com');
    });
  });

  describe('detectTextFormat', () => {
    it('JSONオブジェクトを検出する', () => {
      const json = '{"version": 1, "tabs": []}';
      expect(detectTextFormat(json)).toBe('json');
    });

    it('JSON配列を検出する', () => {
      const json = '[{"url": "https://example.com"}]';
      expect(detectTextFormat(json)).toBe('json');
    });

    it('Markdown形式を検出する', () => {
      const markdown = '- [Example](https://example.com)\n- [Test](https://test.com)';
      expect(detectTextFormat(markdown)).toBe('markdown');
    });

    it('URLリスト形式を検出する', () => {
      const urlList = 'https://example.com\nhttps://test.com';
      expect(detectTextFormat(urlList)).toBe('urlList');
    });

    it('無効なJSONはJSONとして検出しない', () => {
      const invalidJson = '{ invalid json }';
      expect(detectTextFormat(invalidJson)).toBe('urlList');
    });
  });
});


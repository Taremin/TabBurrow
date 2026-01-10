/**
 * tabs/utils.ts のユニットテスト
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDateTime, formatBytes, escapeHtml } from './utils';

describe('utils', () => {
  describe('formatDateTime', () => {
    beforeEach(() => {
      // 固定の日時でテスト
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-15T14:30:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('今日の日時は「今日 HH:MM」形式で返す', () => {
      const today = new Date('2024-12-15T10:30:00').getTime();
      const result = formatDateTime(today);
      expect(result).toContain('今日');
      expect(result).toContain('10:30');
    });

    it('過去の日付は「M/D HH:MM」形式で返す', () => {
      const pastDate = new Date('2024-12-10T09:15:00').getTime();
      const result = formatDateTime(pastDate);
      expect(result).not.toContain('今日');
      expect(result).toMatch(/12\/10.*09:15/);
    });
  });

  describe('formatBytes', () => {
    it('0バイトは「0 B」を返す', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('バイト単位で正しくフォーマットする', () => {
      expect(formatBytes(100)).toBe('100 B');
      expect(formatBytes(500)).toBe('500 B');
    });

    it('KBにフォーマットする', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('MBにフォーマットする', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('GBにフォーマットする', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('TBにフォーマットする', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });
  });

  describe('escapeHtml', () => {
    it('HTMLエンティティをエスケープする', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('a & b')).toBe('a &amp; b');
      // 注: textContentを使用した実装では、ダブルクォートはエスケープされない
      expect(escapeHtml('"quoted"')).toBe('"quoted"');
    });

    it('通常のテキストはそのまま返す', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('日本語テキスト')).toBe('日本語テキスト');
    });

    it('空文字はそのまま返す', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});

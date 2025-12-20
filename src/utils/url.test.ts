/**
 * URL関連ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import { extractDomain } from './url.js';

describe('extractDomain', () => {
  describe('正常なURL', () => {
    it('HTTPSのURLからドメインを抽出できる', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
    });

    it('HTTPのURLからドメインを抽出できる', () => {
      expect(extractDomain('http://example.com/path?query=1')).toBe('example.com');
    });

    it('サブドメインを含むURLからドメインを抽出できる', () => {
      expect(extractDomain('https://sub.domain.example.com/')).toBe('sub.domain.example.com');
    });

    it('ポート番号を含むURLからドメインを抽出できる', () => {
      expect(extractDomain('http://localhost:3000/api')).toBe('localhost');
    });

    it('fileプロトコルのURLからドメインを抽出できる', () => {
      // file:// プロトコルはホスト名が空になることがある
      expect(extractDomain('file:///C:/path/to/file.html')).toBe('');
    });

    it('IPアドレスを含むURLからIPを抽出できる', () => {
      expect(extractDomain('http://192.168.1.1:8080/page')).toBe('192.168.1.1');
    });
  });

  describe('無効なURL', () => {
    it('無効なURLの場合は unknown を返す', () => {
      expect(extractDomain('invalid-url')).toBe('unknown');
    });

    it('空文字の場合は unknown を返す', () => {
      expect(extractDomain('')).toBe('unknown');
    });

    it('プロトコルのみの場合は unknown を返す', () => {
      expect(extractDomain('https://')).toBe('unknown');
    });

    it('相対パスの場合は unknown を返す', () => {
      expect(extractDomain('/path/to/page')).toBe('unknown');
    });
  });
});

import { extractDomain, applyUrlNormalization, generateRegexFromUrls } from './url.js';

describe('extractDomain', () => {
  // Existing tests...
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

describe('applyUrlNormalization', () => {
  const rules = [
    {
      id: '1',
      enabled: true,
      name: 'Syosetu',
      pattern: '^https://ncode\\.syosetu\\.com/n(\\d+)/\\d+/$',
      replacement: 'https://ncode.syosetu.com/n$1/'
    },
    {
      id: '2',
      enabled: true,
      name: 'YouTube',
      pattern: '^https://www\\.youtube\\.com/watch\\?v=([^&]+).*$',
      replacement: 'https://www.youtube.com/watch?v=$1'
    }
  ];

  it('マッチするルールがある場合、置換を適用する', () => {
    expect(applyUrlNormalization('https://ncode.syosetu.com/n1234/5/', rules))
      .toBe('https://ncode.syosetu.com/n1234/');
    expect(applyUrlNormalization('https://www.youtube.com/watch?v=abcde&t=100', rules))
      .toBe('https://www.youtube.com/watch?v=abcde');
  });

  it('マッチするルールがない場合、元のURLを返す', () => {
    expect(applyUrlNormalization('https://example.com/', rules))
      .toBe('https://example.com/');
  });

  it('無効なルール（enabled=false）は無視する', () => {
    const disabledRules = rules.map(r => ({ ...r, enabled: false }));
    expect(applyUrlNormalization('https://ncode.syosetu.com/n1234/5/', disabledRules))
      .toBe('https://ncode.syosetu.com/n1234/5/');
  });

  it('最初のマッチするルールのみ適用する', () => {
    const overlappingRules = [
      { id: '1', enabled: true, name: 'Rule 1', pattern: 'example', replacement: 'REPLACEMENT 1' },
      { id: '2', enabled: true, name: 'Rule 2', pattern: 'example', replacement: 'REPLACEMENT 2' }
    ];
    expect(applyUrlNormalization('https://example.com/', overlappingRules))
      .toBe('https://REPLACEMENT 1.com/');
  });

  it('不正な正規表現パターンの場合はエラーをログに出力し、元のURLを返す', () => {
    const invalidRules = [
      { id: '1', enabled: true, name: 'Invalid', pattern: '[', replacement: 'x' }
    ];
    expect(applyUrlNormalization('https://example.com/', invalidRules))
      .toBe('https://example.com/');
  });
});

describe('generateRegexFromUrls', () => {
  it('共通の接頭辞と接尾辞、および数字の変動部分を抽出できる（小説形式）', () => {
    const urls = [
      'https://ncode.syosetu.com/n123/1/',
      'https://ncode.syosetu.com/n123/2/',
      'https://ncode.syosetu.com/n123/10/'
    ];
    const result = generateRegexFromUrls(urls);
    expect(result.pattern).toBe('^https://ncode\\.syosetu\\.com/n123/\\d+/$');
    expect(result.replacement).toBe('https://ncode.syosetu.com/n123/');
  });

  it('数字以外の変動部分がある場合はキャプチャグループを使用する', () => {
    const urls = [
      'https://example.com/user/alice/profile',
      'https://example.com/user/bob/profile'
    ];
    const result = generateRegexFromUrls(urls);
    expect(result.pattern).toBe('^https://example\\.com/user/([^/]+)/profile$');
    expect(result.replacement).toBe('https://example.com/user/$1/profile');
  });

  it('URLが1つの場合は数字を \d+ にした提案を行う', () => {
    const result = generateRegexFromUrls(['https://example.com/123']);
    expect(result.pattern).toBe('^https://example\\.com/\\d+$');
  });

  it('空の配列の場合は空の提案を返す', () => {
    expect(generateRegexFromUrls([])).toEqual({ pattern: '', replacement: '' });
  });
});

/**
 * i18n 欠落キーチェックスクリプト
 * 日本語(ja.json)を標準として、他の言語ファイルに欠けているキーがないかチェック
 * 
 * 使用方法: npm run i18n:check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// scriptsディレクトリから見た相対パスで指定
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const BASE_LOCALE = 'ja'; // 日本語を標準とする

/**
 * オブジェクトからすべてのキーパスを再帰的に取得
 * 例: { a: { b: "value" } } -> ["a.b"]
 */
function getAllKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeyPaths(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * ネストされたオブジェクトからキーで値を取得
 */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

/**
 * 2つのロケールを比較して欠落キーを検出
 */
function findMissingKeys(
  baseData: Record<string, unknown>,
  targetData: Record<string, unknown>,
  baseLocale: string,
  targetLocale: string
): { missing: string[]; extra: string[] } {
  const baseKeys = getAllKeyPaths(baseData);
  const targetKeys = getAllKeyPaths(targetData);
  
  const baseSet = new Set(baseKeys);
  const targetSet = new Set(targetKeys);
  
  // ターゲットに不足しているキー
  const missing = baseKeys.filter(key => !targetSet.has(key));
  
  // ターゲットにあってベースにないキー（余分なキー）
  const extra = targetKeys.filter(key => !baseSet.has(key));
  
  return { missing, extra };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log('🔍 i18n 欠落キーチェック\n');
  console.log(`📁 ロケールディレクトリ: ${LOCALES_DIR}`);
  console.log(`📌 標準言語: ${BASE_LOCALE}\n`);

  // ロケールファイルを読み込み
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('❌ ロケールファイルが見つかりません');
    process.exit(1);
  }

  // 標準言語ファイルを読み込み
  const baseFilePath = path.join(LOCALES_DIR, `${BASE_LOCALE}.json`);
  if (!fs.existsSync(baseFilePath)) {
    console.error(`❌ 標準言語ファイルが見つかりません: ${baseFilePath}`);
    process.exit(1);
  }
  
  const baseData = JSON.parse(fs.readFileSync(baseFilePath, 'utf-8')) as Record<string, unknown>;
  const baseKeys = getAllKeyPaths(baseData);
  
  console.log(`📊 標準言語(${BASE_LOCALE})のキー数: ${baseKeys.length}\n`);
  
  let hasErrors = false;
  
  // 各言語ファイルをチェック
  for (const file of files) {
    const locale = path.basename(file, '.json');
    
    if (locale === BASE_LOCALE) {
      continue; // 標準言語はスキップ
    }
    
    const filePath = path.join(LOCALES_DIR, file);
    const targetData = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const targetKeys = getAllKeyPaths(targetData);
    
    console.log(`📄 ${locale}.json (${targetKeys.length} キー)`);
    
    const { missing, extra } = findMissingKeys(baseData, targetData, BASE_LOCALE, locale);
    
    if (missing.length === 0 && extra.length === 0) {
      console.log(`   ✅ すべてのキーが揃っています\n`);
    } else {
      if (missing.length > 0) {
        hasErrors = true;
        console.log(`   ❌ 欠落キー (${missing.length}件):`);
        for (const key of missing) {
          const baseValue = getNestedValue(baseData, key);
          console.log(`      - ${key}`);
          console.log(`        ${BASE_LOCALE}: "${baseValue}"`);
        }
      }
      
      if (extra.length > 0) {
        console.log(`   ⚠️  余分なキー (${extra.length}件):`);
        for (const key of extra) {
          console.log(`      - ${key}`);
        }
      }
      console.log('');
    }
  }
  
  if (hasErrors) {
    console.log('❌ 欠落キーが見つかりました。翻訳ファイルを更新してください。');
    process.exit(1);
  } else {
    console.log('✅ すべての言語ファイルが完全です！');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('エラー:', error);
  process.exit(1);
});

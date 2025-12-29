
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// パス定義
const packageJsonPath = path.join(rootDir, 'package.json');
const manifestPaths = [
  path.join(rootDir, 'src', 'manifest.chrome.json'),
  path.join(rootDir, 'src', 'manifest.firefox.json'),
  path.join(rootDir, 'src', 'manifest.firefox-android.json'),
];

// package.jsonからバージョンを取得
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`📦 Current version in package.json: ${version}`);

// 各マニフェストファイルを更新
let updatedCount = 0;

for (const manifestPath of manifestPaths) {
  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️ Manifest file not found: ${manifestPath}`);
    continue;
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    if (manifest.version === version) {
      console.log(`✅ ${path.basename(manifestPath)} is already up to date.`);
      continue;
    }

    const oldVersion = manifest.version;
    manifest.version = version;

    // JSONのフォーマットを崩さないように整形して保存
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✨ Updated ${path.basename(manifestPath)}: ${oldVersion} -> ${version}`);
    updatedCount++;
  } catch (error) {
    console.error(`❌ Error updating ${path.basename(manifestPath)}:`, error);
    process.exit(1);
  }
}

if (updatedCount > 0) {
  console.log(`\n🎉 Successfully updated ${updatedCount} manifest file(s).`);
} else {
  console.log('\n✨ All manifest files are already up to date.');
}

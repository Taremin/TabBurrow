import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';

// package.jsonからバージョンを取得
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const VERSION = packageJson.version;

// コマンドライン引数を解析
const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const buildChrome = args.includes('--chrome') || (!args.includes('--firefox') && !args.includes('--chrome'));
const buildFirefox = args.includes('--firefox') || (!args.includes('--firefox') && !args.includes('--chrome'));

// 出力ディレクトリ
const DIST_CHROME = 'dist/chrome';
const DIST_FIREFOX = 'dist/firefox';

/**
 * ディレクトリを作成（存在しない場合）
 */
function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/**
 * ディレクトリをクリーンアップ
 */
function cleanDir(dir) {
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
    }
    mkdirSync(dir, { recursive: true });
}

/**
 * 静的ファイルをコピー
 */
function copyStaticFiles(distDir, browser) {
    // manifest.jsonをコピー（ブラウザ別）
    const manifestSrc = browser === 'firefox'
        ? 'src/manifest.firefox.json'
        : 'src/manifest.chrome.json';
    copyFileSync(manifestSrc, join(distDir, 'manifest.json'));

    // HTML/CSS
    copyFileSync('src/tabs.html', join(distDir, 'tabs.html'));
    copyFileSync('src/tabs.css', join(distDir, 'tabs.css'));

    // options.html: バージョン情報を注入
    const optionsHtml = readFileSync('src/options.html', 'utf8');
    writeFileSync(join(distDir, 'options.html'), optionsHtml.replace(/\{\{VERSION\}\}/g, VERSION));
    copyFileSync('src/options.css', join(distDir, 'options.css'));

    // アイコン
    const iconsDir = join(distDir, 'icons');
    ensureDir(iconsDir);
    if (existsSync('src/icons')) {
        cpSync('src/icons', iconsDir, { recursive: true });
    }

    // ロケールファイル（_locales）
    if (existsSync('src/locales')) {
        const localesDir = join(distDir, 'locales');
        ensureDir(localesDir);
        cpSync('src/locales', localesDir, { recursive: true });
    }

    console.log(`✓ 静的ファイルをコピーしました (${browser})`);
}

/**
 * ビルドを実行
 */
async function build(distDir, browser) {
    // Firefox用はES modules形式、Chrome用はIIFE形式
    const format = browser === 'firefox' ? 'esm' : 'iife';

    const buildOptions = {
        entryPoints: [
            'src/background/index.ts',
            'src/tabs/index.tsx',
            'src/options/index.tsx',
        ],
        bundle: true,
        outdir: distDir,
        outbase: 'src',
        format: format,
        target: 'es2022',
        sourcemap: isWatch ? 'inline' : false,
        minify: !isWatch,
        logLevel: 'info',
        jsx: 'automatic',
    };

    if (isWatch) {
        const ctx = await esbuild.context(buildOptions);
        await ctx.watch();
        copyStaticFiles(distDir, browser);
        console.log(`👀 ウォッチモードで監視中... (${browser})`);
    } else {
        cleanDir(distDir);
        await esbuild.build(buildOptions);
        copyStaticFiles(distDir, browser);
        console.log(`✅ ビルド完了 (${browser})`);
    }
}

async function main() {
    try {
        const builds = [];

        if (buildChrome) {
            builds.push(build(DIST_CHROME, 'chrome'));
        }

        if (buildFirefox) {
            builds.push(build(DIST_FIREFOX, 'firefox'));
        }

        await Promise.all(builds);

        if (!isWatch) {
            console.log('');
            console.log('📦 ビルド結果:');
            if (buildChrome) console.log(`   Chrome: ${DIST_CHROME}/`);
            if (buildFirefox) console.log(`   Firefox: ${DIST_FIREFOX}/`);
        }
    } catch (error) {
        console.error('ビルドエラー:', error);
        process.exit(1);
    }
}

main();

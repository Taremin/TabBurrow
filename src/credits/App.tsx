/**
 * クレジットページ - メインコンポーネント
 * 使用ライブラリとライセンス情報を表示
 */

import browser from '../browserApi';
import { useTranslation } from '../common/i18nContext';

// ライブラリ情報の型定義
interface LibraryInfo {
    name: string;
    version: string;
    license: string;
    copyright: string;
    url: string;
}

// 本番依存ライブラリ
const runtimeLibraries: LibraryInfo[] = [
    {
        name: 'React',
        version: '18.3.1',
        license: 'MIT',
        copyright: 'Copyright (c) Facebook, Inc. and its affiliates.',
        url: 'https://react.dev/',
    },
    {
        name: 'ReactDOM',
        version: '18.3.1',
        license: 'MIT',
        copyright: 'Copyright (c) Facebook, Inc. and its affiliates.',
        url: 'https://react.dev/',
    },
    {
        name: 'react-virtuoso',
        version: '4.12.0',
        license: 'MIT',
        copyright: 'Copyright (c) 2020 Petyo Ivanov',
        url: 'https://virtuoso.dev/',
    },
    {
        name: 'Lucide React',
        version: '0.562.0',
        license: 'ISC / MIT',
        copyright: 'Copyright (c) Lucide Contributors 2025 / Cole Bemis (Feather)',
        url: 'https://lucide.dev/',
    },
    {
        name: 'webextension-polyfill',
        version: '0.12.0',
        license: 'MPL-2.0',
        copyright: 'Copyright (c) Mozilla Foundation',
        url: 'https://github.com/nicekiwi/webextension-polyfill',
    },
];

// 開発依存ライブラリ
const devLibraries: LibraryInfo[] = [
    {
        name: 'TypeScript',
        version: '5.7.2',
        license: 'Apache-2.0',
        copyright: 'Copyright (c) Microsoft Corporation.',
        url: 'https://www.typescriptlang.org/',
    },
    {
        name: 'esbuild',
        version: '0.24.0',
        license: 'MIT',
        copyright: 'Copyright (c) 2020 Evan Wallace',
        url: 'https://esbuild.github.io/',
    },
    {
        name: 'Vitest',
        version: '2.1.8',
        license: 'MIT',
        copyright: 'Copyright (c) 2021-Present Vitest Team',
        url: 'https://vitest.dev/',
    },
    {
        name: 'Playwright',
        version: '1.49.1',
        license: 'Apache-2.0',
        copyright: 'Copyright (c) Microsoft Corporation / Google Inc.',
        url: 'https://playwright.dev/',
    },
    {
        name: 'jsdom',
        version: '25.0.1',
        license: 'MIT',
        copyright: 'Copyright (c) 2010 Elijah Insua',
        url: 'https://github.com/jsdom/jsdom',
    },
    {
        name: '@types/react',
        version: '18.3.17',
        license: 'MIT',
        copyright: 'Copyright (c) Microsoft Corporation.',
        url: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
    },
    {
        name: '@types/react-dom',
        version: '18.3.5',
        license: 'MIT',
        copyright: 'Copyright (c) Microsoft Corporation.',
        url: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
    },
    {
        name: '@types/webextension-polyfill',
        version: '0.12.3',
        license: 'MIT',
        copyright: 'Copyright (c) Microsoft Corporation.',
        url: 'https://github.com/nicekiwi/webextension-polyfill',
    },
];

// ライブラリカードコンポーネント
function LibraryCard({ library }: { library: LibraryInfo }) {
    return (
        <div className="library-card">
            <h3 className="library-name">
                {library.name}
                <span className="library-version">v{library.version}</span>
            </h3>
            <span className="library-license">{library.license}</span>
            <p className="library-copyright">{library.copyright}</p>
            <p className="library-url">
                <a href={library.url} target="_blank" rel="noopener noreferrer">
                    {library.url}
                </a>
            </p>
        </div>
    );
}

export function App() {
    const { t } = useTranslation();

    return (
        <div className="container">
            {/* ヘッダー - optionsと同じ構造 */}
            <header className="header">
                <div className="header-left">
                    <h1 className="logo">
                        <span className="logo-icon">📜</span>
                        <span>{t('credits.headerTitle')}</span>
                    </h1>
                </div>
                <div className="header-right">
                    <a href="options.html" className="btn btn-secondary">
                        <span>⚙️</span>
                        <span>{t('credits.backToSettings')}</span>
                    </a>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="main">
                <p className="description">{t('credits.description')}</p>

                {/* 本番依存 */}
                <h2 className="section-title">{t('credits.runtimeDependencies')}</h2>
                <div className="library-list">
                    {runtimeLibraries.map((lib) => (
                        <LibraryCard key={lib.name} library={lib} />
                    ))}
                </div>

                {/* 開発依存 */}
                <h2 className="section-title dev-section">{t('credits.devDependencies')}</h2>
                <div className="library-list">
                    {devLibraries.map((lib) => (
                        <LibraryCard key={lib.name} library={lib} />
                    ))}
                </div>
            </main>

            {/* フッター (Fixed) - optionsと同じ構造 */}
            <div className="fixed-footer">
                <div className="fixed-footer-content">
                    <div className="footer-left">
                        <span className="version-info">TabBurrow v{browser.runtime.getManifest().version}</span>
                    </div>
                    <div className="footer-right">
                        <span className="footer-text">{t('credits.extensionLicense')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

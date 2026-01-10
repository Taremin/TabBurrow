/**
 * TabBurrow - テーマエディタ メインアプリ
 */

import { useState, useCallback, useEffect } from 'react';
import { Settings, Palette, Plus, Download, Upload, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../common/i18nContext';
import {
  getCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  createCustomTheme,
  exportThemesToJson,
  importThemeFromJson,
  type CustomTheme,
} from '../customTheme';
import { ThemeList } from './components/ThemeList';
import { ThemeEditor } from './components/ThemeEditor';
import { ImportExportDialog } from './components/ImportExportDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function App() {
  const { t, locale } = useTranslation();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // 削除確認ダイアログ用state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<CustomTheme | null>(null);

  // ページタイトルとhtml lang属性を設定
  useEffect(() => {
    document.title = `TabBurrow - ${t('themeEditor.title', { defaultValue: 'テーマエディタ' })}`;
    document.documentElement.lang = locale;
  }, [t, locale]);

  // テーマを読み込み
  const loadThemes = useCallback(async () => {
    try {
      const loaded = await getCustomThemes();
      setThemes(loaded);
      // 最初のテーマを自動選択
      if (loaded.length > 0 && !selectedThemeId) {
        setSelectedThemeId(loaded[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedThemeId]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  // 選択中のテーマ
  const selectedTheme = themes.find(t => t.id === selectedThemeId) || null;

  // 新規テーマ作成
  const handleCreateTheme = useCallback(async (basedOn: 'light' | 'dark' = 'light') => {
    const newTheme = createCustomTheme(
      t('themeEditor.newThemeName', { defaultValue: '新しいテーマ' }),
      basedOn
    );
    await saveCustomTheme(newTheme);
    await loadThemes();
    setSelectedThemeId(newTheme.id);
  }, [loadThemes, t]);

  // テーマ更新
  const handleUpdateTheme = useCallback(async (theme: CustomTheme) => {
    await saveCustomTheme(theme);
    await loadThemes();
  }, [loadThemes]);

  // テーマ削除確認を開く
  const handleDeleteTheme = useCallback((id: string) => {
    const theme = themes.find(t => t.id === id);
    if (!theme) return;
    setThemeToDelete(theme);
    setDeleteConfirmOpen(true);
  }, [themes]);

  // 削除を実行
  const handleConfirmDelete = useCallback(async () => {
    if (!themeToDelete) return;
    await deleteCustomTheme(themeToDelete.id);
    if (selectedThemeId === themeToDelete.id) {
      setSelectedThemeId(themes.find(t => t.id !== themeToDelete.id)?.id || null);
    }
    await loadThemes();
    setDeleteConfirmOpen(false);
    setThemeToDelete(null);
  }, [themeToDelete, selectedThemeId, themes, loadThemes]);

  // 削除をキャンセル
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmOpen(false);
    setThemeToDelete(null);
  }, []);

  // インポート
  const handleImport = useCallback(async (json: string) => {
    const imported = importThemeFromJson(json);
    if (!imported) {
      return false;
    }

    const themesToImport = Array.isArray(imported) ? imported : [imported];
    for (const theme of themesToImport) {
      // IDを再生成してから保存
      const newTheme = {
        ...theme,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveCustomTheme(newTheme);
    }
    await loadThemes();
    setShowImportDialog(false);
    return true;
  }, [loadThemes]);

  // エクスポート
  const getExportJson = useCallback(() => {
    return exportThemesToJson(themes);
  }, [themes]);

  return (
    <>
      {/* ヘッダー */}
      <header className="header">
        <div className="header-left">
          <a href="options.html" className="btn btn-secondary" aria-label={t('themeEditor.backToSettings', { defaultValue: '設定に戻る' })}>
            <ArrowLeft size={16} />
            <span>{t('themeEditor.backToSettings', { defaultValue: '設定に戻る' })}</span>
          </a>
          <h1 className="logo">
            <Palette size={24} />
            <span>{t('themeEditor.title', { defaultValue: 'テーマエディタ' })}</span>
          </h1>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => setShowImportDialog(true)}>
            <Upload size={16} />
            <span>{t('themeEditor.import', { defaultValue: 'インポート' })}</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setShowExportDialog(true)} disabled={themes.length === 0}>
            <Download size={16} />
            <span>{t('themeEditor.export', { defaultValue: 'エクスポート' })}</span>
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="main">
        {/* サイドバー（テーマリスト） */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">{t('themeEditor.themeList', { defaultValue: 'テーマ一覧' })}</span>
            <button className="btn btn-primary" onClick={() => handleCreateTheme('light')}>
              <Plus size={16} />
              <span>{t('themeEditor.newTheme', { defaultValue: '新規作成' })}</span>
            </button>
          </div>
          <ThemeList
            themes={themes}
            selectedId={selectedThemeId}
            onSelect={setSelectedThemeId}
            onDelete={handleDeleteTheme}
          />
        </aside>

        {/* エディタ */}
        <div className="editor-main">
          {selectedTheme ? (
            <ThemeEditor
              theme={selectedTheme}
              onUpdate={handleUpdateTheme}
            />
          ) : (
            <div className="empty-state">
              <Settings size={48} className="empty-state-icon" />
              <h2 className="empty-state-title">
                {t('themeEditor.noThemeSelected', { defaultValue: 'テーマが選択されていません' })}
              </h2>
              <p className="empty-state-description">
                {t('themeEditor.createFirstTheme', { defaultValue: '左のパネルから新規テーマを作成するか、既存のテーマを選択してください。' })}
              </p>
              <button className="btn btn-primary" onClick={() => handleCreateTheme('light')}>
                <Plus size={16} />
                <span>{t('themeEditor.newTheme', { defaultValue: '新規作成' })}</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ダイアログ */}
      <ImportExportDialog
        isOpen={showImportDialog}
        mode="import"
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
      <ImportExportDialog
        isOpen={showExportDialog}
        mode="export"
        onClose={() => setShowExportDialog(false)}
        exportJson={getExportJson()}
      />
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title={t('themeEditor.deleteConfirmTitle', { defaultValue: 'テーマを削除' })}
        message={t('themeEditor.deleteConfirmMessage', { 
          defaultValue: `「${themeToDelete?.name || ''}」を削除しますか？`,
          name: themeToDelete?.name || ''
        })}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}


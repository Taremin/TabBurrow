/**
 * TabBurrow - データ管理コンポーネント
 */

import { useState, useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import {
  exportSettings,
  importSettings,
  exportTabs,
  importTabs,
  downloadAsFile,
  selectAndReadJsonFile,
  generateSettingsExportFilename,
  generateTabsExportFilename,
  importTabsFromText,
  type SettingsExportData,
  type TabExportData,
  type ImportMode,
} from '../../exportImport.js';
import { notifySettingsChanged } from '../../settings.js';
import { ImportModeDialog } from './ImportModeDialog.js';
import { TextExportDialog } from './TextExportDialog.js';
import { TextImportDialog } from './TextImportDialog.js';
import { AlertDialog } from '../../common/AlertDialog.js';
import { Database, Download, Upload, FileJson, ClipboardPaste } from 'lucide-react';

interface DataManagementProps {
  onSettingsImported: () => void;
}

export function DataManagement({ onSettingsImported }: DataManagementProps) {
  const { t } = useTranslation();
  
  // インポートダイアログ状態（ファイルベース）
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [pendingTabImportData, setPendingTabImportData] = useState<TabExportData | null>(null);

  // テキストエクスポートダイアログ状態
  const [isTabsExportDialogOpen, setIsTabsExportDialogOpen] = useState(false);
  const [isSettingsExportDialogOpen, setIsSettingsExportDialogOpen] = useState(false);
  const [tabsExportData, setTabsExportData] = useState<TabExportData | null>(null);
  const [settingsExportJson, setSettingsExportJson] = useState('');

  // テキストインポートダイアログ状態
  const [isTabsImportDialogOpen, setIsTabsImportDialogOpen] = useState(false);
  const [isSettingsImportDialogOpen, setIsSettingsImportDialogOpen] = useState(false);

  // AlertDialog状態
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({ isOpen: false, title: '', message: '', variant: 'info' });

  // AlertDialogを表示するヘルパー
  const showAlert = useCallback((title: string, message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setAlertDialog({ isOpen: true, title, message, variant });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 設定エクスポート（ファイル）
  const handleExportSettings = useCallback(async () => {
    try {
      const data = await exportSettings();
      downloadAsFile(data, generateSettingsExportFilename());
    } catch (error) {
      console.error('設定のエクスポートに失敗:', error);
      showAlert(t('settings.saveError'), t('settings.dataManagement.exportError') || '設定のエクスポートに失敗しました。', 'error');
    }
  }, [showAlert, t]);

  // 設定インポート（ファイル）
  const handleImportSettings = useCallback(async () => {
    try {
      const data = await selectAndReadJsonFile<SettingsExportData>();
      await importSettings(data);
      
      // Background Scriptに通知
      notifySettingsChanged();
      
      // 親コンポーネントに通知
      onSettingsImported();
      
      showAlert(t('settings.importSuccess'), t('settings.importSuccess'), 'success');
    } catch (error) {
      if ((error as Error).message !== 'ファイル選択がキャンセルされました') {
        console.error('設定のインポートに失敗:', error);
        showAlert(t('settings.saveError'), '設定のインポートに失敗しました: ' + (error as Error).message, 'error');
      }
    }
  }, [onSettingsImported, showAlert, t]);

  // タブエクスポート（ファイル）
  const handleExportTabs = useCallback(async () => {
    try {
      const data = await exportTabs();
      downloadAsFile(data, generateTabsExportFilename());
    } catch (error) {
      console.error('タブのエクスポートに失敗:', error);
      showAlert(t('settings.saveError'), 'タブのエクスポートに失敗しました。', 'error');
    }
  }, [showAlert, t]);

  // タブインポート開始（モード選択ダイアログを表示）
  const handleImportTabs = useCallback(async () => {
    try {
      const data = await selectAndReadJsonFile<TabExportData>();
      setPendingTabImportData(data);
      setImportMode('merge');
      setIsImportDialogOpen(true);
    } catch (error) {
      if ((error as Error).message !== 'ファイル選択がキャンセルされました') {
        console.error('ファイル読み込みに失敗:', error);
        showAlert(t('settings.saveError'), 'ファイルの読み込みに失敗しました。', 'error');
      }
    }
  }, [showAlert, t]);

  // インポートダイアログ確定（ファイルベース）
  const handleConfirmImport = useCallback(async () => {
    if (!pendingTabImportData) return;

    try {
      const result = await importTabs(pendingTabImportData, importMode);
      setIsImportDialogOpen(false);
      setPendingTabImportData(null);
      showAlert(t('settings.importDialog.successMessage', { imported: result.imported, skipped: result.skipped }), `インポート完了: ${result.imported}件追加、${result.skipped}件スキップ`, 'success');
    } catch (error) {
      console.error('インポートに失敗:', error);
      showAlert(t('settings.saveError'), 'インポートに失敗しました: ' + (error as Error).message, 'error');
    }
  }, [pendingTabImportData, importMode, showAlert, t]);

  // インポートダイアログキャンセル
  const handleCancelImport = useCallback(() => {
    setIsImportDialogOpen(false);
    setPendingTabImportData(null);
  }, []);

  // タブデータをテキストで表示（フォーマット選択可能）
  const handleShowTabsText = useCallback(async () => {
    try {
      const data = await exportTabs();
      setTabsExportData(data);
      setIsTabsExportDialogOpen(true);
    } catch (error) {
      console.error('タブのエクスポートに失敗:', error);
      showAlert(t('settings.saveError'), 'タブのエクスポートに失敗しました。', 'error');
    }
  }, [showAlert, t]);

  // 設定をJSONで表示
  const handleShowSettingsJson = useCallback(async () => {
    try {
      const data = await exportSettings();
      setSettingsExportJson(JSON.stringify(data, null, 2));
      setIsSettingsExportDialogOpen(true);
    } catch (error) {
      console.error('設定のエクスポートに失敗:', error);
      showAlert(t('settings.saveError'), '設定のエクスポートに失敗しました。', 'error');
    }
  }, [showAlert, t]);

  // タブデータをテキストからインポート（複数フォーマット対応）
  const handleImportTabsFromText = useCallback(async (text: string) => {
    // importTabsFromTextはフォーマットを自動判定してインポート
    const result = await importTabsFromText(text, 'merge');
    showAlert(t('settings.importDialog.successMessage', { imported: result.imported, skipped: result.skipped }), `インポート完了: ${result.imported}件追加、${result.skipped}件スキップ`, 'success');
  }, [showAlert, t]);

  // 設定をテキストからインポート
  const handleImportSettingsFromText = useCallback(async (jsonText: string) => {
    const data = JSON.parse(jsonText) as SettingsExportData;
    await importSettings(data);
    
    // Background Scriptに通知
    notifySettingsChanged();
    
    // 親コンポーネントに通知
    onSettingsImported();
    
    showAlert(t('settings.importSuccess'), t('settings.importSuccess'), 'success');
  }, [onSettingsImported, showAlert, t]);

  return (
    <>
      <section className="settings-section data-management">
        <h2 className="section-title">
          <span className="section-icon"><Database size={20} /></span>
          <span>{t('settings.dataManagement.title')}</span>
        </h2>

        {/* タブデータ */}
        <div className="data-group">
          <h3 className="data-group-title">{t('settings.dataManagement.tabData')}</h3>
          <p className="section-description">
            {t('settings.dataManagement.tabDataDescription')}
          </p>
          <div className="export-import-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportTabs}
            >
              <Download size={16} />
              <span>{t('settings.dataManagement.exportTabs')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleImportTabs}
            >
              <Upload size={16} />
              <span>{t('settings.dataManagement.importTabs')}</span>
            </button>
          </div>
          {/* テキストベースのエクスポート/インポート */}
          <div className="export-import-buttons text-based">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleShowTabsText}
            >
              <FileJson size={14} />
              <span>{t('settings.dataManagement.showTextButton')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsTabsImportDialogOpen(true)}
            >
              <ClipboardPaste size={14} />
              <span>{t('settings.dataManagement.pasteTextButton')}</span>
            </button>
          </div>
        </div>

        {/* 設定 */}
        <div className="data-group">
          <h3 className="data-group-title">{t('settings.dataManagement.settingsData')}</h3>
          <p className="section-description">
            {t('settings.dataManagement.settingsDataDescription')}
          </p>
          <div className="export-import-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportSettings}
            >
              <Download size={16} />
              <span>{t('settings.dataManagement.exportSettings')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleImportSettings}
            >
              <Upload size={16} />
              <span>{t('settings.dataManagement.importSettings')}</span>
            </button>
          </div>
          {/* テキストベースのエクスポート/インポート */}
          <div className="export-import-buttons text-based">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={handleShowSettingsJson}
            >
              <FileJson size={14} />
              <span>{t('settings.dataManagement.showJsonButton')}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsSettingsImportDialogOpen(true)}
            >
              <ClipboardPaste size={14} />
              <span>{t('settings.dataManagement.pasteJsonButton')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* インポートモード選択ダイアログ（ファイルベース） */}
      <ImportModeDialog
        isOpen={isImportDialogOpen}
        selectedMode={importMode}
        onModeChange={setImportMode}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />

      {/* タブデータ - テキストエクスポートダイアログ（フォーマット選択可能） */}
      <TextExportDialog
        isOpen={isTabsExportDialogOpen}
        title={t('settings.dataManagement.exportDialogTitle', { target: t('settings.dataManagement.tabData') })}
        isTabsExport={true}
        tabsData={tabsExportData}
        onClose={() => setIsTabsExportDialogOpen(false)}
      />

      {/* 設定 - テキストエクスポートダイアログ（JSONのみ） */}
      <TextExportDialog
        isOpen={isSettingsExportDialogOpen}
        title={t('settings.dataManagement.exportDialogTitle', { target: t('settings.dataManagement.settingsData') })}
        isTabsExport={false}
        jsonData={settingsExportJson}
        onClose={() => setIsSettingsExportDialogOpen(false)}
      />

      {/* タブデータ - テキストインポートダイアログ（フォーマット自動判定） */}
      <TextImportDialog
        isOpen={isTabsImportDialogOpen}
        title={t('settings.dataManagement.importDialogTitle', { target: t('settings.dataManagement.tabData') })}
        isTabsImport={true}
        onImport={handleImportTabsFromText}
        onClose={() => setIsTabsImportDialogOpen(false)}
      />

      {/* 設定 - テキストインポートダイアログ（JSONのみ） */}
      <TextImportDialog
        isOpen={isSettingsImportDialogOpen}
        title={t('settings.dataManagement.importDialogTitle', { target: t('settings.dataManagement.settingsData') })}
        isTabsImport={false}
        onImport={handleImportSettingsFromText}
        onClose={() => setIsSettingsImportDialogOpen(false)}
      />

      {/* 共通のAlertDialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        onClose={closeAlert}
      />
    </>
  );
}

/**
 * TabBurrow - 設定画面メインコンポーネント
 */

import { useState, useCallback } from 'react';
import browser from '../browserApi.js';
import { useTranslation } from '../common/i18nContext.js';
import { useSettings } from './hooks/useSettings.js';
import { SettingsSection } from './components/SettingsSection.js';
import { LanguageSettings } from './components/LanguageSettings.js';
import { AppearanceSettings } from './components/AppearanceSettings.js';
import { ViewModeSettings } from './components/ViewModeSettings.js';
import { SortSettings } from './components/SortSettings.js';
import { AutoCloseSettings } from './components/AutoCloseSettings.js';
import { IconClickSettings } from './components/IconClickSettings.js';
import { RestoreSettings } from './components/RestoreSettings.js';
import { LinkCheckSettings } from './components/LinkCheckSettings.js';
import { BackupSettings } from './components/BackupSettings.js';
import { DataManagement } from './components/DataManagement.js';
import { CustomGroupSettings } from './components/CustomGroupSettings.js';
import { DomainGroupSettings } from './components/DomainGroupSettings.js';
import { PinnedDomainGroupSettings } from './components/PinnedDomainGroupSettings.js';
import { Dialog } from '../common/Dialog.js';
import { Layout } from '../common/Layout.js';
import { AlertTriangle, Folder, Tag, Pin } from 'lucide-react';

export function App() {
  const { t } = useTranslation();
  const {
    settings,
    savedSettings,
    hasChanges,
    isLoading,
    saveStatus,
    updateSetting,
    save,
    reload,
  } = useSettings();

  // 未保存警告ダイアログの状態
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // フォーム送信
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await save();
  }, [save]);

  // タブ管理画面リンクのクリックハンドラ
  const handleTabManagerClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasChanges) {
      e.preventDefault();
      setShowUnsavedWarning(true);
    }
    // hasChangesがfalseの場合はデフォルトの遷移動作
  }, [hasChanges]);

  // 保存せずに遷移
  const handleLeaveWithoutSaving = useCallback(() => {
    setShowUnsavedWarning(false);
    window.location.href = 'tabs.html';
  }, []);

  // 保存してから遷移
  const handleSaveAndLeave = useCallback(async () => {
    await save();
    setShowUnsavedWarning(false);
    window.location.href = 'tabs.html';
  }, [save]);

  // 読み込み中
  if (isLoading) {
    return null;
  }

  // ステータスメッセージ
  const getStatusMessage = () => {
    switch (saveStatus) {
      case 'success':
        return t('settings.saveSuccess');
      case 'error':
        return t('settings.saveError');
      default:
        return '';
    }
  };

  return (
    <Layout
      headerContent={
        <>
          <div className="header-left">
            <h1 className="logo">
              <span className="logo-icon">⚙️</span>
              <span>{t('settings.headerTitle')}</span>
            </h1>
          </div>
          <div className="header-right">
            <a href="tabs.html" className="btn btn-secondary" onClick={handleTabManagerClick}>
              <span>📋</span>
              <span>{t('settings.tabManagerLink')}</span>
            </a>
          </div>
        </>
      }
    >
      <form id="settingsForm" className="settings-form" onSubmit={handleSubmit}>
        {/* 言語設定 */}
        <SettingsSection
          icon="🌐"
          title={t('settings.language.title')}
          description={t('settings.language.description')}
        >
          <LanguageSettings
            value={settings.locale}
            savedValue={savedSettings.locale}
            onChange={(value) => updateSetting('locale', value)}
          />
        </SettingsSection>

        {/* 外観設定 */}
        <SettingsSection
          icon="🎨"
          title={t('settings.appearance.title')}
          description={t('settings.appearance.description')}
        >
          <AppearanceSettings
            value={settings.theme}
            savedValue={savedSettings.theme}
            onChange={(value) => updateSetting('theme', value)}
          />
        </SettingsSection>

        {/* デフォルト表示モード設定 */}
        <SettingsSection
          icon="🗒️"
          title={t('settings.viewMode.title')}
          description={t('settings.viewMode.description')}
        >
          <ViewModeSettings
            viewMode={settings.defaultViewMode}
            displayDensity={settings.defaultDisplayDensity}
            savedViewMode={savedSettings.defaultViewMode}
            savedDisplayDensity={savedSettings.defaultDisplayDensity}
            onViewModeChange={(value) => updateSetting('defaultViewMode', value)}
            onDisplayDensityChange={(value) => updateSetting('defaultDisplayDensity', value)}
          />
        </SettingsSection>

        {/* ソート順設定 */}
        <SettingsSection
          icon="🔢"
          title={t('settings.sort.title')}
          description={t('settings.sort.description')}
        >
          <SortSettings
            groupSort={settings.groupSort}
            itemSort={settings.itemSort}
            savedGroupSort={savedSettings.groupSort}
            savedItemSort={savedSettings.itemSort}
            onGroupSortChange={(value) => updateSetting('groupSort', value)}
            onItemSortChange={(value) => updateSetting('itemSort', value)}
          />
        </SettingsSection>

        {/* アイコンクリック設定 */}
        <SettingsSection
          icon="👁"
          title={t('settings.iconClick.title')}
          description={t('settings.iconClick.description')}
        >
          <IconClickSettings
            applyRules={settings.iconClickApplyRules}
            pinnedAction={settings.iconClickPinnedAction}
            savedApplyRules={savedSettings.iconClickApplyRules}
            savedPinnedAction={savedSettings.iconClickPinnedAction}
            onApplyRulesChange={(value) => updateSetting('iconClickApplyRules', value)}
            onPinnedActionChange={(value) => updateSetting('iconClickPinnedAction', value)}
          />
        </SettingsSection>

        {/* 自動収納設定 */}
        <SettingsSection
          icon="⏰"
          title={t('settings.autoClose.title')}
          description={t('settings.autoClose.description')}
        >
          <AutoCloseSettings
            enabled={settings.autoCloseEnabled}
            seconds={settings.autoCloseSeconds}
            rules={settings.autoCloseRules}
            ruleOrder={settings.autoCloseRuleOrder}
            savedEnabled={savedSettings.autoCloseEnabled}
            savedSeconds={savedSettings.autoCloseSeconds}
            onEnabledChange={(value) => updateSetting('autoCloseEnabled', value)}
            onSecondsChange={(value) => updateSetting('autoCloseSeconds', value)}
            onRulesChange={(value) => updateSetting('autoCloseRules', value)}
            onRuleOrderChange={(value) => updateSetting('autoCloseRuleOrder', value)}
          />
        </SettingsSection>

        {/* タブ復元設定 */}
        <SettingsSection
          icon="📂"
          title={t('settings.restore.title')}
          description={t('settings.restore.description')}
        >
          <RestoreSettings
            mode={settings.restoreMode}
            intervalMs={settings.restoreIntervalMs}
            savedMode={savedSettings.restoreMode}
            savedIntervalMs={savedSettings.restoreIntervalMs}
            onModeChange={(value) => updateSetting('restoreMode', value)}
            onIntervalChange={(value) => updateSetting('restoreIntervalMs', value)}
          />
        </SettingsSection>

        {/* リンクチェック設定 */}
        <SettingsSection
          icon="🔗"
          title={t('linkCheck.settings.title')}
          description={t('linkCheck.settings.rulesHint')}
        >
          <LinkCheckSettings
            rules={settings.linkCheckRules}
            timeoutMs={settings.linkCheckTimeoutMs}
            concurrency={settings.linkCheckConcurrency}
            domainConcurrency={settings.linkCheckDomainConcurrency}
            domainDelayMs={settings.linkCheckDomainDelayMs}
            useGetFallback={settings.linkCheckUseGetFallback}
            onRulesChange={(value) => updateSetting('linkCheckRules', value)}
            onTimeoutChange={(value) => updateSetting('linkCheckTimeoutMs', value)}
            onConcurrencyChange={(value) => updateSetting('linkCheckConcurrency', value)}
            onDomainConcurrencyChange={(value) => updateSetting('linkCheckDomainConcurrency', value)}
            onDomainDelayChange={(value) => updateSetting('linkCheckDomainDelayMs', value)}
            onUseGetFallbackChange={(value) => updateSetting('linkCheckUseGetFallback', value)}
          />
        </SettingsSection>

        {/* バックアップ設定 */}
        <SettingsSection
          icon="📀"
          title={t('settings.backup.title')}
          description={t('settings.backup.description')}
        >
          <BackupSettings
            enabled={settings.autoBackupEnabled}
            intervalPreset={settings.autoBackupIntervalPreset}
            intervalMinutes={settings.autoBackupIntervalMinutes}
            keepCount={settings.autoBackupKeepCount}
            savedEnabled={savedSettings.autoBackupEnabled}
            savedIntervalPreset={savedSettings.autoBackupIntervalPreset}
            savedIntervalMinutes={savedSettings.autoBackupIntervalMinutes}
            savedKeepCount={savedSettings.autoBackupKeepCount}
            onEnabledChange={(value) => updateSetting('autoBackupEnabled', value)}
            onIntervalPresetChange={(value) => updateSetting('autoBackupIntervalPreset', value)}
            onIntervalMinutesChange={(value) => updateSetting('autoBackupIntervalMinutes', value)}
            onKeepCountChange={(value) => updateSetting('autoBackupKeepCount', value)}
          />
        </SettingsSection>

        {/* 保存ボタンはフッターに移動 */}
      </form>

      <SettingsSection
        icon={<Tag size={20} />} // Lucide icon import needed? App already imports alert/Folder. Need Tag.
        title={t('settings.domainGroups.title')}
        description={t('settings.domainGroups.description')}
      >
        <DomainGroupSettings
          aliases={settings.domainGroupAliases || {}}
          onAliasesChange={(newAliases) => updateSetting('domainGroupAliases', newAliases)}
        />
      </SettingsSection>

      <SettingsSection
        icon={<Folder size={20} />}
        title={t('settings.customGroups.title')}
        description={t('settings.customGroups.description')}
      >
        <CustomGroupSettings
          showGroupedTabsInDomainGroups={settings.showGroupedTabsInDomainGroups}
          onShowGroupedTabsInDomainGroupsChange={(value) => updateSetting('showGroupedTabsInDomainGroups', value)}
        />
      </SettingsSection>

      {/* ピン留めドメイングループ設定 */}
      <SettingsSection
        icon={<Pin size={20} />}
        title={t('settings.pinnedDomainGroups.title')}
        description={t('settings.pinnedDomainGroups.description')}
      >
        <PinnedDomainGroupSettings
          pinnedDomainGroups={settings.pinnedDomainGroups || []}
          domainGroupAliases={settings.domainGroupAliases || {}}
          onReorder={(newOrder) => updateSetting('pinnedDomainGroups', newOrder)}
          onUnpin={(domain) => {
            const newPinned = (settings.pinnedDomainGroups || []).filter(d => d !== domain);
            updateSetting('pinnedDomainGroups', newPinned);
          }}
        />
      </SettingsSection>

      {/* データ管理セクション */}
      <DataManagement onSettingsImported={reload} />

      {/* フッター (Fixed) */}
      <div className="fixed-footer">
        <div className="fixed-footer-content">
          <div className="footer-left">
            <span className="version-info">TabBurrow v{browser.runtime.getManifest().version}</span>
            <a href="credits.html" className="credits-link">{t('credits.headerTitle')}</a>
          </div>
          <div className="footer-right">
            <span className={`save-status ${saveStatus === 'error' ? 'error' : ''}`}>
              {getStatusMessage()}
            </span>
            <button
              type="submit"
              form="settingsForm"
              className="btn btn-primary"
              disabled={!hasChanges || saveStatus === 'saving'}
            >
              <span>💾</span>
              <span>{t('settings.updateButton')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 未保存警告ダイアログ */}
      <Dialog
        isOpen={showUnsavedWarning}
        onClose={() => setShowUnsavedWarning(false)}
        title={t('settings.unsavedWarning.title')}
        icon={<AlertTriangle className="alert-icon-warning" />}
        width={520}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowUnsavedWarning(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-danger" onClick={handleLeaveWithoutSaving}>
              {t('settings.unsavedWarning.leaveWithoutSaving')}
            </button>
            <button className="btn btn-primary" onClick={handleSaveAndLeave}>
              {t('settings.unsavedWarning.saveAndLeave')}
            </button>
          </>
        }
      >
        {t('settings.unsavedWarning.message')}
      </Dialog>
    </Layout>
  );
}

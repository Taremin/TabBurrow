/**
 * TabBurrow - 設定画面メインコンポーネント
 */

import { useState, useCallback } from 'react';
import browser from '../browserApi';
import { useTranslation } from '../common/i18nContext';
import { useSettings } from './hooks/useSettings';
import { SettingsSection } from './components/SettingsSection';
import { LanguageSettings } from './components/LanguageSettings';
import { AppearanceSettings } from './components/AppearanceSettings';
import { ViewModeSettings } from './components/ViewModeSettings';
import { SortSettings } from './components/SortSettings';
import { AutoCloseSettings } from './components/AutoCloseSettings';
import { UrlNormalizationSettings } from './components/UrlNormalizationSettings';
import { IconClickSettings } from './components/IconClickSettings';
import { RestoreSettings } from './components/RestoreSettings';
import { LinkCheckSettings } from './components/LinkCheckSettings';
import { BackupSettings } from './components/BackupSettings';
import { ScreenshotSettings } from './components/ScreenshotSettings';
import { TrashSettings } from './components/TrashSettings';
import { DataManagement } from './components/DataManagement';
import { CustomGroupSettings } from './components/CustomGroupSettings';
import { DomainGroupSettings } from './components/DomainGroupSettings';
import { PinnedDomainGroupSettings } from './components/PinnedDomainGroupSettings';
import { Dialog } from '../common/Dialog';
import { Layout } from '../common/Layout';
import { AlertTriangle, Folder, Tag, Pin, Heart } from 'lucide-react';

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
          dataTestId="language-section"
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
          dataTestId="appearance-section"
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
          dataTestId="view-mode-section"
        >
          <ViewModeSettings
            viewMode={settings.defaultViewMode}
            displayDensity={settings.defaultDisplayDensity}
            maximizeWidth={settings.maximizeWidth}
            savedViewMode={savedSettings.defaultViewMode}
            savedDisplayDensity={savedSettings.defaultDisplayDensity}
            savedMaximizeWidth={savedSettings.maximizeWidth}
            onViewModeChange={(value) => updateSetting('defaultViewMode', value)}
            onDisplayDensityChange={(value) => updateSetting('defaultDisplayDensity', value)}
            onMaximizeWidthChange={(value) => updateSetting('maximizeWidth', value)}
          />
        </SettingsSection>

        {/* ソート順設定 */}
        <SettingsSection
          icon="🔢"
          title={t('settings.sort.title')}
          description={t('settings.sort.description')}
          dataTestId="sort-section"
        >
          <SortSettings
            groupSort={settings.groupSort}
            itemSort={settings.itemSort}
            customSortKeyOrder={settings.customSortKeyOrder}
            savedGroupSort={savedSettings.groupSort}
            savedItemSort={savedSettings.itemSort}
            savedCustomSortKeyOrder={savedSettings.customSortKeyOrder}
            onGroupSortChange={(value) => updateSetting('groupSort', value)}
            onItemSortChange={(value) => updateSetting('itemSort', value)}
            onCustomSortKeyOrderChange={(value) => updateSetting('customSortKeyOrder', value)}
          />
        </SettingsSection>

        {/* アイコンクリック設定 */}
        <SettingsSection
          icon="👁"
          title={t('settings.iconClick.title')}
          description={t('settings.iconClick.description')}
          dataTestId="icon-click-section"
        >
          <IconClickSettings
            applyRules={settings.iconClickApplyRules}
            pinnedAction={settings.iconClickPinnedAction}
            pinTabManager={settings.pinTabManager}
            savedApplyRules={savedSettings.iconClickApplyRules}
            savedPinnedAction={savedSettings.iconClickPinnedAction}
            savedPinTabManager={savedSettings.pinTabManager}
            onApplyRulesChange={(value) => updateSetting('iconClickApplyRules', value)}
            onPinnedActionChange={(value) => updateSetting('iconClickPinnedAction', value)}
            onPinTabManagerChange={(value) => updateSetting('pinTabManager', value)}
          />
        </SettingsSection>

        {/* 自動収納設定 */}
        <SettingsSection
          icon="⏰"
          title={t('settings.autoClose.title')}
          description={t('settings.autoClose.description')}
          dataTestId="auto-close-section"
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
        
        {/* URL正規化設定 */}
        <SettingsSection
          icon="🔗"
          title={t('settings.urlNormalization.title')}
          description={t('settings.urlNormalization.description')}
          dataTestId="url-normalization-section"
        >
          <UrlNormalizationSettings
            enabled={settings.urlNormalizationEnabled}
            rules={settings.urlNormalizationRules}
            savedEnabled={savedSettings.urlNormalizationEnabled}
            onEnabledChange={(value) => updateSetting('urlNormalizationEnabled', value)}
            onRulesChange={(value) => updateSetting('urlNormalizationRules', value)}
          />
        </SettingsSection>

        {/* タブ復元設定 */}
        <SettingsSection
          icon="📂"
          title={t('settings.restore.title')}
          description={t('settings.restore.description')}
          dataTestId="restore-section"
        >
          <RestoreSettings
            mode={settings.restoreMode}
            intervalMs={settings.restoreIntervalMs}
            savedMode={savedSettings.restoreMode}
            savedIntervalMs={savedSettings.restoreIntervalMs}
            returnFocus={settings.returnFocusToTabManager}
            savedReturnFocus={savedSettings.returnFocusToTabManager}
            onModeChange={(value) => updateSetting('restoreMode', value)}
            onIntervalChange={(value) => updateSetting('restoreIntervalMs', value)}
            onReturnFocusChange={(value) => updateSetting('returnFocusToTabManager', value)}
          />
        </SettingsSection>

        {/* リンクチェック設定 */}
        <SettingsSection
          icon="🔗"
          title={t('linkCheck.settings.title')}
          description={t('linkCheck.settings.rulesHint')}
          dataTestId="link-check-section"
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
          dataTestId="backup-section"
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
        
        {/* スクリーンショット設定 */}
        <SettingsSection
          icon="📸"
          title={t('settings.screenshot.title')}
          description={t('settings.screenshot.description')}
          dataTestId="screenshot-section"
        >
          <ScreenshotSettings
            enabled={settings.screenshotEnabled}
            intervalMinutes={settings.screenshotUpdateIntervalMinutes}
            savedEnabled={savedSettings.screenshotEnabled}
            savedIntervalMinutes={savedSettings.screenshotUpdateIntervalMinutes}
            onEnabledChange={(value) => updateSetting('screenshotEnabled', value)}
            onIntervalMinutesChange={(value) => updateSetting('screenshotUpdateIntervalMinutes', value)}
          />
        </SettingsSection>

        {/* ゴミ箱設定 */}
        <SettingsSection
          icon="🗑️"
          title={t('settings.trash.title')}
          description={t('settings.trash.retentionDaysDescription')}
          dataTestId="trash-section"
        >
          <TrashSettings
            trashRetentionDays={settings.trashRetentionDays}
            onTrashRetentionDaysChange={(value) => updateSetting('trashRetentionDays', value)}
          />
        </SettingsSection>

        {/* 保存ボタンはフッターに移動 */}
      </form>

      <SettingsSection
        icon={<Tag size={20} />} // Lucide icon import needed? App already imports alert/Folder. Need Tag.
        title={t('settings.domainGroups.title')}
        description={t('settings.domainGroups.description')}
        dataTestId="domain-groups-section"
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
        dataTestId="custom-groups-section"
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
        dataTestId="pinned-domain-groups-section"
      >
      <PinnedDomainGroupSettings
          pinnedDomainGroups={settings.pinnedDomainGroups || []}
          domainGroupAliases={settings.domainGroupAliases || {}}
          onReorder={(newOrder) => updateSetting('pinnedDomainGroups', newOrder)}
          onUnpin={(domain) => {
            const newPinned = (settings.pinnedDomainGroups || []).filter(p => p.domain !== domain);
            updateSetting('pinnedDomainGroups', newPinned);
          }}
          onColorChange={(domain, color) => {
            const newPinned = (settings.pinnedDomainGroups || []).map(p =>
              p.domain === domain ? { ...p, color } : p
            );
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
            <a href="credits.html" className="credits-link">
              <Heart size={14} className="credits-icon" />
              <span>{t('credits.headerTitle')}</span>
            </a>
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

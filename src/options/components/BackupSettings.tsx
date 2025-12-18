/**
 * TabBurrow - バックアップ設定コンポーネント
 */

import { useState, useEffect, useCallback } from 'react';
import browser from '../../browserApi.js';
import { useTranslation } from '../../common/i18nContext.js';
import type { BackupIntervalPreset } from '../../settings.js';
import type { BackupRecord } from '../../dbSchema.js';

interface BackupSettingsProps {
  enabled: boolean;
  intervalPreset: BackupIntervalPreset;
  intervalMinutes: number;
  keepCount: number;
  savedEnabled: boolean;
  savedIntervalPreset: BackupIntervalPreset;
  savedIntervalMinutes: number;
  savedKeepCount: number;
  onEnabledChange: (value: boolean) => void;
  onIntervalPresetChange: (value: BackupIntervalPreset) => void;
  onIntervalMinutesChange: (value: number) => void;
  onKeepCountChange: (value: number) => void;
}

// バックアップメタデータ（tabsを除いた軽量版）
type BackupMetadata = Omit<BackupRecord, 'tabs'>;

// メッセージレスポンスの型
interface BackupListResponse {
  success: boolean;
  backups?: BackupMetadata[];
}

interface BackupRestoreResponse {
  success: boolean;
  restored?: number;
  skipped?: number;
  error?: string;
}

export function BackupSettings({
  enabled,
  intervalPreset,
  intervalMinutes,
  keepCount,
  savedEnabled,
  savedIntervalPreset,
  savedIntervalMinutes,
  savedKeepCount,
  onEnabledChange,
  onIntervalPresetChange,
  onIntervalMinutesChange,
  onKeepCountChange,
}: BackupSettingsProps) {
  const { t } = useTranslation();
  
  // バックアップ一覧
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 復元ダイアログ
  const [restoreDialog, setRestoreDialog] = useState<{
    isOpen: boolean;
    backupId: string;
    date: string;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  
  // バックアップ一覧を取得
  const loadBackups = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'backup-list' }) as BackupListResponse;
      if (response?.success && response.backups) {
        setBackups(response.backups);
      }
    } catch (error) {
      console.error('バックアップ一覧の取得に失敗:', error);
    }
  }, []);
  
  // 初回読み込み
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);
  
  // 手動バックアップ
  const handleManualBackup = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await browser.runtime.sendMessage({ type: 'backup-create' });
      setMessage({ type: 'success', text: t('settings.backup.backupSuccess') });
      await loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [loadBackups, t]);
  
  // バックアップ削除
  const handleDelete = useCallback(async (backupId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await browser.runtime.sendMessage({ type: 'backup-delete', backupId });
      setMessage({ type: 'success', text: t('settings.backup.deleteSuccess') });
      await loadBackups();
    } catch (error) {
      setMessage({ type: 'error', text: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [loadBackups, t]);
  
  // バックアップエクスポート
  const handleExport = useCallback(async (backupId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await browser.runtime.sendMessage({ type: 'backup-download', backupId });
      setMessage({ type: 'success', text: t('settings.backup.exportSuccess') });
    } catch (error) {
      setMessage({ type: 'error', text: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  
  // 復元ダイアログを開く
  const openRestoreDialog = useCallback((backupId: string, createdAt: number) => {
    const date = new Date(createdAt).toLocaleString();
    setRestoreDialog({ isOpen: true, backupId, date });
    setRestoreMode('merge');
  }, []);
  
  // 復元を実行
  const handleRestore = useCallback(async () => {
    if (!restoreDialog) return;
    
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: 'backup-restore',
        backupId: restoreDialog.backupId,
        mode: restoreMode,
      }) as BackupRestoreResponse;
      if (response?.success) {
        setMessage({
          type: 'success',
          text: t('settings.backup.restoreSuccess', {
            restored: response.restored ?? 0,
            skipped: response.skipped ?? 0,
          }),
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error) });
    } finally {
      setIsLoading(false);
      setRestoreDialog(null);
    }
  }, [restoreDialog, restoreMode, t]);
  
  // 日時フォーマット
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      {/* 有効/無効チェックボックス */}
      <div className="form-group">
        <label className={`form-checkbox-label ${enabled !== savedEnabled ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="autoBackupEnabled"
            className="form-checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.backup.enableLabel')}</span>
        </label>
      </div>

      {/* 詳細設定 */}
      <div className={`form-group backup-settings ${enabled ? 'enabled' : ''}`}>
        {/* バックアップ間隔 */}
        <label className="form-label">{t('settings.backup.intervalLabel')}</label>
        <div className="input-group">
          <select
            id="backupIntervalPreset"
            className={`form-select ${intervalPreset !== savedIntervalPreset ? 'modified' : ''}`}
            value={intervalPreset}
            onChange={(e) => onIntervalPresetChange(e.target.value as BackupIntervalPreset)}
          >
            <option value="off">{t('settings.backup.interval.off')}</option>
            <option value="1h">{t('settings.backup.interval.1h')}</option>
            <option value="6h">{t('settings.backup.interval.6h')}</option>
            <option value="12h">{t('settings.backup.interval.12h')}</option>
            <option value="24h">{t('settings.backup.interval.24h')}</option>
            <option value="custom">{t('settings.backup.interval.custom')}</option>
          </select>
          
          {intervalPreset === 'custom' && (
            <div className="custom-interval-input">
              <input
                type="number"
                id="backupIntervalMinutes"
                className={`form-input ${intervalMinutes !== savedIntervalMinutes ? 'modified' : ''}`}
                min={1}
                max={10080}
                step={1}
                value={intervalMinutes}
                onChange={(e) => onIntervalMinutesChange(parseInt(e.target.value, 10) || 1440)}
              />
              <span className="input-suffix">{t('settings.backup.customIntervalLabel')}</span>
            </div>
          )}
        </div>

        {/* 世代数 */}
        <label htmlFor="backupKeepCount" className="form-label">
          {t('settings.backup.keepCountLabel')}
        </label>
        <div className="input-group">
          <input
            type="number"
            id="backupKeepCount"
            className={`form-input ${keepCount !== savedKeepCount ? 'modified' : ''}`}
            min={-1}
            max={100}
            step={1}
            value={keepCount}
            onChange={(e) => onKeepCountChange(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="form-hint">{t('settings.backup.keepCountHint')}</div>

        {/* 手動バックアップボタン */}
        <div className="backup-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleManualBackup}
            disabled={isLoading}
          >
            <span>💾</span>
            <span>{t('settings.backup.manualBackup')}</span>
          </button>
        </div>
        
        {/* メッセージ */}
        {message && (
          <div className={`backup-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* バックアップ履歴 */}
        <div className="backup-history">
          <h4 className="backup-history-title">{t('settings.backup.backupList')}</h4>
          
          {backups.length === 0 ? (
            <p className="backup-empty">{t('settings.backup.noBackups')}</p>
          ) : (
            <ul className="backup-list">
              {backups.map((backup) => (
                <li key={backup.id} className="backup-item">
                  <div className="backup-info">
                    <span className="backup-date">{formatDate(backup.createdAt)}</span>
                    <span className="backup-count">
                      ({t('settings.backup.tabCount', { count: backup.tabCount })})
                    </span>
                  </div>
                  <div className="backup-actions">
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => openRestoreDialog(backup.id, backup.createdAt)}
                      disabled={isLoading}
                    >
                      {t('settings.backup.restore')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => handleExport(backup.id)}
                      disabled={isLoading}
                    >
                      {t('settings.backup.export')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(backup.id)}
                      disabled={isLoading}
                    >
                      {t('settings.backup.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 復元ダイアログ */}
      {restoreDialog?.isOpen && (
        <div className="dialog-overlay" onClick={() => setRestoreDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">{t('settings.backup.restoreDialogTitle')}</h3>
            </div>
            <div className="dialog-content">
              <p>{t('settings.backup.restoreDialogMessage', { date: restoreDialog.date })}</p>
              
              <div className="form-group">
                <label className="form-radio-label">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                  />
                  <span className="radio-custom"></span>
                  <span>{t('settings.backup.restoreMode.merge')}</span>
                </label>
                <label className="form-radio-label">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="overwrite"
                    checked={restoreMode === 'overwrite'}
                    onChange={() => setRestoreMode('overwrite')}
                  />
                  <span className="radio-custom"></span>
                  <span>{t('settings.backup.restoreMode.overwrite')}</span>
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRestoreDialog(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRestore}
                disabled={isLoading}
              >
                {t('settings.backup.restore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

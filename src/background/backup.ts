/**
 * backup.ts - バックアップ機能
 * 定期的なタブ情報のバックアップを担当
 */

import browser from '../browserApi.js';
import type { Alarms } from 'webextension-polyfill';
import { getSettings, getBackupIntervalMinutes } from '../settings.js';
import { createBackup, pruneOldBackups } from '../backupStorage.js';

// アラーム名
const BACKUP_ALARM_NAME = 'auto-backup';

/**
 * 自動バックアップを初期化
 * - 設定に基づいてアラームを設定
 */
export async function initAutoBackup(): Promise<void> {
  const settings = await getSettings();
  
  // 既存のアラームを確認
  const existingAlarm = await browser.alarms.get(BACKUP_ALARM_NAME);
  
  if (!settings.autoBackupEnabled) {
    if (existingAlarm) {
      await browser.alarms.clear(BACKUP_ALARM_NAME);
      console.log('[Backup] 自動バックアップを無効化しました');
    }
    return;
  }
  
  const intervalMinutes = getBackupIntervalMinutes(settings);
  
  if (intervalMinutes <= 0) {
    if (existingAlarm) {
      await browser.alarms.clear(BACKUP_ALARM_NAME);
    }
    console.log('[Backup] バックアップ間隔が0以下のため、アラームを設定しません');
    return;
  }
  
  // べき等性の確保: 間隔が変わっていない場合は再作成しない
  if (existingAlarm && existingAlarm.periodInMinutes === intervalMinutes) {
    console.log(`[Backup] 既存のバックアップアラームを維持します (${intervalMinutes}分ごと)`);
    return;
  }
  
  // アラームを設定（再設定が必要な場合のみ）
  await browser.alarms.clear(BACKUP_ALARM_NAME);
  await browser.alarms.create(BACKUP_ALARM_NAME, {
    delayInMinutes: intervalMinutes,
    periodInMinutes: intervalMinutes,
  });
  
  const nextFireTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
  console.log(`[Backup] 自動バックアップを設定しました: ${intervalMinutes}分ごと（次回実行: ${nextFireTime.toLocaleTimeString()}）`);
}

/**
 * アラーム発火時の処理
 */
export async function handleBackupAlarm(alarm: Alarms.Alarm): Promise<void> {
  if (alarm.name !== BACKUP_ALARM_NAME) {
    return;
  }
  
  const now = new Date();
  console.log(`[Backup] バックアップアラームが発火しました（${now.toLocaleTimeString()}）`);
  
  try {
    await triggerBackup();
  } catch (error) {
    console.error('[Backup] バックアップに失敗しました:', error);
  }
}

/**
 * バックアップを実行（アラーム経由または手動）
 */
export async function triggerBackup(): Promise<void> {
  const settings = await getSettings();
  
  // 世代数が0の場合はバックアップしない
  if (settings.autoBackupKeepCount === 0) {
    console.log('[Backup] 世代数が0のため、バックアップをスキップします');
    return;
  }
  
  console.log('[Backup] バックアップを開始します...');
  
  // バックアップを作成
  const backup = await createBackup();
  console.log(`[Backup] バックアップを作成しました: ${backup.id} (${backup.tabCount}タブ)`);
  
  // 古いバックアップを削除（世代管理）
  await pruneOldBackups(settings.autoBackupKeepCount);
  console.log(`[Backup] 世代管理を実行しました (保持数: ${settings.autoBackupKeepCount})`);
}

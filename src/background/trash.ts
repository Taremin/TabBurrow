/**
 * TabBurrow - ゴミ箱クリーンアップ処理
 * 期限切れのゴミ箱タブを自動的に削除
 */

import browser from '../browserApi';
import { getSettings } from '../settings';
import { deleteExpiredTrash } from '../storage';

// 専用のアラーム名
const TRASH_CLEANUP_ALARM = 'trash-cleanup';

/**
 * ゴミ箱クリーンアップの初期化
 * 24時間ごとにクリーンアップを実行
 */
export async function initTrashCleanup(): Promise<void> {
  // 既存のアラームを確認
  const existingAlarm = await browser.alarms.get(TRASH_CLEANUP_ALARM);
  
  if (!existingAlarm) {
    // 新しいアラームを作成
    await browser.alarms.create(TRASH_CLEANUP_ALARM, {
      periodInMinutes: 24 * 60, // 24時間ごと
      delayInMinutes: 1,        // 起動1分後に初回実行
    });
    console.log('[ゴミ箱] クリーンアップアラームを設定しました');
  }
}

/**
 * ゴミ箱クリーンアップのアラームハンドラー
 */
export async function handleTrashCleanupAlarm(alarmName: string): Promise<void> {
  if (alarmName !== TRASH_CLEANUP_ALARM) return;
  
  const settings = await getSettings();
  
  // 保持期間が0日の場合はクリーンアップ不要（即時削除モード）
  if (settings.trashRetentionDays === 0) {
    console.log('[ゴミ箱] クリーンアップスキップ（即時削除モード）');
    return;
  }
  
  try {
    const deletedCount = await deleteExpiredTrash(settings.trashRetentionDays);
    if (deletedCount > 0) {
      console.log(`[ゴミ箱] 期限切れの ${deletedCount} タブを完全削除`);
    }
  } catch (error) {
    console.error('[ゴミ箱] クリーンアップに失敗:', error);
  }
}

/**
 * アラーム名を取得（テスト用）
 */
export function getTrashCleanupAlarmName(): string {
  return TRASH_CLEANUP_ALARM;
}

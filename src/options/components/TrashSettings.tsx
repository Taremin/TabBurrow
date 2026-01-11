/**
 * TabBurrow - ゴミ箱設定コンポーネント
 * ゴミ箱の保持期間設定とゴミ箱を空にするボタンを提供
 */

import { useTranslation } from '../../common/i18nContext';
import { emptyTrash } from '../../storage';

interface TrashSettingsProps {
  trashRetentionDays: number;
  onTrashRetentionDaysChange: (days: number) => void;
}

export function TrashSettings({
  trashRetentionDays,
  onTrashRetentionDaysChange,
}: TrashSettingsProps) {
  const { t } = useTranslation();

  const handleEmptyTrash = async () => {
    if (window.confirm(t('tabManager.trash.emptyTrashConfirm'))) {
      await emptyTrash();
    }
  };

  return (
    <div className="settings-content">
      <div className="settings-row">
        <label className="settings-label" htmlFor="trash-retention-days">
          {t('settings.trash.retentionDays')}
        </label>
        <div className="settings-input-group">
          <input
            type="range"
            id="trash-retention-days"
            min="0"
            max="90"
            value={trashRetentionDays}
            onChange={(e) => onTrashRetentionDaysChange(Number(e.target.value))}
            className="form-range"
          />
          <span className="settings-value">
            {trashRetentionDays === 0 ? (
              <span className="text-muted">無効</span>
            ) : (
              <span>{trashRetentionDays}日</span>
            )}
          </span>
        </div>
      </div>

      <div className="settings-row">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={handleEmptyTrash}
        >
          {t('settings.trash.emptyNow')}
        </button>
      </div>
    </div>
  );
}

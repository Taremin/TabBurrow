/**
 * TabBurrow - 日時範囲フィルターコンポーネント
 */

import { memo, useCallback, useMemo } from 'react';
import type { DateRangeFilter } from './types';
import { useTranslation } from '../common/i18nContext';

interface DateRangeFilterProps {
  dateRange: DateRangeFilter;
  onDateRangeChange: (range: DateRangeFilter) => void;
}

// 日付をYYYY-MM-DD形式にフォーマット
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// プリセット用の日付範囲を取得
function getPresetRange(preset: 'today' | 'week' | 'month' | 'threeMonths' | 'all'): DateRangeFilter {
  const now = new Date();
  const today = formatDate(now);
  
  switch (preset) {
    case 'today': {
      return { startDate: today, endDate: today };
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { startDate: formatDate(weekAgo), endDate: today };
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { startDate: formatDate(monthAgo), endDate: today };
    }
    case 'threeMonths': {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return { startDate: formatDate(threeMonthsAgo), endDate: today };
    }
    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
}

export const DateRangeFilterComponent = memo(function DateRangeFilterComponent({
  dateRange,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const { t } = useTranslation();

  // フィルターが有効かどうか
  const hasActiveFilter = useMemo(() => {
    return dateRange.startDate !== null || dateRange.endDate !== null;
  }, [dateRange]);

  // 開始日変更ハンドラー
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null;
    onDateRangeChange({ ...dateRange, startDate: value });
  }, [dateRange, onDateRangeChange]);

  // 終了日変更ハンドラー
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null;
    onDateRangeChange({ ...dateRange, endDate: value });
  }, [dateRange, onDateRangeChange]);

  // プリセットボタンハンドラー
  const handlePreset = useCallback((preset: 'today' | 'week' | 'month' | 'threeMonths' | 'all') => {
    onDateRangeChange(getPresetRange(preset));
  }, [onDateRangeChange]);

  // フィルタークリアハンドラー
  const handleClear = useCallback(() => {
    onDateRangeChange({ startDate: null, endDate: null });
  }, [onDateRangeChange]);

  return (
    <div className="date-filter-container">
      <div className="date-filter-presets">
        <button
          type="button"
          className={`date-preset-btn ${dateRange.startDate === formatDate(new Date()) && dateRange.endDate === formatDate(new Date()) ? 'active' : ''}`}
          onClick={() => handlePreset('today')}
        >
          {t('tabManager.dateFilter.presets.today')}
        </button>
        <button
          type="button"
          className="date-preset-btn"
          onClick={() => handlePreset('week')}
        >
          {t('tabManager.dateFilter.presets.week')}
        </button>
        <button
          type="button"
          className="date-preset-btn"
          onClick={() => handlePreset('month')}
        >
          {t('tabManager.dateFilter.presets.month')}
        </button>
        <button
          type="button"
          className="date-preset-btn"
          onClick={() => handlePreset('threeMonths')}
        >
          {t('tabManager.dateFilter.presets.threeMonths')}
        </button>
        <button
          type="button"
          className={`date-preset-btn ${!hasActiveFilter ? 'active' : ''}`}
          onClick={() => handlePreset('all')}
        >
          {t('tabManager.dateFilter.presets.all')}
        </button>
      </div>
      <div className="date-filter-inputs">
        <div className="date-input-group">
          <label htmlFor="startDate" className="date-label">
            {t('tabManager.dateFilter.startDate')}
          </label>
          <input
            type="date"
            id="startDate"
            className="date-input"
            value={dateRange.startDate || ''}
            onChange={handleStartDateChange}
            max={dateRange.endDate || undefined}
          />
        </div>
        <span className="date-separator">〜</span>
        <div className="date-input-group">
          <label htmlFor="endDate" className="date-label">
            {t('tabManager.dateFilter.endDate')}
          </label>
          <input
            type="date"
            id="endDate"
            className="date-input"
            value={dateRange.endDate || ''}
            onChange={handleEndDateChange}
            min={dateRange.startDate || undefined}
          />
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            className="date-clear-btn"
            onClick={handleClear}
            title={t('tabManager.dateFilter.clearFilter')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
});

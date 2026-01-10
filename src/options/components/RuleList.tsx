/**
 * TabBurrow - ルール一覧コンポーネント
 */

import { useTranslation } from '../../common/i18nContext';
import type { AutoCloseRule } from '../../settings';

interface RuleListProps {
  rules: AutoCloseRule[];
  onToggle: (ruleId: string) => void;
  onEdit: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
}

export function RuleList({ rules, onToggle, onEdit, onDelete }: RuleListProps) {
  const { t } = useTranslation();

  // 対象タイプのラベル
  const getTargetTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      domain: t('settings.autoClose.targetType.domain'),
      url: t('settings.autoClose.targetType.url'),
      fullUrl: t('settings.autoClose.targetType.fullUrl'),
      title: t('settings.autoClose.targetType.title'),
    };
    return labels[type] || type;
  };

  // 動作のラベル
  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      exclude: t('settings.autoClose.action.exclude'),
      saveToGroup: t('settings.autoClose.action.saveToGroup'),
      saveOnly: t('settings.autoClose.action.saveOnly'),
      close: t('settings.autoClose.action.close'),
      pin: t('settings.autoClose.action.pin'),
    };
    return labels[action] || action;
  };

  if (rules.length === 0) {
    return (
      <div className="rules-empty">
        {t('settings.autoClose.noRules')}
      </div>
    );
  }

  return (
    <div className="rules-list">
      {rules.map(rule => (
        <div
          key={rule.id}
          className={`rule-item ${rule.enabled ? '' : 'disabled'}`}
        >
          <div className="rule-toggle">
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={() => onToggle(rule.id)}
            />
          </div>
          <div className="rule-info">
            <div className="rule-name">{rule.name || rule.pattern}</div>
            <div className="rule-details">
              <span>{getTargetTypeLabel(rule.targetType)}</span>
              <span>{getActionLabel(rule.action)}</span>
              {rule.targetGroup && <span>→ {rule.targetGroup}</span>}
            </div>
          </div>
          <div className="rule-actions">
            <button
              type="button"
              className="btn-edit"
              onClick={() => onEdit(rule.id)}
            >
              編集
            </button>
            <button
              type="button"
              className="btn-delete"
              onClick={() => onDelete(rule.id)}
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * TabBurrow - 自動収納設定コンポーネント
 */

import { useState, useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext.js';
import type { AutoCloseRule, RuleOrderType } from '../../settings.js';
import { RuleList } from './RuleList.js';
import { RuleDialog } from './RuleDialog.js';

interface AutoCloseSettingsProps {
  enabled: boolean;
  seconds: number;
  rules: AutoCloseRule[];
  ruleOrder: RuleOrderType;
  savedEnabled: boolean;
  savedSeconds: number;
  onEnabledChange: (value: boolean) => void;
  onSecondsChange: (value: number) => void;
  onRulesChange: (value: AutoCloseRule[]) => void;
  onRuleOrderChange: (value: RuleOrderType) => void;
}

export function AutoCloseSettings({
  enabled,
  seconds,
  rules,
  ruleOrder,
  savedEnabled,
  savedSeconds,
  onEnabledChange,
  onSecondsChange,
  onRulesChange,
  onRuleOrderChange,
}: AutoCloseSettingsProps) {
  const { t } = useTranslation();
  
  // ダイアログ状態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoCloseRule | null>(null);

  // ルール追加ダイアログを開く
  const handleAddRule = useCallback(() => {
    setEditingRule(null);
    setIsDialogOpen(true);
  }, []);

  // ルール編集ダイアログを開く
  const handleEditRule = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setEditingRule(rule);
      setIsDialogOpen(true);
    }
  }, [rules]);

  // ルールの有効/無効を切り替え
  const handleToggleRule = useCallback((ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルールを削除
  const handleDeleteRule = useCallback((ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  // ルールを保存（追加または更新）
  const handleSaveRule = useCallback((rule: AutoCloseRule) => {
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      // 更新
      const updatedRules = [...rules];
      updatedRules[existingIndex] = rule;
      onRulesChange(updatedRules);
    } else {
      // 追加
      onRulesChange([...rules, rule]);
    }
  }, [rules, onRulesChange]);

  // ダイアログを閉じる
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingRule(null);
  }, []);

  return (
    <>
      {/* 有効/無効チェックボックス */}
      <div className="form-group">
        <label className={`form-checkbox-label ${enabled !== savedEnabled ? 'modified' : ''}`}>
          <input
            type="checkbox"
            id="autoCloseEnabled"
            className="form-checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span>{t('settings.autoClose.enableLabel')}</span>
        </label>
      </div>

      {/* 詳細設定（有効時のみ操作可能） */}
      <div className={`form-group auto-close-settings ${enabled ? 'enabled' : ''}`}>
        {/* 非アクティブ時間 */}
        <label htmlFor="autoCloseSeconds" className="form-label">
          {t('settings.autoClose.secondsLabel')}
        </label>
        <div className="input-group">
          <input
            type="number"
            id="autoCloseSeconds"
            className={`form-input ${seconds !== savedSeconds ? 'modified' : ''}`}
            min={30}
            max={86400}
            step={1}
            value={seconds}
            onChange={(e) => onSecondsChange(parseInt(e.target.value, 10) || 300)}
          />
          <span className="input-suffix">{t('settings.autoClose.seconds')}</span>
        </div>
        <div className="form-hint">{t('settings.autoClose.hint')}</div>

        {/* ルール管理 */}
        <div className="rules-section">
          <h3 className="rules-title">{t('settings.autoClose.rulesTitle')}</h3>
          <p className="rules-description">{t('settings.autoClose.rulesDescription')}</p>

          <div className="rules-header">
            <div className="rule-order-select">
              <label>{t('settings.autoClose.ruleOrder')}</label>
              <select
                id="ruleOrder"
                className="form-select form-select-small"
                value={ruleOrder}
                onChange={(e) => onRuleOrderChange(e.target.value as RuleOrderType)}
              >
                <option value="asc">{t('settings.autoClose.ruleOrderAsc')}</option>
                <option value="desc">{t('settings.autoClose.ruleOrderDesc')}</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={handleAddRule}
            >
              <span>{t('settings.autoClose.addRule')}</span>
            </button>
          </div>

          <RuleList
            rules={rules}
            onToggle={handleToggleRule}
            onEdit={handleEditRule}
            onDelete={handleDeleteRule}
          />
        </div>
      </div>

      {/* ルール編集ダイアログ */}
      <RuleDialog
        isOpen={isDialogOpen}
        editingRule={editingRule}
        onSave={handleSaveRule}
        onClose={handleCloseDialog}
      />
    </>
  );
}

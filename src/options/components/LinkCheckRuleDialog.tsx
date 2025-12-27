/**
 * TabBurrow - リンクチェックルール編集ダイアログコンポーネント
 */

import { useState, useEffect, useCallback } from 'react';
import { DialogOverlay } from '../../common/DialogOverlay.js';
import { useTranslation } from '../../common/i18nContext.js';
import type { LinkCheckRule, LinkCheckAction } from '../../settings.js';

interface LinkCheckRuleDialogProps {
  isOpen: boolean;
  editingRule: LinkCheckRule | null;
  onSave: (rule: LinkCheckRule) => void;
  onClose: () => void;
}

// アクションの選択肢
const ACTIONS: { value: LinkCheckAction; labelKey: string }[] = [
  { value: 'alive', labelKey: 'linkCheck.settings.actionAlive' },
  { value: 'dead', labelKey: 'linkCheck.settings.actionDead' },
  { value: 'warning', labelKey: 'linkCheck.settings.actionWarning' },
  { value: 'ignore', labelKey: 'linkCheck.settings.actionIgnore' },
];

export function LinkCheckRuleDialog({ isOpen, editingRule, onSave, onClose }: LinkCheckRuleDialogProps) {
  const { t } = useTranslation();

  // フォーム状態
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState<LinkCheckAction>('warning');
  const [conditionError, setConditionError] = useState('');

  // 編集時・ダイアログオープン時の初期化
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setCondition(editingRule.condition);
      setAction(editingRule.action);
    } else {
      setName('');
      setCondition('');
      setAction('warning');
    }
    setConditionError('');
  }, [editingRule, isOpen]);

  // 保存処理
  const handleSave = useCallback(() => {
    const trimmedCondition = condition.trim();
    if (!trimmedCondition) {
      setConditionError(t('linkCheck.settings.dialog.conditionRequired'));
      return;
    }

    const rule: LinkCheckRule = {
      id: editingRule?.id || crypto.randomUUID(),
      enabled: editingRule?.enabled ?? true,
      name: name.trim() || trimmedCondition,
      condition: trimmedCondition,
      action,
    };

    onSave(rule);
    onClose();
  }, [name, condition, action, editingRule, onSave, onClose, t]);

  return (
    <DialogOverlay isOpen={isOpen} onClose={onClose}>
      <div className="dialog dialog-wide">
        <h3 className="dialog-title">
          {editingRule ? t('linkCheck.settings.editRule') : t('linkCheck.settings.addRule')}
        </h3>
        
        <div className="rule-form">
          {/* ルール名（オプション） */}
          <div className="form-group">
            <label htmlFor="linkCheckRuleName" className="form-label">
              {t('linkCheck.settings.dialog.name')}
            </label>
            <input
              type="text"
              id="linkCheckRuleName"
              className="form-input"
              placeholder={t('linkCheck.settings.dialog.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 条件（ステータスコード等） */}
          <div className="form-group">
            <label htmlFor="linkCheckRuleCondition" className="form-label">
              {t('linkCheck.settings.dialog.conditionLabel')}
            </label>
            <input
              type="text"
              id="linkCheckRuleCondition"
              className={`form-input ${conditionError ? 'error' : ''}`}
              placeholder={t('linkCheck.settings.dialog.conditionPlaceholder')}
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                setConditionError('');
              }}
            />
            {conditionError ? (
              <div className="form-hint" style={{ color: 'var(--danger-color)' }}>
                {conditionError}
              </div>
            ) : (
              <div className="form-hint">
                {t('linkCheck.settings.dialog.conditionHint')}
              </div>
            )}
          </div>

          {/* アクション選択 */}
          <div className="form-group">
            <label htmlFor="linkCheckRuleAction" className="form-label">
              {t('linkCheck.settings.dialog.actionLabel')}
            </label>
            <select
              id="linkCheckRuleAction"
              className="form-select"
              value={action}
              onChange={(e) => setAction(e.target.value as LinkCheckAction)}
            >
              {ACTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {t('linkCheck.settings.dialog.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            {t('linkCheck.settings.dialog.save')}
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
}


/**
 * TabBurrow - ルール編集ダイアログコンポーネント
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../common/i18nContext.js';
import type { AutoCloseRule } from '../../settings.js';

interface RuleDialogProps {
  isOpen: boolean;
  editingRule: AutoCloseRule | null;
  onSave: (rule: AutoCloseRule) => void;
  onClose: () => void;
}

type TargetType = AutoCloseRule['targetType'];
type ActionType = AutoCloseRule['action'];

export function RuleDialog({ isOpen, editingRule, onSave, onClose }: RuleDialogProps) {
  const { t } = useTranslation();

  // フォーム状態
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('domain');
  const [pattern, setPattern] = useState('');
  const [action, setAction] = useState<ActionType>('exclude');
  const [targetGroup, setTargetGroup] = useState('');
  const [patternError, setPatternError] = useState('');

  // 編集時の初期化
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setTargetType(editingRule.targetType);
      setPattern(editingRule.pattern);
      setAction(editingRule.action);
      setTargetGroup(editingRule.targetGroup || '');
    } else {
      setName('');
      setTargetType('domain');
      setPattern('');
      setAction('exclude');
      setTargetGroup('');
    }
    setPatternError('');
  }, [editingRule, isOpen]);

  // 保存処理
  const handleSave = useCallback(() => {
    if (!pattern.trim()) {
      setPatternError('パターンを入力してください');
      return;
    }

    // 正規表現の妥当性チェック
    try {
      new RegExp(pattern);
    } catch {
      setPatternError('無効な正規表現パターンです');
      return;
    }

    if (action === 'saveToGroup' && !targetGroup.trim()) {
      return;
    }

    const rule: AutoCloseRule = {
      id: editingRule?.id || crypto.randomUUID(),
      enabled: editingRule?.enabled ?? true,
      name: name.trim() || pattern.trim(),
      targetType,
      pattern: pattern.trim(),
      action,
      targetGroup: action === 'saveToGroup' ? targetGroup.trim() : undefined,
    };

    onSave(rule);
    onClose();
  }, [name, targetType, pattern, action, targetGroup, editingRule, onSave, onClose]);

  // オーバーレイクリックで閉じる（ドラッグ操作対応）
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const targetTypeOptions: { value: TargetType; labelKey: string }[] = [
    { value: 'domain', labelKey: 'settings.autoClose.targetType.domain' },
    { value: 'url', labelKey: 'settings.autoClose.targetType.url' },
    { value: 'fullUrl', labelKey: 'settings.autoClose.targetType.fullUrl' },
    { value: 'title', labelKey: 'settings.autoClose.targetType.title' },
  ];

  const actionOptions: { value: ActionType; labelKey: string }[] = [
    { value: 'exclude', labelKey: 'settings.autoClose.action.exclude' },
    { value: 'saveToGroup', labelKey: 'settings.autoClose.action.saveToGroup' },
    { value: 'saveOnly', labelKey: 'settings.autoClose.action.saveOnly' },
    { value: 'close', labelKey: 'settings.autoClose.action.close' },
    { value: 'pin', labelKey: 'settings.autoClose.action.pin' },
  ];

  return createPortal(
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog dialog-wide">
        <h3 className="dialog-title">
          {editingRule ? t('settings.autoClose.editRule') : t('settings.autoClose.addRule')}
        </h3>
        
        <div className="rule-form">
          <div className="form-group">
            <label htmlFor="ruleName" className="form-label">
              {t('settings.autoClose.dialog.name')}
            </label>
            <input
              type="text"
              id="ruleName"
              className="form-input"
              placeholder="例: GitHub除外"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ruleTargetType" className="form-label">
              {t('settings.autoClose.targetType.label')}
            </label>
            <select
              id="ruleTargetType"
              className="form-select"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as TargetType)}
            >
              {targetTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rulePattern" className="form-label">
              {t('settings.autoClose.dialog.pattern')}
            </label>
            <input
              type="text"
              id="rulePattern"
              className={`form-input ${patternError ? 'error' : ''}`}
              placeholder="例: github\.com"
              value={pattern}
              onChange={(e) => {
                setPattern(e.target.value);
                setPatternError('');
              }}
            />
            {patternError ? (
              <div className="form-hint" style={{ color: 'var(--danger-color)' }}>
                {patternError}
              </div>
            ) : (
              <div className="form-hint">
                {t('settings.autoClose.dialog.patternHint')}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="ruleAction" className="form-label">
              {t('settings.autoClose.action.label')}
            </label>
            <select
              id="ruleAction"
              className="form-select"
              value={action}
              onChange={(e) => setAction(e.target.value as ActionType)}
            >
              {actionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {action === 'saveToGroup' && (
            <div className="form-group">
              <label htmlFor="ruleTargetGroup" className="form-label">
                {t('settings.autoClose.dialog.selectGroup')}
              </label>
              <input
                type="text"
                id="ruleTargetGroup"
                className="form-input"
                placeholder="グループ名"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {t('settings.autoClose.dialog.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            {t('settings.autoClose.dialog.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

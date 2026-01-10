/**
 * TabBurrow - URL正規化ルール編集ダイアログ（設定画面用）
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../common/i18nContext';
import type { UrlNormalizationRule } from '../../settings';
import { Dialog } from '../../common/Dialog';
import { NormalizationRuleForm, NormalizationRuleIcon } from '../../common/NormalizationRuleForm';

interface UrlNormalizationRuleDialogProps {
  isOpen: boolean;
  editingRule: UrlNormalizationRule | null;
  onSave: (rule: UrlNormalizationRule, applyToExisting: boolean) => void;
  onClose: () => void;
}

export function UrlNormalizationRuleDialog({
  isOpen,
  editingRule,
  onSave,
  onClose,
}: UrlNormalizationRuleDialogProps) {
  const { t } = useTranslation();
  
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [replacement, setReplacement] = useState('');
  const [applyToExisting, setApplyToExisting] = useState(false);

  // 編集時は初期値をセット
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setPattern(editingRule.pattern);
      setReplacement(editingRule.replacement);
      setApplyToExisting(false); // 毎回リセット
    } else {
      setName('');
      setPattern('');
      setReplacement('');
      setApplyToExisting(false);
    }
  }, [editingRule, isOpen]);

  const handleSave = useCallback(() => {
    if (!name || !pattern) return;
    
    const rule: UrlNormalizationRule = {
      id: editingRule?.id || crypto.randomUUID(),
      enabled: editingRule ? editingRule.enabled : true,
      name,
      pattern,
      replacement,
    };
    
    onSave(rule, applyToExisting);
  }, [editingRule, name, pattern, replacement, applyToExisting, onSave]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingRule ? t('settings.urlNormalization.editRule') : t('settings.urlNormalization.addRule')}
      icon={<NormalizationRuleIcon />}
      width="480px"
      actions={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!name || !pattern}
          >
            {t('common.save')}
          </button>
        </>
      }
    >
      <NormalizationRuleForm
        name={name}
        onNameChange={setName}
        pattern={pattern}
        onPatternChange={setPattern}
        replacement={replacement}
        onReplacementChange={setReplacement}
        applyToExisting={applyToExisting}
        onApplyToExistingChange={setApplyToExisting}
      />
    </Dialog>
  );
}

/**
 * TabBurrow - 正規化ルール適用結果ダイアログ
 * 適用結果を視覚的に表示
 */

import { memo } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from './i18nContext.js';
import { Dialog } from './Dialog.js';
import type { NormalizationApplyResult } from '../storage.js';

interface NormalizationResultDialogProps {
  isOpen: boolean;
  result: NormalizationApplyResult | null;
  onClose: () => void;
}

/**
 * 正規化ルール適用結果を表示するダイアログ
 */
export const NormalizationResultDialog = memo(function NormalizationResultDialog({
  isOpen,
  result,
  onClose,
}: NormalizationResultDialogProps) {
  const { t } = useTranslation();

  if (!result) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.urlNormalization.resultDialog.title')}
      icon={<CheckCircle className="alert-icon-success" />}
      width="560px"
      actions={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <div className="normalization-result">
        <p className="result-summary">
          {t('settings.urlNormalization.dialog.applySuccess', { count: result.mergedCount.toString() })}
        </p>

        {result.details.length > 0 && (
          <div className="result-details">
            <h4 className="result-details-title">
              {t('settings.urlNormalization.resultDialog.detailsTitle')}
            </h4>
            <ul className="result-list">
              {result.details.slice(0, 10).map((detail, index) => (
                <li key={index} className="result-item">
                  <div className="result-kept">
                    <span className="result-url" title={detail.keptUrl}>
                      {detail.keptUrl}
                    </span>
                  </div>
                  <div className="result-merged">
                    <ArrowRight size={14} className="result-arrow" />
                    <span className="result-merged-count">
                      {t('settings.urlNormalization.resultDialog.mergedFrom', { 
                        count: detail.removedUrls.length.toString() 
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {result.details.length > 10 && (
              <p className="result-more">
                {t('settings.urlNormalization.resultDialog.andMore', { 
                  count: (result.details.length - 10).toString() 
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
});

/**
 * TabBurrow - 汎用ダイアログコンポーネント
 * 他の特定のダイアログ（ConfirmDialogなど）のベースとなるコンポーネント
 */

import { memo, ReactNode } from 'react';
import { DialogOverlay } from './DialogOverlay.js';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  width?: string | number;
}

export const Dialog = memo(function Dialog({
  isOpen,
  onClose,
  title,
  icon,
  children,
  actions,
  width,
}: DialogProps) {
  return (
    <DialogOverlay isOpen={isOpen} onClose={onClose}>
      <div className="dialog" style={width ? { maxWidth: width, width: '90%' } : undefined}>
        {(title || icon) && (
          <div className="dialog-header">
            {icon && <span className="dialog-icon">{icon}</span>}
            {title && <h3 className="dialog-title">{title}</h3>}
          </div>
        )}
        
        <div className="dialog-message">
          {children}
        </div>
        
        {actions && (
          <div className="dialog-actions">
            {actions}
          </div>
        )}
      </div>
    </DialogOverlay>
  );
});


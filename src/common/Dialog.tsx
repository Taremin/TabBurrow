/**
 * TabBurrow - 汎用ダイアログコンポーネント
 * 他の特定のダイアログ（ConfirmDialogなど）のベースとなるコンポーネント
 */

import { memo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from './hooks/useDialog.js';

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
  const { handleOverlayClick } = useDialog({ isOpen, onClose });

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="dialog-overlay" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
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
    </div>,
    document.body
  );
});

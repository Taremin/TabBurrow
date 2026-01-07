/**
 * テーマリストコンポーネント
 */

import { Trash2 } from 'lucide-react';
import type { CustomTheme } from '../../customTheme.js';

interface ThemeListProps {
  themes: CustomTheme[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ThemeList({ themes, selectedId, onSelect, onDelete }: ThemeListProps) {
  if (themes.length === 0) {
    return (
      <div className="theme-list">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
          テーマがありません
        </p>
      </div>
    );
  }

  return (
    <div className="theme-list">
      {themes.map(theme => (
        <div
          key={theme.id}
          className={`theme-list-item ${selectedId === theme.id ? 'selected' : ''}`}
          onClick={() => onSelect(theme.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onSelect(theme.id)}
        >
          <div
            className="theme-color-preview"
            style={{ background: theme.colors.bgPrimary }}
          />
          <div className="theme-info">
            <div className="theme-name">{theme.name}</div>
            <div className="theme-date">
              {new Date(theme.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="theme-actions">
            <button
              className="btn-icon danger"
              onClick={e => {
                e.stopPropagation();
                onDelete(theme.id);
              }}
              aria-label="削除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

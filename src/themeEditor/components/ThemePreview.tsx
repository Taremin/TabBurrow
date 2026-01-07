/**
 * テーマプレビューコンポーネント
 * タブ管理画面のUIをモックして、テーマの見た目をプレビュー
 */

import { useTranslation } from '../../common/i18nContext.js';
import { ChevronDown, Search, Settings, ExternalLink, Trash2, FolderOpen, Pin } from 'lucide-react';

export function ThemePreview() {
  const { t } = useTranslation();

  return (
    <div className="theme-preview">
      <h3 className="preview-title">
        {t('themeEditor.preview.title', { defaultValue: 'プレビュー' })}
      </h3>
      
      <div className="preview-container">
        {/* モックヘッダー */}
        <div className="preview-header">
          <div className="preview-header-left">
            <span className="preview-logo">📚 TabBurrow</span>
            <span className="preview-tab-count">12 タブ</span>
          </div>
          <div className="preview-header-right">
            <button className="preview-btn preview-btn-secondary">
              <Search size={14} />
            </button>
            <button className="preview-btn preview-btn-primary">
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* 検索バー */}
        <div className="preview-search">
          <Search size={14} className="preview-search-icon" />
          <span className="preview-search-placeholder">URL・タイトルで検索...</span>
        </div>

        {/* カスタムグループ */}
        <div className="preview-group preview-group-custom">
          <div className="preview-group-header custom">
            <div className="preview-group-left">
              <ChevronDown size={16} />
              <FolderOpen size={16} />
              <span className="preview-group-name">お気に入り</span>
              <span className="preview-group-count">3 タブ</span>
            </div>
            <div className="preview-group-actions">
              <button className="preview-icon-btn"><ExternalLink size={14} /></button>
              <button className="preview-icon-btn danger"><Trash2 size={14} /></button>
            </div>
          </div>
          
          {/* タブカード */}
          <div className="preview-tab-card">
            <div className="preview-tab-favicon">🌐</div>
            <div className="preview-tab-info">
              <div className="preview-tab-title">サンプルページ</div>
              <div className="preview-tab-url">https://example.com/page</div>
            </div>
          </div>
        </div>

        {/* ドメイングループ（通常） */}
        <div className="preview-group preview-group-domain">
          <div className="preview-group-header domain">
            <div className="preview-group-left">
              <ChevronDown size={16} />
              <span className="preview-group-name">example.com</span>
              <span className="preview-group-count">5 タブ</span>
            </div>
            <div className="preview-group-actions">
              <button className="preview-icon-btn"><Pin size={14} /></button>
              <button className="preview-icon-btn"><ExternalLink size={14} /></button>
            </div>
          </div>
          
          {/* タブカード（ホバー状態風） */}
          <div className="preview-tab-card hover">
            <div className="preview-tab-favicon">📄</div>
            <div className="preview-tab-info">
              <div className="preview-tab-title">ドキュメント</div>
              <div className="preview-tab-url">https://example.com/docs</div>
            </div>
            <button className="preview-icon-btn danger"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* ステータス表示サンプル */}
        <div className="preview-status-row">
          <span className="preview-status success">成功</span>
          <span className="preview-status warning">警告</span>
          <span className="preview-status danger">エラー</span>
        </div>

        {/* ボタンサンプル */}
        <div className="preview-button-row">
          <button className="preview-btn preview-btn-primary">
            プライマリ
          </button>
          <button className="preview-btn preview-btn-secondary">
            セカンダリ
          </button>
          <button className="preview-btn preview-btn-danger">
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

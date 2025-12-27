/**
 * TabBurrow - 共通レイアウトコンポーネント
 * 画面の基本構造（コンテナ、ヘッダー、メイン、フッター）を定義
 */

import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  className?: string; // 追加のコンテナクラス
  containerStyle?: React.CSSProperties;
}

export function Layout({ children, headerContent, footerContent, className = '', containerStyle }: LayoutProps) {
  return (
    <div className={`container ${className}`} style={containerStyle}>
      {headerContent && (
        <header className="header">
          {headerContent}
        </header>
      )}

      <main className="main">
        {children}
      </main>

      {footerContent && (
        <footer className="footer">
          {footerContent}
        </footer>
      )}
    </div>
  );
}

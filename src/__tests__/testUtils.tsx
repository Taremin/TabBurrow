/**
 * Reactコンポーネントテスト用のユーティリティ
 * I18nProviderのモックラッパーを提供
 */
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// モックI18nProvider - 翻訳関数をそのままキーを返すように
function MockI18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// カスタムrender関数（I18nProviderでラップ）
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: MockI18nProvider, ...options });
}

// re-export everything
export * from '@testing-library/react';
export { customRender as render };

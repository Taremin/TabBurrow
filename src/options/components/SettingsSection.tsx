/**
 * TabBurrow - 設定セクション共通コンポーネント
 */

import { ReactNode } from 'react';

interface SettingsSectionProps {
  icon: string | ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  dataTestId?: string;
}

export function SettingsSection({ icon, title, description, children, dataTestId }: SettingsSectionProps) {
  return (
    <section className="settings-section" data-testid={dataTestId}>
      <h2 className="section-title">
        <span className="section-icon">{icon}</span>
        <span>{title}</span>
      </h2>
      <p className="section-description">{description}</p>
      {children}
    </section>
  );
}

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="rerooted-app">
      <header className="rerooted-app-header">
        <Link to="/" className="rerooted-brand">
          <strong>ReRooted</strong>
          <span>Genealogy canvas</span>
        </Link>
      </header>

      <main>{children}</main>
    </div>
  );
}

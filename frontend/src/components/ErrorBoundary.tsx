import React, { type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error): void {
    console.error('[ReRooted]', error);
  }

  public override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="rerooted-centered-state">
          <div className="rerooted-state-card">
            <strong>Stammbaum konnte nicht geladen werden.</strong>
            <span>{this.state.error.message}</span>
            <button type="button" className="rerooted-primary-button" onClick={() => window.location.reload()}>
              Neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

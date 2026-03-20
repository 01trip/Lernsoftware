import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-red-50 p-8 text-center">
          <p className="text-2xl font-bold text-red-500">Etwas ist schiefgelaufen.</p>
          <p className="font-mono text-sm text-red-400">{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600"
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

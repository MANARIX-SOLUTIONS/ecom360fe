import { Component, type ReactNode } from "react";
import { Result, Button } from "antd";
import { RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "var(--color-bg)",
          }}
        >
          <Result
            status="error"
            title="Une erreur est survenue"
            subTitle="L'application a rencontré un problème. Vous pouvez réessayer ou recharger la page."
            extra={[
              <Button
                key="retry"
                type="primary"
                icon={<RefreshCw size={16} />}
                onClick={this.handleRetry}
              >
                Réessayer
              </Button>,
              <Button key="reload" onClick={this.handleReload}>
                Recharger la page
              </Button>,
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

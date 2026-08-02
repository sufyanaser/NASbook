import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("NASbook renderer failed:", error, info.componentStack);
  }

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-failure" role="alert">
        <section className="app-failure-card">
          <strong>تعذر تحميل مساحة العمل</strong>
          <span>لم يتم تغيير بياناتك. أعد تحميل الواجهة للمتابعة.</span>
          <button type="button" onClick={() => window.location.reload()}>
            إعادة التحميل
          </button>
        </section>
      </main>
    );
  }
}

import { useEffect, useState } from "react";

interface TitleBarProps {
  readonly language: string;
}

export function TitleBar({ language }: TitleBarProps): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = async (): Promise<void> => {
    if (window.nasNotesbook?.window?.isMaximized) {
      try {
        const max = await window.nasNotesbook.window.isMaximized();
        setIsMaximized(max);
      } catch (err) {
        console.error("Failed to check if window is maximized:", err);
      }
    }
  };

  useEffect(() => {
    void checkMaximized();

    const handleResize = (): void => {
      void checkMaximized();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleMinimize = (): void => {
    window.nasNotesbook?.window?.minimize().catch((err) => {
      console.error("Failed to minimize window:", err);
    });
  };

  const handleToggleMaximize = (): void => {
    window.nasNotesbook?.window?.toggleMaximize()
      .then(() => {
        void checkMaximized();
      })
      .catch((err) => {
        console.error("Failed to toggle maximize window:", err);
      });
  };

  const handleClose = (): void => {
    window.nasNotesbook?.window?.close().catch((err) => {
      console.error("Failed to close window:", err);
    });
  };

  const isRtl = language === "ar";

  return (
    <div className="titlebar" data-rtl={isRtl ? "true" : "false"}>
      <span className="titlebar-title">NASbook</span>
      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-button-minimize"
          onClick={handleMinimize}
          title={isRtl ? "تصغير" : "Minimize"}
          aria-label={isRtl ? "تصغير" : "Minimize"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-button titlebar-button-maximize"
          onClick={handleToggleMaximize}
          title={
            isMaximized
              ? isRtl
                ? "استعادة"
                : "Restore"
              : isRtl
              ? "تكبير"
              : "Maximize"
          }
          aria-label={isRtl ? (isMaximized ? "استعادة" : "تكبير") : (isMaximized ? "Restore" : "Maximize")}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1.5,3.5 h5 v5 h-5 z" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M3.5,3.5 v-2 h5 v5 h-2" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          className="titlebar-button titlebar-button-close"
          onClick={handleClose}
          title={isRtl ? "إغلاق" : "Close"}
          aria-label={isRtl ? "إغلاق" : "Close"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";

type AlertProps = {
  type: "success" | "error" | "info" | "warning";
  message: string;
  onClose: () => void;
  shouldExit?: boolean;
  durationMs?: number;
  closable?: boolean;
};

const typeToAriaRole: Record<AlertProps["type"], "status" | "alert"> = {
  success: "status",
  info: "status",
  warning: "status",
  error: "alert",
};

const Alert: React.FC<AlertProps> = ({
  type,
  message,
  onClose,
  shouldExit,
  durationMs = 4000,
  closable = true,
}) => {
  const [state, setState] = useState<"enter" | "idle" | "exit">("enter");
  const removeTimerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setState("idle"), 20);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (shouldExit) {
      setState("exit");
      const t = window.setTimeout(onClose, 280);
      return () => window.clearTimeout(t);
    }
  }, [shouldExit, onClose]);

  useEffect(() => {
    if (shouldExit !== undefined) return;

    if (progressRef.current) {
      progressRef.current.style.setProperty("--toast-duration", `${durationMs}ms`);
      void progressRef.current.offsetWidth;
      progressRef.current.classList.add("toast__progress--running");
    }

    const slideOutTimer = window.setTimeout(() => setState("exit"), Math.max(0, durationMs - 300));
    const removeTimer = window.setTimeout(onClose, durationMs);

    removeTimerRef.current = removeTimer;
    return () => {
      window.clearTimeout(slideOutTimer);
      window.clearTimeout(removeTimer);
    };
  }, [shouldExit, onClose, durationMs]);

  const handleManualClose = () => {
    setState("exit");
    const t = window.setTimeout(onClose, 250);
    if (removeTimerRef.current) window.clearTimeout(removeTimerRef.current);
    return () => window.clearTimeout(t);
  };

  const Icon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="toast__icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
      case "error":
        return (
          <svg className="toast__icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        );
      case "warning":
        return (
          <svg className="toast__icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 9v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      default:
        return (
          <svg className="toast__icon" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast toast--${type} ${state === "enter" ? "toast--enter" : ""} ${state === "exit" ? "toast--exit" : ""}`}
      role={typeToAriaRole[type]}
    >
      <Icon />
      <div className="toast__body">
        <div className="toast__message">{message}</div>
        <div ref={progressRef} className="toast__progress" />
      </div>

      {closable && (
        <button className="toast__close" aria-label="Close notification" onClick={handleManualClose}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );
};

export default Alert;

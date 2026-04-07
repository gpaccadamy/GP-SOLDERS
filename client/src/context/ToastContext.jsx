import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={toastStyles.container}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastStyles.toast,
              ...(toast.type === "success" ? toastStyles.success : {}),
              ...(toast.type === "error" ? toastStyles.error : {}),
              ...(toast.type === "warning" ? toastStyles.warning : {}),
            }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

const toastStyles = {
  container: {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 99999,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxWidth: "calc(100vw - 32px)",
  },
  toast: {
    padding: "10px 14px",
    borderRadius: 8,
    color: "#fff",
    background: "rgba(51, 65, 85, 0.95)",
    boxShadow: "0 5px 18px rgba(0,0,0,0.25)",
    cursor: "pointer",
    minWidth: 220,
    maxWidth: 350,
    fontSize: 13,
    lineHeight: 1.3,
  },
  success: {
    background: "#16a34a",
  },
  error: {
    background: "#dc2626",
  },
  warning: {
    background: "#facc15",
    color: "#1f2937",
  },
};

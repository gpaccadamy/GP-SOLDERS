import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiVideo, FiTarget, FiClipboard, FiAward, FiUser, FiBookOpen, FiBell, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/students";

export default function StudentLanding() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [toastError, setToastError] = useState("");

  const menuItems = [
    { 
      icon: <FiVideo size={28} />, 
      label: "Classes", 
      path: "/student/videos", 
      color1: "#3b82f6",
      color2: "#1d4ed8"
    },
    { 
      icon: <FiTarget size={28} />, 
      label: "Training", 
      path: "/student/training-videos", 
      color1: "#10b981",
      color2: "#059669"
    },
    { 
      icon: <FiClipboard size={28} />, 
      label: "Tests", 
      path: "/student/exam", 
      color1: "#f59e0b",
      color2: "#d97706"
    },
    { 
      icon: <FiAward size={28} />, 
      label: "Results", 
      path: "/student/results", 
      color1: "#a855f7",
      color2: "#7c3aed"
    },
    { 
      icon: <FiUser size={28} />, 
      label: "Profile", 
      path: "/student/profile", 
      color1: "#ec4899",
      color2: "#db2777"
    },
    { 
      icon: <FiBookOpen size={28} />, 
      label: "Notes", 
      path: "/student/notes", 
      color1: "#06b6d4",
      color2: "#0891b2"
    },
  ];

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API}/notifications/active`);
        const data = await res.json();
        if (res.ok) {
          setToasts(data);
          data.forEach((notif) => {
            setTimeout(() => {
              setToasts((prev) => prev.filter((item) => item._id !== notif._id));
            }, 6000);
          });
        } else {
          setToastError(data.error || "Unable to fetch notifications");
        }
      } catch (err) {
        setToastError("Connection error: " + err.message);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      color: "#1e293b",
    }}>
      {/* Toast Notifications */}
      <div style={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast._id} style={styles.toastItem}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FiCheckCircle size={18} style={{ color: "#10b981", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Notification</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.9 }}>{toast.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toastError && (
        <div style={{...styles.toastError}}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FiAlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{toastError}</span>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logoContainer}>
            <div style={styles.logoBadge}>
              <img 
                src="/logo.png" 
                alt="GP Soldier Academy" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                onError={(e) => { 
                  e.target.style.display='none'; 
                  e.target.parentElement.innerHTML='<span style="font-size:20px; font-weight:700;">🎓</span>'; 
                }} 
              />
            </div>
            <div>
              <h1 style={styles.headerTitle}>GP Soldier Academy</h1>
              <p style={styles.headerSubtitle}>Welcome back, Soldier!</p>
            </div>
          </div>
          <button style={styles.bellButton}>
            <FiBell size={20} color="#fff" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.contentWrapper}>
        {/* Explore Section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Explore Your Learning</h2>
          <div style={styles.menuGrid}>
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                style={styles.menuItem}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
              >
                <div style={{...styles.iconContainer, background: `linear-gradient(135deg, ${item.color1} 0%, ${item.color2} 100%)`}}>
                  {item.icon}
                </div>
                <span style={styles.menuLabel}>{item.label}</span>
                <div style={styles.menuArrow}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  toastContainer: {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 380,
  },
  toastItem: {
    background: "#fff",
    color: "#1e293b",
    padding: "16px 16px",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    fontSize: 14,
    fontWeight: 500,
    border: "1px solid #e2e8f0",
    animation: "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  toastError: {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 10000,
    background: "#fff",
    color: "#1e293b",
    padding: "16px 16px",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    fontSize: 14,
    fontWeight: 500,
    border: "1px solid #fecaca",
  },
  header: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #2d5f4f 50%, #1e3a5f 100%)",
    padding: "24px 20px 32px",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: "16px",
    background: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid rgba(255,255,255,0.25)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  headerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.5px",
  },
  headerSubtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    fontWeight: 500,
    opacity: 0.85,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: "12px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    transition: "all 0.3s ease",
  },
  contentWrapper: {
    padding: "32px 20px 40px",
    maxWidth: 600,
    margin: "0 auto",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    margin: "0 0 18px",
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
    letterSpacing: "-0.3px",
  },
  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  menuItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    padding: "20px 12px 16px",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    position: "relative",
    height: "100%",
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
    transition: "transform 0.3s ease",
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    textAlign: "center",
    letterSpacing: "-0.2px",
  },
  menuArrow: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 20,
    color: "#cbd5e1",
    fontWeight: 300,
  },
};

// Add global animation styles
const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  button {
    transition: all 0.3s ease;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(globalStyle);
}
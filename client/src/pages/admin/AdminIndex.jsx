import { useNavigate } from "react-router-dom";
import { FiVideo, FiTarget, FiClipboard, FiBarChart2, FiUsers, FiBell, FiChevronRight, FiSettings, FiShield } from "react-icons/fi";

export default function AdminIndex() {
  const navigate = useNavigate();

  const menuItems = [
    { 
      icon: <FiVideo size={28} />, 
      label: "Class Videos", 
      path: "/admin/videos", 
      color1: "#3b82f6",
      color2: "#1d4ed8"
    },
    { 
      icon: <FiTarget size={28} />, 
      label: "Training", 
      path: "/admin/training-videos", 
      color1: "#10b981",
      color2: "#059669"
    },
    { 
      icon: <FiClipboard size={28} />, 
      label: "Exam Manager", 
      path: "/admin/exam", 
      color1: "#f59e0b",
      color2: "#d97706"
    },
    { 
      icon: <FiBarChart2 size={28} />, 
      label: "Results", 
      path: "/admin/results", 
      color1: "#a855f7",
      color2: "#7c3aed"
    },
    { 
      icon: <FiUsers size={28} />, 
      label: "Students", 
      path: "/admin/students", 
      color1: "#ec4899",
      color2: "#db2777"
    },
    { 
      icon: <FiBell size={28} />, 
      label: "Notifications", 
      path: "/admin/notifications", 
      color1: "#f97316",
      color2: "#ea580c"
    },
    
    { 
      icon: <FiSettings size={28} />, 
      label: "Settings", 
      path: "/admin/settings", 
      color1: "#06b6d4",
      color2: "#0891b2"
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      color: "#1e293b",
    }}>
      
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
                  e.target.style.display = "none"; 
                  e.target.parentElement.innerHTML = '<span style="font-size:24px; font-weight:700;">🎖️</span>'; 
                }}
              />
            </div>
            <div>
              <h1 style={styles.headerTitle}>GP Soldier Academy</h1>
              <p style={styles.headerSubtitle}>Admin Panel</p>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.adminBadge}>
              <FiShield size={14} color="#fff" />
              <span>Admin</span>
            </div>
            <button style={styles.bellButton}>
              <FiBell size={20} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick action banner */}
      <div style={styles.contentWrapper}>
        <div style={styles.actionBanner}>
          <div>
            <h3 style={styles.bannerTitle}>Manage Academy</h3>
            <p style={styles.bannerText}>Upload content, schedule exams & view reports</p>
          </div>
          <button
            onClick={() => navigate("/admin/exam")}
            style={styles.bannerButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(30, 77, 107, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(30, 77, 107, 0.15)";
            }}
          >
            New Exam <FiChevronRight size={14} style={{ marginLeft: 4 }} />
          </button>
        </div>

        {/* Menu Grid */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Manage Content</h2>
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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  adminBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
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
    maxWidth: 700,
    margin: "0 auto",
  },
  actionBanner: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px 20px",
    marginBottom: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  bannerTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
  },
  bannerText: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  bannerButton: {
    padding: "10px 18px",
    background: "#1e4d6b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 8px rgba(30, 77, 107, 0.15)",
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

  button {
    transition: all 0.3s ease;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(globalStyle);
}
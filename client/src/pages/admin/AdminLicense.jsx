import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiShield, FiArrowLeft, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/exam";

export default function AdminLicense() {
  const navigate = useNavigate();
  const [license, setLicense] = useState(null);
  const [newLimit, setNewLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchLicense();
  }, []);

  const fetchLicense = async () => {
    try {
      const r = await fetch(`${API}/license`);
      const data = await r.json();
      setLicense(data);
      setNewLimit(data.totalAllowed.toString());
    } catch (err) {
      setMsg({ type: "error", text: "Failed to load license information" });
    }
  };

  const updateLicense = async () => {
    if (!newLimit || isNaN(newLimit) || Number(newLimit) < 0) {
      setMsg({ type: "error", text: "Please enter a valid number" });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const r = await fetch(`${API}/license`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAllowed: Number(newLimit) })
      });

      if (r.ok) {
        setMsg({ type: "success", text: "License limit updated successfully!" });
        await fetchLicense(); // Refresh data
      } else {
        setMsg({ type: "error", text: "Failed to update license limit" });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return "#ef4444"; // Red
    if (percentage >= 70) return "#f59e0b"; // Orange
    return "#10b981"; // Green
  };

  const getUsageIcon = (percentage) => {
    if (percentage >= 90) return <FiTrendingDown size={20} />;
    if (percentage >= 70) return <FiMinus size={20} />;
    return <FiTrendingUp size={20} />;
  };

  if (!license) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Loading license information...</p>
        </div>
      </div>
    );
  }

  const used = license.totalConducted;
  const total = license.totalAllowed;
  const remaining = total - used;
  const percentage = Math.min((used / total) * 100, 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => navigate("/admin")}
        >
          <FiArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div style={styles.headerContent}>
          <div style={styles.headerIcon}>
            <FiShield size={24} color="#1e3a8a" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>Exam License Management</h1>
            <p style={styles.headerSubtitle}>Manage your exam license limits and monitor usage</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Usage Overview Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>License Usage Overview</h2>
            <div style={{...styles.usageIcon, color: getUsageColor(percentage)}}>
              {getUsageIcon(percentage)}
            </div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={{...styles.statNumber, color: "#ef4444"}}>{used}</div>
              <div style={styles.statLabel}>Exams Used</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statNumber, color: "#10b981"}}>{remaining}</div>
              <div style={styles.statLabel}>Remaining</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statNumber, color: "#1e3a8a"}}>{total}</div>
              <div style={styles.statLabel}>Total Limit</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${percentage}%`,
                  backgroundColor: getUsageColor(percentage)
                }}
              />
            </div>
            <div style={styles.progressText}>
              <span style={{ color: getUsageColor(percentage), fontWeight: 600 }}>
                {percentage.toFixed(1)}%
              </span>
              <span style={{ color: "#6b7280" }}> used</span>
            </div>
          </div>
        </div>

        {/* Update License Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Update License Limit</h2>
          </div>

          <div style={styles.updateSection}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Total Exam Limit</label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Enter new limit"
                style={styles.input}
                min="0"
              />
              <p style={styles.inputHelp}>
                Current limit: {total} exams
              </p>
            </div>

            <button
              style={{...styles.updateButton, opacity: loading ? 0.6 : 1}}
              onClick={updateLicense}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Limit"}
            </button>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div style={{...styles.message, backgroundColor: msg.type === "success" ? "#f0fdf4" : "#fef2f2", borderColor: msg.type === "success" ? "#22c55e" : "#ef4444"}}>
            {msg.type === "success" ? <FiCheckCircle size={20} color="#22c55e" /> : <FiAlertCircle size={20} color="#ef4444" />}
            <span style={{ color: msg.type === "success" ? "#166534" : "#dc2626" }}>
              {msg.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "20px 32px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "16px",
    padding: "8px 0",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  headerIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1e293b",
    margin: 0,
  },
  headerSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "4px 0 0 0",
  },
  content: {
    padding: "32px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#1e293b",
    margin: 0,
  },
  usageIcon: {
    display: "flex",
    alignItems: "center",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  statItem: {
    textAlign: "center",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
  statNumber: {
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 500,
  },
  progressSection: {
    marginTop: "20px",
  },
  progressBar: {
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "8px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
  },
  updateSection: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    display: "block",
    fontSize: "14px",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "16px",
    background: "#ffffff",
    transition: "border-color 0.2s",
  },
  inputHelp: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px",
  },
  updateButton: {
    padding: "12px 24px",
    background: "#1e3a8a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  message: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid",
    marginTop: "16px",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    color: "#6b7280",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #1e3a8a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUser, FiPhone, FiHash, FiCalendar, FiShield } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/students";

// inject spin keyframe once
const styleTag = document.createElement("style");
styleTag.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

export default function StudentProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const token = localStorage.getItem("gp_token");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/student");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setError("");
        } else {
          setError("Failed to load profile");
          if (res.status === 401) {
            localStorage.removeItem("gp_token");
            localStorage.removeItem("gp_name");
            navigate("/student");
          }
        }
      } catch (err) {
        setError("Connection error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const logout = () => {
    localStorage.removeItem("gp_token");
    localStorage.removeItem("gp_name");
    navigate("/student/login");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate("/student")} style={styles.backBtn}>
            <FiArrowLeft size={24} />
          </button>
          <h1 style={styles.title}>MY PROFILE</h1>
        </div>
        <div style={styles.center}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid #1e293b",
            borderTop: "3px solid #3b82f6",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate("/student")} style={styles.backBtn}>
            <FiArrowLeft size={24} />
          </button>
          <h1 style={styles.title}>MY PROFILE</h1>
        </div>
        <div style={styles.errorBox}>{error}</div>
        <div style={styles.center}>
          <button onClick={() => navigate("/student")} style={styles.backToHomeBtn}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={isMobile ? styles.mobileHeader : styles.header}>
        <button onClick={() => navigate("/student")} style={styles.backBtn}>
          <FiArrowLeft size={24} />
        </button>
        <h1 style={isMobile ? styles.mobileTitle : styles.title}>MY PROFILE</h1>
        <button onClick={logout} style={isMobile ? styles.mobileLogoutBtn : styles.logoutBtn}>
          Logout
        </button>
      </div>

      {/* Profile Card */}
      <div style={isMobile ? styles.mobileProfileCard : styles.profileCard}>
        {/* Avatar */}
        <div style={styles.avatarSection}>
          <div style={isMobile ? { ...styles.avatar, ...styles.mobileAvatar } : styles.avatar}>
            <FiUser size={48} color="#3b82f6" />
          </div>
          <div style={styles.statusBadge}>
            <FiShield size={16} />
            {profile.active ? "Active" : "Inactive"}
          </div>
        </div>

        {/* Profile Info */}
        <div style={styles.profileInfo}>
          <h2 style={isMobile ? styles.mobileStudentName : styles.studentName}>{profile.name}</h2>

          <div style={isMobile ? styles.mobileInfoGrid : styles.infoGrid}>
            <div style={isMobile ? styles.mobileInfoItem : styles.infoItem}>
              <FiPhone size={20} color="#60a5fa" />
              <div>
                <p style={styles.infoLabel}>Mobile Number</p>
                <p style={styles.infoValue}>{profile.mobile}</p>
              </div>
            </div>

            <div style={isMobile ? styles.mobileInfoItem : styles.infoItem}>
              <FiHash size={20} color="#60a5fa" />
              <div>
                <p style={styles.infoLabel}>Roll Number</p>
                <p style={styles.infoValue}>{profile.roll || "Not assigned"}</p>
              </div>
            </div>

            <div style={isMobile ? styles.mobileInfoItem : styles.infoItem}>
              <FiCalendar size={20} color="#60a5fa" />
              <div>
                <p style={styles.infoLabel}>Registration Date</p>
                <p style={styles.infoValue}>
                  {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div style={isMobile ? styles.mobileInfoItem : styles.infoItem}>
              <FiShield size={20} color="#60a5fa" />
              <div>
                <p style={styles.infoLabel}>Account Status</p>
                <p style={{
                  ...styles.infoValue,
                  color: profile.active ? "#10b981" : "#ef4444",
                  fontWeight: "600"
                }}>
                  {profile.active ? "Active (Can take exams)" : "Inactive (Cannot take exams)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Status */}
      <div style={isMobile ? styles.mobileStatusCard : styles.statusCard}>
        <h3 style={isMobile ? styles.mobileStatusTitle : styles.statusTitle}>Exam Eligibility</h3>
        <div style={styles.statusIndicator}>
          <div style={{
            ...styles.statusDot,
            background: profile.active ? "#10b981" : "#ef4444"
          }} />
          <span style={{
            ...styles.statusText,
            color: profile.active ? "#10b981" : "#ef4444"
          }}>
            {profile.active
              ? "You can participate in exams"
              : "Your account is currently inactive. Contact administrator to reactivate."
            }
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1a1f3a 50%, #0f172a 100%)",
    color: "#e2e8f0",
    fontFamily: "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
    paddingBottom: "40px",
  },
  header: {
    padding: "20px 24px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderBottom: "2px solid #3b82f6",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.1)",
  },
  backBtn: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "8px",
    borderRadius: "8px",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "800",
    margin: 0,
    flex: 1,
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  logoutBtn: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  errorBox: {
    margin: "16px",
    padding: "16px 20px",
    background: "linear-gradient(135deg, #7f1d1d 0%, #5f2c2c 100%)",
    color: "#fecaca",
    borderRadius: "12px",
    fontSize: "0.95rem",
    border: "1px solid #dc2626",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
  },
  profileCard: {
    margin: "20px 16px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #334155",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "24px",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.3)",
    marginBottom: "12px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "600",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
  },
  profileInfo: {
    textAlign: "center",
  },
  studentName: {
    margin: "0 0 24px 0",
    fontSize: "1.8rem",
    fontWeight: "800",
    color: "#e2e8f0",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    textAlign: "left",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    background: "rgba(15, 23, 42, 0.5)",
    borderRadius: "12px",
    border: "1px solid #334155",
  },
  infoLabel: {
    margin: "0 0 4px 0",
    fontSize: "0.8rem",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  infoValue: {
    margin: 0,
    fontSize: "0.95rem",
    color: "#e2e8f0",
    fontWeight: "500",
  },
  statusCard: {
    margin: "20px 16px",
    padding: "20px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "1px solid #334155",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  },
  statusTitle: {
    margin: "0 0 16px 0",
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  },
  statusText: {
    fontSize: "0.95rem",
    fontWeight: "500",
  },
  backToHomeBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
  },
  mobileHeader: {
    padding: "16px 12px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "2px solid #3b82f6",
  },
  mobileTitle: {
    fontSize: "1.5rem",
    fontWeight: "800",
    margin: 0,
    flex: 1,
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  mobileLogoutBtn: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  mobileProfileCard: {
    margin: "16px 12px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #334155",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  mobileAvatar: {
    width: "70px",
    height: "70px",
  },
  mobileStudentName: {
    fontSize: "1.5rem",
    margin: "0 0 20px 0",
    fontWeight: "800",
    color: "#e2e8f0",
  },
  mobileInfoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
    textAlign: "left",
  },
  mobileInfoItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px",
    background: "rgba(15, 23, 42, 0.5)",
    borderRadius: "12px",
    border: "1px solid #334155",
  },
  mobileStatusCard: {
    margin: "16px 12px",
    padding: "16px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "1px solid #334155",
  },
  mobileStatusTitle: {
    margin: "0 0 12px 0",
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
};  

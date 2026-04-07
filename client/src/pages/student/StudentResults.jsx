import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiAward, FiLogOut, FiCheckCircle, FiXCircle, FiClock, FiUser, FiLock } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api";

export default function StudentResults() {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => localStorage.getItem("gp_token"));
  const [studentName, setStudentName] = useState(() => localStorage.getItem("gp_name") || "Soldier");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gp_token");
    const name = localStorage.getItem("gp_name");
    if (!token || !name) {
      navigate("/student/login", { state: { from: { pathname: "/student/results" } } });
      return;
    }
    setToken(token);
    setStudentName(name);
  }, [navigate]);

  useEffect(() => {
    if (!token) return;

    // Fetch results only if token exists
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/students/my-results`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setError("");
        } else {
          setError("Failed to load results. Please login again.");
          setScreen("login");
        }
      } catch (err) {
        setError("Connection error. Please check your internet.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  const logout = () => {
    localStorage.removeItem("gp_token");
    localStorage.removeItem("gp_name");
    navigate("/student/login");
  };

  const getScoreColor = (correct, total) => {
    const percent = (correct / total) * 100;
    if (percent >= 80) return "#22c55e";
    if (percent >= 60) return "#eab308";
    return "#ef4444";
  };

  const getGrade = (correct, total) => {
    const percent = (correct / total) * 100;
    if (percent >= 90) return "Excellent";
    if (percent >= 75) return "Very Good";
    if (percent >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <div style={styles.container}>
      <div>
        <div style={styles.header}>
          <button onClick={() => navigate("/student")} style={styles.backBtn}>
            <FiArrowLeft size={24} />
          </button>
          <h1 style={styles.title}>My Results</h1>
          <button onClick={logout} style={styles.logoutBtn}>
            <FiLogOut size={22} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.studentCard}>
            <div style={styles.avatar}>
              <FiAward size={36} color="#3b82f6" />
            </div>
            <div style={styles.studentInfo}>
              <h2>{studentName}</h2>
              <p>All your exam performance at a glance</p>
            </div>
          </div>

          <div style={styles.resultsSection}>
            {loading ? (
              <div style={styles.center}>Loading your exam results...</div>
            ) : error ? (
              <div style={styles.errorBox}>{error}</div>
            ) : results.length === 0 ? (
              <div style={styles.emptyBox}>
                <FiAward size={70} color="#475569" />
                <h3>No Results Yet</h3>
                <p>You haven't taken any exams yet.</p>
              </div>
            ) : (
              <div style={styles.resultsContainer}>
            {results.map((result, i) => {
              const percentage = Math.round((result.correct / result.total) * 100);
              return (
                <div key={i} style={styles.resultCard}>
                  <div style={styles.resultTop}>
                    <div>
                      <h3 style={styles.examTitle}>{result.examTitle}</h3>
                      <p style={styles.examInfo}>
                        {result.examSubject} • Test #{result.examTestNumber}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...styles.score, color: getScoreColor(result.correct, result.total) }}>
                        {result.correct} / {result.total}
                      </div>
                      <div style={styles.percentage}>{percentage}%</div>
                    </div>
                  </div>

                  <div style={styles.statsRow}>
                    <div style={styles.stat}>
                      <FiCheckCircle color="#22c55e" size={20} />
                      <span>{result.correct} Correct</span>
                    </div>
                    <div style={styles.stat}>
                      <FiXCircle color="#ef4444" size={20} />
                      <span>{result.wrong} Wrong</span>
                    </div>
                    <div style={styles.stat}>
                      <FiClock color="#f59e0b" size={20} />
                      <span>{result.unanswered} Skipped</span>
                    </div>
                  </div>

                  <div style={styles.gradeRow}>
                    <strong>Grade:</strong> {getGrade(result.correct, result.total)}
                  </div>

                  <div style={styles.date}>
                    Submitted on {new Date(result.submittedAt).toLocaleDateString('en-IN', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" },
  header: { padding: "16px 20px", background: "#1e2937", display: "flex", alignItems: "center", justifyContent: "space-between" },
  backBtn: { background: "none", border: "none", color: "#e2e8f0" },
  title: { fontSize: "1.45rem", fontWeight: "700" },
  logoutBtn: { background: "none", border: "none", color: "#ef4444" },

  studentCard: { padding: "24px 20px", background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", display: "flex", gap: 16, alignItems: "center" },
  avatar: { width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" },
  studentInfo: { flex: 1 },

  center: { textAlign: "center", padding: "100px 20px", color: "#94a3b8" },
  errorBox: { textAlign: "center", padding: "40px", color: "#ef4444", background: "#1e2937", margin: "20px", borderRadius: "12px" },
  emptyBox: { textAlign: "center", padding: "120px 20px", color: "#64748b" },

  resultsContainer: { padding: "20px" },
  resultCard: { background: "#1e2937", borderRadius: "16px", padding: "20px", marginBottom: "16px", border: "1px solid #334155" },
  resultTop: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  examTitle: { margin: "0 0 6px 0", fontSize: "1.15rem", fontWeight: "600" },
  examInfo: { margin: 0, color: "#94a3b8", fontSize: "0.9rem" },
  score: { fontSize: "2rem", fontWeight: "700", lineHeight: 1 },
  percentage: { fontSize: "0.95rem", fontWeight: "600", color: "#94a3b8" },

  statsRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #334155", borderBottom: "1px solid #334155", margin: "16px 0" },
  stat: { display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem" },

  gradeRow: { fontSize: "1.05rem", marginBottom: "12px", color: "#60a5fa" },
  date: { fontSize: "0.85rem", color: "#64748b" }
};
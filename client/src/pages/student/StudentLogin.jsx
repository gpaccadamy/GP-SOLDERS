import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiUser, FiLock, FiAlertCircle, FiCheckCircle } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api";

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginForm, setLoginForm] = useState({ mobile: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem("gp_token");
    const name = localStorage.getItem("gp_name");
    if (token && name) {
      // Redirect to the intended page or default to index
      const from = location.state?.from?.pathname || "/student";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const doLogin = async () => {
    setMsg(null);
    if (!loginForm.mobile || !loginForm.password) {
      return setMsg({ type: "error", text: "Enter mobile and password" });
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) {
        // Check if account is active
        if (!data.active) {
          setMsg({ type: "error", text: "Your account is inactive. Contact administrator." });
          return;
        }
        localStorage.setItem("gp_token", data.token);
        localStorage.setItem("gp_name", data.name);
        // Redirect to the intended page or default to index
        const from = location.state?.from?.pathname || "/student";
        navigate(from, { replace: true });
      } else {
        setMsg({ type: "error", text: data.error || "Login failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Connection error" });
    }
    setLoading(false);
  };

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      padding: "20px",
    },
    card: {
      background: "white",
      borderRadius: "16px",
      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      width: "100%",
      maxWidth: "400px",
      padding: "40px 32px",
    },
    header: {
      textAlign: "center",
      marginBottom: "32px",
    },
    logoCircle: {
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#1e293b",
      margin: "0 0 8px",
    },
    subtitle: {
      fontSize: "16px",
      color: "#64748b",
      margin: 0,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    },
    formTitle: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#1e293b",
      textAlign: "center",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      padding: "16px 20px",
      border: "2px solid #e2e8f0",
      borderRadius: "12px",
      fontSize: "16px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    inputFocus: {
      borderColor: "#3b82f6",
    },
    btnPrimary: {
      width: "100%",
      padding: "16px",
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
      color: "white",
      border: "none",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "transform 0.2s",
      marginTop: "8px",
    },
    btnPrimaryHover: {
      transform: "translateY(-2px)",
    },
    alert: {
      padding: "12px 16px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      fontSize: "14px",
      fontWeight: "500",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <FiUser size={28} color="white" />
          </div>
          <h1 style={styles.title}>GP SOLDIERS</h1>
          <p style={styles.subtitle}>Army Exam Portal</p>
        </div>

        <div style={styles.form}>
          <h2 style={styles.formTitle}>Student Login</h2>

          {msg && (
            <div style={{...styles.alert, background: msg.type === "success" ? "#dcfce7" : "#fee2e2", color: msg.type === "success" ? "#166534" : "#dc2626"}}>
              {msg.type === "error" ? <FiAlertCircle size={16} /> : <FiCheckCircle size={16} />}
              <span style={{marginLeft: 8}}>{msg.text}</span>
            </div>
          )}

          <input
            style={styles.input}
            type="tel"
            placeholder="Mobile Number"
            value={loginForm.mobile}
            onChange={(e) => setLoginForm({...loginForm, mobile: e.target.value})}
            onKeyPress={(e) => e.key === "Enter" && doLogin()}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
            onKeyPress={(e) => e.key === "Enter" && doLogin()}
          />
          <button
            style={styles.btnPrimary}
            onClick={doLogin}
            disabled={loading}
            onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
          >
            {loading ? "Please wait..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
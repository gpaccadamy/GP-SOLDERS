import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiVideo, FiFileText, FiUser, FiLock, FiPhone, FiCheckCircle, FiChevronLeft, FiChevronRight, FiSend, FiClock, FiAlertCircle } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api";

export default function StudentExam() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("checking");
  const [token, setToken] = useState(() => localStorage.getItem("gp_token"));
  const [studentName, setStudentName] = useState(() => localStorage.getItem("gp_name") || "");
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [backgroundRetryActive, setBackgroundRetryActive] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", description: "", action: null });
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const backgroundRetryRef = useRef(null);

  const [loginForm, setLoginForm] = useState({ mobile: "", password: "" });

  useEffect(() => {
    const savedToken = localStorage.getItem("gp_token");
    const savedName = localStorage.getItem("gp_name") || "";
    setToken(savedToken);
    setStudentName(savedName);

    if (!savedToken) {
      navigate("/student/login", { state: { from: { pathname: "/student/exam" } } });
      return;
    }

    checkAndRoute(savedToken);
    // Check for pending submissions on app load
    checkPendingSubmissions();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      clearInterval(backgroundRetryRef.current);
    };
  }, [navigate]);

  const openConfirmDialog = (title, description, action) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, title: "", description: "", action: null });
  };

  // Check for pending submissions that need to be retried
  const checkPendingSubmissions = () => {
    const pendingExamId = localStorage.getItem("gp_pending_exam_id");
    const pendingAnswers = localStorage.getItem("gp_pending_answers");
    const pendingToken = localStorage.getItem("gp_pending_token");
    
    if (pendingExamId && pendingAnswers && pendingToken) {
      console.log("Found pending submission, starting background retry...");
      startBackgroundRetry(pendingExamId, JSON.parse(pendingAnswers), pendingToken);
    }
  };

  // Background retry mechanism for failed submissions
  const startBackgroundRetry = (examId, answers, authToken) => {
    clearInterval(backgroundRetryRef.current);
    setBackgroundRetryActive(true);
    
    const retrySubmission = async () => {
      try {
        console.log("Attempting background submission retry...");
        const res = await fetch(`${API}/students/submit-exam`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${authToken}`,
            "X-Retry-Attempt": "background"
          },
          body: JSON.stringify({ examId, answers }),
        });
        
        if (res.ok) {
          console.log("Background submission successful!");
          // Clear pending submission data
          localStorage.removeItem("gp_pending_exam_id");
          localStorage.removeItem("gp_pending_answers");
          localStorage.removeItem("gp_pending_token");
          clearInterval(backgroundRetryRef.current);
          setBackgroundRetryActive(false);
          
          // Show success message if user is still on the page
          if (screen === "submitting") {
            pollForResult();
          }
        } else if (res.status === 429 || res.status === 503) {
          console.log("Server busy, will retry later...");
          // Continue retrying
        } else {
          console.log("Submission failed permanently:", res.status);
          // For other errors, stop retrying to avoid infinite loops
          clearInterval(backgroundRetryRef.current);
          setBackgroundRetryActive(false);
          localStorage.removeItem("gp_pending_exam_id");
          localStorage.removeItem("gp_pending_answers");
          localStorage.removeItem("gp_pending_token");
        }
      } catch (err) {
        console.log("Network error during background retry:", err);
        // Continue retrying on network errors
      }
    };

    // Retry every 30 seconds
    backgroundRetryRef.current = setInterval(retrySubmission, 30000);
    // Also try immediately
    retrySubmission();
  };

  const logout = () => {
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    clearInterval(backgroundRetryRef.current);
    localStorage.removeItem("gp_token");
    localStorage.removeItem("gp_name");
    // Clear any pending submissions on logout
    localStorage.removeItem("gp_pending_exam_id");
    localStorage.removeItem("gp_pending_answers");
    localStorage.removeItem("gp_pending_token");
    setToken(null); setStudentName("");
    setScreen("login");
  };

  const checkAndRoute = async (t = token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/active-exam`);
      const data = await res.json();
      setLoading(false);
      if (data.state === "live") {
        // Check if exam was already submitted
        const examLocked = localStorage.getItem("gp_exam_locked");
        if (examLocked === "true") {
          setMsg({ type: "info", text: "Exam already submitted. Check results." });
          setScreen("noexam");
          return;
        }
        
        setExam(data.exam);
        const savedExamId = localStorage.getItem("gp_exam_id");
        const savedAnswers = localStorage.getItem("gp_exam_answers");
        const savedQ = localStorage.getItem("gp_exam_q");
        if (savedExamId === data.exam._id && savedAnswers) {
          setAnswers(JSON.parse(savedAnswers));
          setCurrentQ(savedQ ? Number(savedQ) : 0);
        } else {
          localStorage.removeItem("gp_exam_answers");
          localStorage.removeItem("gp_exam_q");
          localStorage.setItem("gp_exam_id", data.exam._id);
          setAnswers({}); setCurrentQ(0);
        }
        startExamTimer(new Date(data.exam.expiresAt));
        setScreen("exam");
      } else if (data.state === "upcoming") {
        setExam(data.exam);
        startCountdown(new Date(data.exam.scheduledAt));
        setScreen("upcoming");
      } else {
        setScreen("noexam");
      }
    } catch {
      setLoading(false);
      setScreen("noexam");
    }
  };

  const startExamTimer = (expiresAt) => {
    clearInterval(timerRef.current);
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresAt - new Date()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) { clearInterval(timerRef.current); handleSubmit(true); }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  const startCountdown = (startAt) => {
    clearInterval(countdownRef.current);
    const tick = () => {
      const diff = Math.max(0, Math.floor((startAt - new Date()) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown({ h, m, s, diff });
      if (diff === 0) { clearInterval(countdownRef.current); checkAndRoute(); }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  };

  const doLogin = async () => {
    setMsg(null);
    if (!loginForm.mobile || !loginForm.password) return setMsg({ type: "error", text: "Enter mobile and password" });
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
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
        setToken(data.token); setStudentName(data.name);
        checkAndRoute(data.token);
      } else {
        setMsg({ type: "error", text: data.error || "Login failed" });
      }
    } catch { setMsg({ type: "error", text: "Connection error" }); }
    setLoading(false);
  };

  const pickAnswer = (qId, opt) => {
    setAnswers((a) => {
      const updated = { ...a, [qId]: opt };
      localStorage.setItem("gp_exam_answers", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubmit = async (auto = false) => {
    if (!auto) {
      const unanswered = exam.questions.length - Object.keys(answers).length;
      if (unanswered > 0) {
        return openConfirmDialog(
          "Unanswered Questions",
          `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`,
          () => {
            closeConfirmDialog();
            handleSubmit(true);
          }
        );
      }

      return openConfirmDialog(
        "Submit Exam",
        "This action cannot be undone. Are you sure you want to submit your exam?",
        () => {
          closeConfirmDialog();
          handleSubmit(true);
        }
      );
    }
    clearInterval(timerRef.current);

    const finalAnswers = { ...answers };
    const authToken = token || localStorage.getItem("gp_token");

    localStorage.setItem("gp_exam_answers_final", JSON.stringify(finalAnswers));
    localStorage.setItem("gp_exam_id_final", exam._id);
    localStorage.setItem("gp_exam_locked", "true");

    // Save for background retry in case of failure
    localStorage.setItem("gp_pending_exam_id", exam._id);
    localStorage.setItem("gp_pending_answers", JSON.stringify(finalAnswers));
    localStorage.setItem("gp_pending_token", authToken || "");

    if (!authToken) {
      navigate("/student/login", { state: { from: { pathname: "/student/exam" } } });
      return;
    }

    setScreen("submitting");
    setMsg({ type: "success", text: "Exam submitted! Processing results..." });

    let attempts = 0;
    const maxAttempts = 10;
    const submitWithRetry = async () => {
      try {
        const authToken = token || localStorage.getItem("gp_token");
        const res = await fetch(`${API}/students/submit-exam`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${authToken}`,
            "X-Retry-Attempt": attempts.toString()
          },
          body: JSON.stringify({ examId: exam._id, answers: finalAnswers }),
        });
        
        if (res.ok) {
          // Clear pending data on success
          localStorage.removeItem("gp_pending_exam_id");
          localStorage.removeItem("gp_pending_answers");
          localStorage.removeItem("gp_pending_token");
          clearInterval(backgroundRetryRef.current);
          
          pollForResult();
        } else if (res.status === 429 || res.status === 503) {
          attempts++;
          if (attempts < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
            setTimeout(submitWithRetry, delay);
          } else {
            // Start background retry after max attempts
            startBackgroundRetry(exam._id, finalAnswers, token);
            setMsg({ type: "warning", text: "Server busy. Submission will retry automatically in background." });
          }
        } else {
          const data = await res.json();
          setMsg({ type: "error", text: data.error || "Submit failed" });
          // Clear pending data on permanent failure
          localStorage.removeItem("gp_pending_exam_id");
          localStorage.removeItem("gp_pending_answers");
          localStorage.removeItem("gp_pending_token");
        }
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(submitWithRetry, 3000);
        } else {
          // Start background retry on network failure
          startBackgroundRetry(exam._id, finalAnswers, token);
          setMsg({ type: "warning", text: "Connection issue. Submission will retry automatically in background." });
        }
      }
    };

    submitWithRetry();

    const pollForResult = async () => {
      try {
        const authToken = token || localStorage.getItem("gp_token");
        const res = await fetch(`${API}/students/submission-status/${exam._id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (data.saved && data.result) {
          localStorage.removeItem("gp_exam_answers");
          localStorage.removeItem("gp_exam_answers_final");
          localStorage.removeItem("gp_exam_q");
          localStorage.removeItem("gp_exam_id");
          localStorage.removeItem("gp_exam_id_final");
          localStorage.removeItem("gp_exam_locked");
          // Clear any pending submission data
          localStorage.removeItem("gp_pending_exam_id");
          localStorage.removeItem("gp_pending_answers");
          localStorage.removeItem("gp_pending_token");
          clearInterval(backgroundRetryRef.current);
          setResult(data.result);
          setScreen("result");
        } else {
          setTimeout(pollForResult, 2000);
        }
      } catch {
        setTimeout(pollForResult, 3000);
      }
    };
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const timerPct = exam ? Math.min(100, (timeLeft / (exam.durationMinutes * 60)) * 100) : 100;
  const timerColor = timeLeft < 300 ? "#ef4444" : timeLeft < 600 ? "#f59e0b" : "#1e3a8a";
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - timerPct / 100);

  if (screen === "checking") {
    return null;
  }

  if (screen === "upcoming") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h2 style={styles.title}>Welcome, {studentName}</h2>
            <p style={styles.subtitle}>Exam starts soon</p>
          </div>
          
          <div style={styles.upcomingBox}>
            <div style={styles.examIcon}>📋</div>
            <h3 style={styles.examTitle}>{exam?.title}</h3>
            <p style={styles.examInfo}>{exam?.subject} • Test #{exam?.testNumber}</p>
            <p style={styles.examInfo}>{exam?.totalQuestions} Questions • {exam?.durationMinutes} mins</p>
          </div>

          {countdown && (
            <div style={styles.countdownBox}>
              <p style={styles.countdownLabel}>Starts in</p>
              <div style={styles.countdownTime}>
                {String(countdown.h).padStart(2,"0")}:{String(countdown.m).padStart(2,"0")}:{String(countdown.s).padStart(2,"0")}
              </div>
            </div>
          )}

          <button style={styles.btnPrimary} onClick={() => checkAndRoute()}>Refresh</button>
          <button style={styles.btnOutline} onClick={() => navigate("/student")}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (screen === "noexam") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.emptyIcon}>📭</div>
          <h2 style={styles.emptyTitle}>No Exam Available</h2>
          <p style={styles.emptyText}>Check back later for your scheduled exam</p>
          <button style={styles.btnPrimary} onClick={() => checkAndRoute()}>Check Again</button>
          <button style={styles.btnOutline} onClick={() => navigate("/student")}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (screen === "exam" && exam) {
    const q = exam.questions[currentQ];
    const answeredCount = Object.keys(answers).length;
    const total = exam.questions.length;
    const progress = ((currentQ + 1) / total) * 100;

    return (
      <div style={styles.examContainer}>
        {/* Timer Circle */}
        <div style={styles.timerSection}>
          <div style={styles.timerCircle}>
            <svg width="120" height="120" style={{transform: "rotate(-90deg)"}}>
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="60" cy="60" r={radius} fill="none" stroke={timerColor} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round" />
            </svg>
            <div style={styles.timerText}>
              <span style={{...styles.timerNum, color: timerColor}}>{Math.floor(timeLeft/60)}</span>
              <span style={styles.timerUnit}>min</span>
            </div>
          </div>
          <p style={styles.subjectLabel}>{exam.subject}</p>
        </div>

        {/* Progress */}
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progress}%`}} />
        </div>
        <p style={styles.progressText}>Question {currentQ + 1} of {total}</p>

        {/* Question */}
        <div style={styles.questionCard}>
          <p style={styles.questionText}>{q.questionText}</p>
          
          <div style={styles.optionsList}>
            {["A", "B", "C", "D"].map((opt) => {
              const selected = answers[q._id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => pickAnswer(q._id, opt)}
                  style={{
                    ...styles.optionBtn,
                    borderColor: selected ? "#22c55e" : "#e5e7eb",
                    background: selected ? "#f0fdf4" : "#ffffff",
                    boxShadow: selected ? "0 0 0 2px #22c55e" : "none",
                  }}
                >
                  <span style={{
                    ...styles.optionLetter,
                    background: selected ? "#22c55e" : "#f3f4f6",
                    color: selected ? "#ffffff" : "#6b7280",
                  }}>{opt}</span>
                  <span style={styles.optionText}>{q.options[opt]}</span>
                  {selected && <FiCheckCircle size={20} color="#22c55e" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={styles.navBar}>
          <button 
            style={{...styles.navBtn, opacity: currentQ === 0 ? 0.5 : 1}} 
            onClick={() => {const newQ = currentQ-1; localStorage.setItem("gp_exam_q", newQ); setCurrentQ(newQ);}}
            disabled={currentQ === 0}
          >
            <FiChevronLeft size={24} />
          </button>

          {currentQ === total - 1 ? (
            <button style={styles.submitBtn} onClick={() => handleSubmit(false)}>
              <FiSend size={18} /> Submit
            </button>
          ) : (
            <button style={styles.nextBtn} onClick={() => {const newQ = currentQ+1; localStorage.setItem("gp_exam_q", newQ); setCurrentQ(newQ);}}>
              Next <FiChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Dots */}
        <div style={styles.dotsContainer}>
          {exam.questions.map((qq, i) => (
            <button
              key={i}
              onClick={() => {localStorage.setItem("gp_exam_q", i); setCurrentQ(i);}}
              style={{
                ...styles.dot,
                background: answers[qq._id] ? "#22c55e" : i === currentQ ? "#1e3a8a" : "#e5e7eb",
                transform: i === currentQ ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {confirmDialog.open && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>{confirmDialog.title}</h3>
              <p style={styles.modalDescription}>{confirmDialog.description}</p>
              <div style={styles.modalActions}>
                <button style={styles.modalBtnSecondary} onClick={closeConfirmDialog}>Cancel</button>
                <button style={styles.modalBtnPrimary} onClick={() => confirmDialog.action && confirmDialog.action()}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "submitting") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinnerLarge} />
          <h3 style={styles.submitTitle}>Submitting Exam...</h3>
          <p style={styles.submitText}>Don't close this window</p>
          <div style={styles.savedBadge}>
            <FiCheckCircle color="#22c55e" /> Answers saved safely
          </div>
          {backgroundRetryActive && (
            <div style={styles.retryBadge}>
              <FiClock color="#f59e0b" /> Server busy - retrying automatically
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "result" && result) {
    const pct = Math.round((result.correct / result.total) * 100);
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <div style={styles.trophy}>{pct >= 80 ? "🏆" : pct >= 50 ? "🎖️" : "📋"}</div>
            <h2 style={styles.resultTitle}>{pct >= 80 ? "Excellent!" : pct >= 50 ? "Good Job!" : "Keep Practicing!"}</h2>
          </div>

          <div style={styles.scoreCircle}>
            <span style={styles.scoreNum}>{result.correct}/{result.total}</span>
            <span style={styles.scoreLabel}>SCORE</span>
          </div>

          <div style={styles.statsRow}>
            <div style={{...styles.statBox, borderColor: "#22c55e"}}>
              <span style={{...styles.statNum, color: "#22c55e"}}>{result.correct}</span>
              <span style={styles.statLabel}>Correct</span>
            </div>
            <div style={{...styles.statBox, borderColor: "#ef4444"}}>
              <span style={{...styles.statNum, color: "#ef4444"}}>{result.wrong}</span>
              <span style={styles.statLabel}>Wrong</span>
            </div>
            <div style={{...styles.statBox, borderColor: "#f59e0b"}}>
              <span style={{...styles.statNum, color: "#f59e0b"}}>{result.unanswered}</span>
              <span style={styles.statLabel}>Skipped</span>
            </div>
          </div>

          <button style={styles.btnPrimary} onClick={() => navigate("/student")}>
            <FiHome size={18} /> Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f0f9ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "32px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  logoCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1e3a8a",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "#64748b",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  formTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: "8px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    background: "#1e3a8a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "8px",
  },
  btnOutline: {
    width: "100%",
    padding: "14px",
    background: "transparent",
    color: "#1e3a8a",
    border: "2px solid #1e3a8a",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "12px",
  },
  alert: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "8px",
  },
  switch: {
    textAlign: "center",
    fontSize: "0.875rem",
    color: "#64748b",
    marginTop: "16px",
  },
  link: {
    color: "#1e3a8a",
    fontWeight: "600",
    cursor: "pointer",
  },
  
  // Exam Screen Styles
  examContainer: {
    minHeight: "100vh",
    background: "#f0f9ff",
    padding: "20px",
    fontFamily: "'Inter', -apple-system, sans-serif",
    maxWidth: "480px",
    margin: "0 auto",
  },
  timerSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 0",
  },
  timerCircle: {
    position: "relative",
    width: "120px",
    height: "120px",
  },
  timerText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  timerNum: {
    fontSize: "2.5rem",
    fontWeight: "700",
    lineHeight: "1",
  },
  timerUnit: {
    fontSize: "0.75rem",
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  subjectLabel: {
    marginTop: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#374151",
  },
  progressBar: {
    height: "4px",
    background: "#e5e7eb",
    borderRadius: "2px",
    marginBottom: "8px",
  },
  progressFill: {
    height: "100%",
    background: "#1e3a8a",
    borderRadius: "2px",
    transition: "width 0.3s",
  },
  progressText: {
    fontSize: "0.75rem",
    color: "#6b7280",
    marginBottom: "20px",
    textAlign: "center",
  },
  questionCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  questionText: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  optionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    transition: "all 0.2s",
  },
  optionLetter: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "0.875rem",
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    fontSize: "0.9375rem",
    color: "#374151",
  },
  navBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
  },
  navBtn: {
    padding: "12px 20px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    background: "#ffffff",
    cursor: "pointer",
  },
  nextBtn: {
    flex: 1,
    padding: "14px",
    background: "#1e3a8a",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  submitBtn: {
    flex: 1,
    padding: "14px",
    background: "#22c55e",
    color: "#ffffff",
    border: "none",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  dotsContainer: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    flexWrap: "wrap",
    padding: "12px",
  },
  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  
  // Other screens
  upcomingBox: {
    background: "#fef3c7",
    border: "2px solid #fbbf24",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    marginBottom: "20px",
  },
  examIcon: {
    fontSize: "2.5rem",
    marginBottom: "12px",
  },
  examTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#92400e",
    marginBottom: "4px",
  },
  examInfo: {
    fontSize: "0.875rem",
    color: "#b45309",
  },
  countdownBox: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    textAlign: "center",
    marginBottom: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  countdownLabel: {
    fontSize: "0.75rem",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  countdownTime: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1e3a8a",
    fontFamily: "monospace",
  },
  emptyIcon: {
    fontSize: "4rem",
    textAlign: "center",
    marginBottom: "16px",
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "0.875rem",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "24px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#1e3a8a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  spinnerLarge: {
    width: "60px",
    height: "60px",
    border: "5px solid #e5e7eb",
    borderTopColor: "#1e3a8a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px",
  },
  submitTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e3a8a",
    textAlign: "center",
    marginBottom: "8px",
  },
  submitText: {
    fontSize: "0.875rem",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "20px",
  },
  savedBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "#f0fdf4",
    borderRadius: "8px",
    fontSize: "0.875rem",
    color: "#166534",
  },
  retryBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "#fffbeb",
    borderRadius: "8px",
    fontSize: "0.875rem",
    color: "#92400e",
    marginTop: "12px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: "20px",
  },
  modal: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 25px 80px rgba(15,23,42,0.16)",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "12px",
  },
  modalDescription: {
    color: "#475569",
    lineHeight: 1.75,
    marginBottom: "24px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  modalBtnSecondary: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 600,
  },
  modalBtnPrimary: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    borderRadius: "12px",
    background: "#1e3a8a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  resultHeader: {
    textAlign: "center",
    marginBottom: "24px",
  },
  trophy: {
    fontSize: "3rem",
    marginBottom: "12px",
  },
  resultTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1e3a8a",
  },
  scoreCircle: {
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    background: "#1e3a8a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  scoreNum: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#ffffff",
  },
  scoreLabel: {
    fontSize: "0.75rem",
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  statsRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  statBox: {
    flex: 1,
    background: "#ffffff",
    border: "2px solid",
    borderRadius: "12px",
    padding: "16px 8px",
    textAlign: "center",
  },
  statNum: {
    fontSize: "1.5rem",
    fontWeight: "700",
    display: "block",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#6b7280",
    textTransform: "uppercase",
  },
};

// Add keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);
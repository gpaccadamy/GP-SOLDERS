import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://academy-backend-e02j.onrender.com/api/students";

export default function Notifications() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/notifications/all`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      } else {
        setError(data.error || "Unable to fetch notifications");
      }
    } catch (err) {
      setError("Connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/notifications/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Notification removed");
        setError("");
        loadNotifications();
      } else {
        setError(data.error || "Failed to delete notification");
      }
    } catch (err) {
      setError("Connection error: " + err.message);
    }
  };

  const handleCreate = async () => {
    setError("");
    setSuccess("");

    if (!message.trim() || !startDate || !endDate) {
      setError("All fields are required.");
      return;
    }

    const st = new Date(startDate);
    const ed = new Date(endDate);
    if (isNaN(st.getTime()) || isNaN(ed.getTime())) {
      setError("Please use valid date-time values.");
      return;
    }

    if (st >= ed) {
      setError("Start time must be earlier than end time.");
      return;
    }

    const diffDays = (ed - st) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      setError("Notification period cannot exceed 90 days.");
      return;
    }

    try {
      const res = await fetch(`${API}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, startDate: st, endDate: ed }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Notification created successfully");
        setMessage("");
        setStartDate("");
        setEndDate("");
        loadNotifications();
      } else {
        setError(data.error || "Failed to create notification");
      }
    } catch (err) {
      setError("Connection error: " + err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/admin")} style={styles.backBtn}>Back</button>
        <h1 style={styles.title}>Notification Center</h1>
      </div>

      <div style={styles.box}>
        <h2 style={styles.sectionTitle}>Create Notification</h2>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter notification message"
          style={styles.textarea}
        />

        <div style={styles.datetimeRow}>
          <div style={styles.datetimeField}>
            <label style={styles.label}>Start Date/Time</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.datetimeField}>
            <label style={styles.label}>End Date/Time</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <p style={styles.info}>Notification period must be ≤ 90 days. Toast displays for students 8 seconds per item.</p>

        <button onClick={handleCreate} style={styles.createButton}>Create Notification</button>
      </div>

      <div style={styles.box}>
        <h2 style={styles.sectionTitle}>Existing Notifications</h2>
        {loading ? (
          <p>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications created yet.</p>
        ) : (
          <ul style={styles.list}>
            {notifications.map((n) => (
              <li key={n._id} style={styles.notificationItem}>
                <div style={styles.notificationMessage}>{n.message}</div>
                <div style={styles.notificationDates}>From {new Date(n.startDate).toLocaleString()} to {new Date(n.endDate).toLocaleString()}</div>
                <button onClick={() => handleDelete(n._id)} style={styles.deleteNotificationBtn}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f4f8", padding: "16px", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { padding: "8px 12px", border: "none", borderRadius: 8, background: "#1e4d6b", color: "#fff", cursor: "pointer" },
  title: { margin: 0, fontSize: 20 },
  box: { background: "#fff", borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.08)", padding: 16, marginBottom: 16 },
  sectionTitle: { margin: "0 0 12px", fontSize: 16, fontWeight: 600 },
  error: { background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: 8, marginBottom: 10 },
  success: { background: "#dcfce7", color: "#15803d", padding: "10px", borderRadius: 8, marginBottom: 10 },
  textarea: { width: "100%", minHeight: 100, borderRadius: 8, border: "1px solid #cbd5e1", padding: 10, resize: "vertical", boxSizing: "border-box" },
  datetimeRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 },
  datetimeField: { display: "flex", flexDirection: "column", flex: "1 1 200px" },
  label: { fontSize: 12, color: "#475569", marginBottom: 6 },
  input: { padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 },
  info: { margin: "8px 0 16px", color: "#475569", fontSize: 13 },
  createButton: { background: "#1e4d6b", color: "#fff", padding: "10px 14px", border: "none", borderRadius: 10, cursor: "pointer" },
  list: { margin: 0, padding: 0, listStyle: "none" },
  notificationItem: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8 },
  notificationMessage: { fontWeight: 600, marginBottom: 0 },
  notificationDates: { fontSize: 12, color: "#64748b", marginBottom: 6 },
  deleteNotificationBtn: { alignSelf: "flex-start", background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 },
};
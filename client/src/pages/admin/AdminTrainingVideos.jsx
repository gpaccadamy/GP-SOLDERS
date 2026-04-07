import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiCopy, FiCheck, FiArrowLeft, FiVideo } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/training-videos";

const CATEGORIES = ["Training", "Weekly Test", "Functions", "Others"];

export default function AdminTrainingVideos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    category: CATEGORIES[0]
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch(API);
      setVideos(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.youtubeUrl) {
      setMsg({ type: "error", text: "Title and YouTube URL are required" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "✅ Training video added successfully!" });
        setForm({ title: "", description: "", youtubeUrl: "", category: CATEGORIES[0] });
        setShowForm(false);
        fetchVideos();
      } else {
        setMsg({ type: "error", text: "Failed to add video" });
      }
    } catch {
      setMsg({ type: "error", text: "Server error" });
    }
    setLoading(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this training video?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    fetchVideos();
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate("/admin")}>
          <FiArrowLeft size={20} />
        </button>
        <h1 style={styles.title}>Training Videos</h1>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          <FiPlus size={18} /> {showForm ? "Close" : "Add Video"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Add New Training Video</h3>
          <form onSubmit={handleSubmit}>
            <input
              style={styles.input}
              placeholder="Video Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              style={styles.textarea}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <select
              style={styles.input}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input
              style={styles.input}
              placeholder="YouTube URL[](https://youtube.com/watch?v=...)"
              value={form.youtubeUrl}
              onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
              required
            />

            {msg && <div style={msg.type === "success" ? styles.success : styles.error}>{msg.text}</div>}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? "Adding..." : "Add Training Video"}
            </button>
          </form>
        </div>
      )}

      {/* Video List */}
      <div style={styles.list}>
        {videos.length === 0 ? (
          <p style={{ textAlign: "center", color: "#8b949e", padding: "40px" }}>No training videos yet</p>
        ) : (
          videos.map((v) => (
            <div key={v._id} style={styles.videoItem}>
              <div style={styles.videoInfo}>
                <div style={styles.category}>{v.category}</div>
                <h4 style={styles.videoTitle}>{v.title}</h4>
                {v.description && <p style={styles.desc}>{v.description}</p>}
              </div>
              <div style={styles.actions}>
                <button style={styles.copyBtn} onClick={() => copyUrl(v.youtubeUrl, v._id)}>
                  {copied === v._id ? <FiCheck /> : <FiCopy />}
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(v._id)}>
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { background: "#0d1117", minHeight: "100vh", color: "#e6edf3", fontFamily: "'Inter', sans-serif" },
  header: { background: "#161b22", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #30363d" },
  backBtn: { background: "none", border: "none", color: "#8b949e", cursor: "pointer" },
  title: { flex: 1, fontSize: "1.25rem", fontWeight: "700" },
  addBtn: { background: "#1f6feb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },

  formCard: { margin: "20px", background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 20 },
  formTitle: { margin: "0 0 16px 0", color: "#58a6ff" },
  input: { width: "100%", padding: "12px", marginBottom: 12, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3" },
  textarea: { width: "100%", padding: "12px", marginBottom: 12, background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#e6edf3", minHeight: "80px", resize: "vertical" },
  submitBtn: { width: "100%", padding: "12px", background: "#238636", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" },

  list: { padding: "0 20px" },
  videoItem: { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 16, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  videoInfo: { flex: 1 },
  category: { fontSize: "0.75rem", color: "#58a6ff", marginBottom: 4 },
  videoTitle: { margin: "0 0 6px 0", fontSize: "1rem" },
  desc: { fontSize: "0.85rem", color: "#8b949e" },
  actions: { display: "flex", gap: 8 },
  copyBtn: { background: "#21262d", border: "1px solid #30363d", color: "#8b949e", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  deleteBtn: { background: "#da3633", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },

  success: { color: "#3fb950", margin: "10px 0" },
  error: { color: "#f85149", margin: "10px 0" },
};  
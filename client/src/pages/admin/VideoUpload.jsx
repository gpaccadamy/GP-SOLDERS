import { useState, useEffect } from "react";
import { FiTrash2, FiPlus, FiVideo, FiX, FiSearch, FiFilter, FiCopy, FiCheck } from "react-icons/fi";
import { MdOutlineOndemandVideo } from "react-icons/md";

const API = "https://academy-backend-e02j.onrender.com/api/videos";
const SUBJECTS = ["General Knowledge (GK)", "English", "Kannada", "Maths"];

export default function VideoUpload() {
  const [form, setForm] = useState({ subject: SUBJECTS[0], videoNumber: "", title: "", youtubeUrl: "" });
  const [videos, setVideos] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    try { const res = await fetch(API); setVideos(await res.json()); } catch {}
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        setMsg("✓ Video added");
        setForm({ subject: SUBJECTS[0], videoNumber: "", title: "", youtubeUrl: "" });
        setShowForm(false);
        fetchVideos();
      } else setMsg("✗ Failed to add");
    } catch { setMsg("✗ Server error"); }
    setLoading(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this video?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    fetchVideos();
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const colors = { 
    "General Knowledge (GK)": { bg: "#fef3c7", text: "#d97706", dot: "#f59e0b" },
    "English": { bg: "#dbeafe", text: "#2563eb", dot: "#3b82f6" },
    "Kannada": { bg: "#d1fae5", text: "#059669", dot: "#10b981" },
    "Maths": { bg: "#ede9fe", text: "#7c3aed", dot: "#8b5cf6" }
  };

  const filtered = videos.filter(v => {
    const matchSearch = !search || v.title?.toLowerCase().includes(search.toLowerCase()) || v.videoNumber?.toString().includes(search);
    const matchFilter = filter === "all" || v.subject === filter;
    return matchSearch && matchFilter;
  });

  const stats = SUBJECTS.map(s => ({ name: s, count: videos.filter(v => v.subject === s).length }));

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdOutlineOndemandVideo color="#fff" size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Video Library</h1>
                <p style={{ fontSize: 13, color: "#666", margin: "2px 0 0" }}>{videos.length} videos • {filtered.length} showing</p>
              </div>
            </div>
            <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "none", background: showForm ? "#ef4444" : "#667eea", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}>
              {showForm ? <><FiX size={16} /> Close</> : <><FiPlus size={16} /> Add Video</>}
            </button>
          </div>

          {/* Search & Filter */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f5f5f5", borderRadius: 10 }}>
              <FiSearch size={16} color="#999" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, outline: "none", color: "#333" }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#999", cursor: "pointer" }}><FiX size={14} /></button>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "#f5f5f5", borderRadius: 10 }}>
              <FiFilter size={16} color="#999" />
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{ background: "transparent", border: "none", fontSize: 14, color: "#333", outline: "none", cursor: "pointer" }}>
                <option value="all">All Subjects</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 900, margin: "20px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {stats.map(s => (
            <div key={s.name} onClick={() => setFilter(filter === s.name ? "all" : s.name)} style={{ flexShrink: 0, padding: "10px 16px", background: filter === s.name ? colors[s.name].bg : "#fff", borderRadius: 10, border: `1px solid ${filter === s.name ? colors[s.name].text + "30" : "#e5e5e5"}`, cursor: "pointer", transition: "all 0.2s" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#666" }}>{s.name.replace("General Knowledge (GK)", "GK")}</p>
              <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 600, color: filter === s.name ? colors[s.name].text : "#333" }}>{s.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ maxWidth: 900, margin: "0 auto 20px", padding: "0 20px", animation: "slideDown 0.25s ease" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#333" }}>Add New Video</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "block", fontWeight: 500 }}>Subject</label>
                  <select name="subject" value={form.subject} onChange={handleChange} style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 14, background: "#fafafa" }}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "block", fontWeight: 500 }}>Video Number</label>
                  <input name="videoNumber" type="number" value={form.videoNumber} onChange={handleChange} placeholder="e.g. 1" required style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 14, background: "#fafafa" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "block", fontWeight: 500 }}>Title</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Enter video title..." required style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 14, background: "#fafafa" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "block", fontWeight: 500 }}>YouTube URL</label>
                  <input name="youtubeUrl" value={form.youtubeUrl} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." required style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 14, background: "#fafafa" }} />
                </div>
              </div>
              {msg && <p style={{ margin: "12px 0 0", fontSize: 13, color: msg.includes("✓") ? "#059669" : "#dc2626" }}>{msg}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #e5e5e5", background: "#fff", color: "#666", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                <button disabled={loading} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#667eea", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>{loading ? "Adding..." : "Add Video"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 40px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "#999" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <FiVideo size={32} color="#ccc" />
            </div>
            <p style={{ margin: 0, fontSize: 15 }}>{search || filter !== "all" ? "No matching videos" : "No videos yet"}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#aaa" }}>{search || filter !== "all" ? "Try different search or filter" : "Add your first video to get started"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(v => {
              const theme = colors[v.subject] || { bg: "#f5f5f5", text: "#666", dot: "#999" };
              return (
                <div key={v._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "#fff", borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.2s", ":hover": { transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: theme.text, fontSize: 14, fontWeight: 700 }}>{v.videoNumber}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.dot }} />
                      <span style={{ fontSize: 11, color: theme.text, fontWeight: 500 }}>{v.subject}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => copyUrl(v.youtubeUrl, v._id)} title="Copy URL" style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e5e5e5", background: copied === v._id ? "#dcfce7" : "#fff", color: copied === v._id ? "#16a34a" : "#666", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
                      {copied === v._id ? <FiCheck size={16} /> : <FiCopy size={16} />}
                    </button>
                    <button onClick={() => handleDelete(v._id)} title="Delete" style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
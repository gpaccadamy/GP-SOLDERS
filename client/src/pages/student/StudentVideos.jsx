import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiX, FiPlay, FiGrid, FiGlobe,
  FiBook, FiVideo, FiSearch
} from "react-icons/fi";
import { MdOutlineCalculate } from "react-icons/md";
import { PiTextAa } from "react-icons/pi";

const API = import.meta.env.VITE_API_URL || "https://academy-backend-e02j.onrender.com/api/videos";

const SUBJECTS = {
  "General Knowledge (GK)": { icon: <FiGlobe />, color: "#f59e0b" },
  "English": { icon: <PiTextAa />, color: "#3b82f6" },
  "Kannada": { icon: <FiBook />, color: "#10b981" },
  "Maths": { icon: <MdOutlineCalculate />, color: "#8b5cf6" },
};

const TABS = [
  { id: "all", label: "All", icon: <FiGrid /> },
  ...Object.entries(SUBJECTS).map(([k, v]) => ({
    id: k,
    label: k.includes("GK") ? "GK" : k,
    ...v
  }))
];

function LitePlayer({ id, title, onClose }) {
  const [play, setPlay] = useState(false);

  return (
    <div style={styles.playerWrap}>
      {!play ? (
        <div style={styles.thumbWrap} onClick={() => setPlay(true)}>
          <img
            src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
            alt=""
            style={styles.thumb}
          />
          <div style={styles.overlay}>
            <div style={styles.playBtn}><FiPlay size={22} /></div>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={styles.closeBtn}>
            <FiX />
          </button>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          style={styles.iframe}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  );
}

export default function StudentVideos() {
  const nav = useNavigate();

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("all");
  const [playing, setPlaying] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(API)
      .then(r => r.json())
      .then(d => {
        setVideos(Array.isArray(d) ? d.filter(v => v?.youtubeId) : []);
        setLoading(false);
      })
      .catch(() => {
        setVideos([]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return videos.filter(v => {
      const matchSub = active === "all" || v?.subject === active;
      const matchSearch =
        !search ||
        (v?.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (v?.subject || "").toLowerCase().includes(search.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [videos, active, search]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, v) => {
      const s = v?.subject || "Other";
      (acc[s] ||= []).push(v);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => nav("/student")} style={styles.iconBtn}>
          <FiArrowLeft />
        </button>
        <span style={styles.title}>Video Classes</span>
        <span style={styles.count}>{filtered.length}</span>
      </div>

      {/* SEARCH */}
      <div style={styles.searchWrap}>
        <FiSearch />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          style={styles.input}
        />
        {search && (
          <button onClick={() => setSearch("")}>
            <FiX />
          </button>
        )}
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              ...styles.tab,
              background: active === t.id ? t.color : "#1e293b",
              color: active === t.id ? "#000" : "#94a3b8"
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* PLAYER */}
      {playing && (
        <div style={{ padding: 16 }}>
          <LitePlayer
            id={playing.youtubeId}
            title={playing.title}
            onClose={() => setPlaying(null)}
          />
          <h3>{playing.title}</h3>
        </div>
      )}

      {/* CONTENT */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No videos</p>
        ) : (
          Object.entries(grouped).map(([subject, vids]) => (
            <div key={subject}>
              <h4>{subject}</h4>

              {vids.map(v => (
                <div
                  key={v._id || v.youtubeId}
                  style={styles.card}
                  onClick={() => setPlaying(v)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                    style={styles.cardImg}
                  />
                  <div>
                    <p>{v.title}</p>
                    <small>Class {v.videoNumber}</small>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

    </div>
  );
}

const styles = {
  container: { background: "#0f172a", minHeight: "100vh", color: "#fff" },
  header: { display: "flex", alignItems: "center", padding: 12, gap: 10 },
  iconBtn: { background: "none", border: "none", color: "#fff" },
  title: { flex: 1 },
  count: { color: "#64748b" },

  searchWrap: { display: "flex", gap: 8, padding: 10, background: "#1e293b" },
  input: { flex: 1, background: "none", border: "none", color: "#fff" },

  tabs: { display: "flex", gap: 8, padding: 10 },
  tab: { padding: "6px 12px", borderRadius: 20, border: "none" },

  playerWrap: { position: "relative", paddingBottom: "56.25%" },
  thumbWrap: { position: "absolute", inset: 0, cursor: "pointer" },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  overlay: { position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.3)" },
  playBtn: { background: "#f59e0b", borderRadius: "50%", padding: 10 },
  iframe: { position: "absolute", width: "100%", height: "100%", border: "none" },
  closeBtn: { position: "absolute", top: 8, right: 8 },

  card: { display: "flex", gap: 10, marginBottom: 10, cursor: "pointer" },
  cardImg: { width: 100 }
};
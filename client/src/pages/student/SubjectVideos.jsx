import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiPlay } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL || "https://academy-backend-e02j.onrender.com/api/videos";

const SUBJECT_COLORS = {
  "General Knowledge (GK)": "#f59e0b",
  "English": "#3b82f6",
  "Kannada": "#10b981",
  "Maths": "#8b5cf6",
};

// inject spin keyframe once
const styleTag = document.createElement("style");
styleTag.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleTag);

function VideoPlayer({ video }) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    setPlay(false);
  }, [video.youtubeId]);

  return (
    <div style={s.playerBox}>
      {!play ? (
        <div style={s.thumbBox} onClick={() => setPlay(true)}>
          <img
            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt={video.title}
            style={s.thumb}
          />
          <div style={s.thumbOverlay}>
            <div style={s.playCircle}>
              <FiPlay size={20} fill="#fff" color="#fff" />
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
          title={video.title}
          style={s.iframe}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  );
}

export default function SubjectVideos() {
  const { subject } = useParams();
  const nav = useNavigate();
  const decodedSubject = decodeURIComponent(subject);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);

  const accentColor = SUBJECT_COLORS[decodedSubject] || "#6366f1";

  useEffect(() => {
    const token = localStorage.getItem("gp_token");
    const name = localStorage.getItem("gp_name");
    if (!token || !name) {
      nav("/student/login", {
        state: { from: { pathname: `/student/videos/${subject}` } },
      });
      return;
    }

    fetch(API)
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d.filter(v => v?.youtubeId) : [];
        const subjectVideos = all
          .filter(v => v.subject === decodedSubject)
          .sort((a, b) => (a.videoNumber || 0) - (b.videoNumber || 0));
        setVideos(subjectVideos);
        if (subjectVideos.length > 0) setPlaying(subjectVideos[0]);
        setLoading(false);
      })
      .catch(() => {
        setVideos([]);
        setLoading(false);
      });
  }, [nav, subject, decodedSubject]);

  const otherVideos = useMemo(() => {
    if (!playing) return videos;
    return videos.filter(v => v._id !== playing._id);
  }, [videos, playing]);

  const shortLabel = (subj) => {
    if (subj.includes("GK") || subj.includes("General")) return "GK";
    return subj;
  };

  return (
    <div style={s.page}>

      {/* HEADER */}
      <div style={s.header}>
        <button onClick={() => nav("/student/videos")} style={s.backBtn}>
          <FiArrowLeft size={18} />
        </button>
        <span style={s.headerTitle}>{shortLabel(decodedSubject)}</span>
        <div style={{ ...s.badge, background: accentColor }}>
          ● Videos
        </div>
      </div>

      {/* STATES */}
      {loading ? (
        <div style={s.center}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid #1e293b",
            borderTop: `3px solid ${accentColor}`,
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
            Loading videos...
          </p>
        </div>
      ) : videos.length === 0 ? (
        <div style={s.center}>
          <p style={{ color: "#94a3b8" }}>No videos found for this subject.</p>
        </div>
      ) : playing ? (
        <>
          {/* PLAYER */}
          <VideoPlayer video={playing} />

          {/* NOW PLAYING INFO */}
          <div style={s.nowPlaying}>
            <div style={{ ...s.classTag, background: accentColor + "22", color: accentColor }}>
              Class {playing.videoNumber}
            </div>
            <p style={s.nowTitle}>{playing.title}</p>
          </div>

          {/* DIVIDER */}
          <div style={s.divider}>
            <div style={{ ...s.dividerLine, background: accentColor }} />
            <span style={s.dividerText}>Up Next</span>
            <div style={{ ...s.dividerLine, background: accentColor }} />
          </div>

          {/* VIDEO LIST */}
          <div style={s.list}>
            {otherVideos.length === 0 ? (
              <p style={{ color: "#475569", textAlign: "center", padding: 20, fontSize: 13 }}>
                No other videos in this subject
              </p>
            ) : (
              otherVideos.map(v => (
                <div
                  key={v._id || v.youtubeId}
                  style={s.videoCard}
                  onClick={() => setPlaying(v)}
                >
                  <div style={s.cardThumbWrap}>
                    <img
                      src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                      alt={v.title}
                      style={s.cardThumb}
                    />
                    <div style={s.cardPlayOverlay}>
                      <FiPlay size={14} fill="#fff" color="#fff" />
                    </div>
                  </div>
                  <div style={s.cardInfo}>
                    <div style={{ ...s.cardClassTag, color: accentColor }}>
                      Class {v.videoNumber}
                    </div>
                    <p style={s.cardTitle}>{v.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

    </div>
  );
}

const s = {
  page: {
    background: "#0f172a",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
  },
  backBtn: {
    width: 36, height: 36,
    background: "rgba(255,255,255,0.08)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 20,
    letterSpacing: "0.3px",
  },
  playerBox: {
    position: "relative",
    width: "100%",
    paddingBottom: "56.25%",
    background: "#000",
  },
  thumbBox: {
    position: "absolute",
    inset: 0,
    cursor: "pointer",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  thumbOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 52, height: 52,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(6px)",
    border: "2px solid rgba(255,255,255,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  iframe: {
    position: "absolute",
    width: "100%",
    height: "100%",
    border: "none",
  },
  nowPlaying: {
    padding: "14px 16px 8px",
  },
  classTag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 20,
    marginBottom: 6,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  nowTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
    lineHeight: 1.4,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  list: {
    padding: "0 16px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  videoCard: {
    display: "flex",
    gap: 12,
    background: "#1e293b",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    padding: 10,
    alignItems: "center",
  },
  cardThumbWrap: {
    position: "relative",
    width: 110,
    height: 65,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  cardThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardPlayOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardClassTag: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#cbd5e1",
    lineHeight: 1.4,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
};

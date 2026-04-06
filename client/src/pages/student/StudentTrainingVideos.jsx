import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://academy-backend-e02j.onrender.com/api/training-videos";
const CATEGORIES = ["Training", "Weekly Test", "Functions", "Others"];

const CATEGORY_META = {
  Training: { icon: "🎯", color: "#f59e0b" },
  "Weekly Test": { icon: "📝", color: "#6366f1" },
  Functions: { icon: "⚡", color: "#10b981" },
  Others: { icon: "📂", color: "#ec4899" },
};

export default function StudentTrainingVideos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [playing, setPlaying] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load training videos", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchCategory = activeCategory === "all" || video.category === activeCategory;
      const matchSearch =
        !search ||
        video.title?.toLowerCase().includes(search.toLowerCase()) ||
        video.description?.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [videos, activeCategory, search]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all" || search) return null;
    const g = {};
    CATEGORIES.forEach((cat) => {
      const items = videos.filter((v) => v.category === cat);
      if (items.length > 0) g[cat] = items;
    });
    return g;
  }, [videos, activeCategory, search]);

  return (
    <div style={s.page}>
      <style>{css}</style>

      {/* Header */}
      <header style={s.header}>
        <button onClick={() => navigate("/student")} style={s.backBtn} className="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={s.headerCenter}>
          <span style={s.headerLabel}>LIBRARY</span>
          <h1 style={s.headerTitle}>Training Hub</h1>
        </div>
        <div style={s.countPill}>
          <span style={s.countNum}>{filteredVideos.length}</span>
          <span style={s.countTxt}>videos</span>
        </div>
      </header>

      {/* Hero Strip */}
      <div style={s.heroStrip}>
        <div style={s.heroGlow} />
        <div style={s.heroContent}>
          <p style={s.heroEyebrow}>Learn at your pace</p>
          <h2 style={s.heroHeading}>Sharpen your skills<br />with expert content</h2>
        </div>
        <div style={s.statsRow}>
          {CATEGORIES.map((cat) => {
            const count = videos.filter((v) => v.category === cat).length;
            const meta = CATEGORY_META[cat];
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={s.statChip} className="stat-chip">
                <span style={{ ...s.statIcon, background: meta.color + "22", color: meta.color }}>{meta.icon}</span>
                <div>
                  <p style={s.statCount}>{count}</p>
                  <p style={s.statLabel}>{cat}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <div style={{ ...s.searchBox, ...(searchFocused ? s.searchBoxFocused : {}) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search videos, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => setSearch("")} style={s.clearBtn} className="clear-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div style={s.filterRow}>
        <button
          onClick={() => setActiveCategory("all")}
          style={{ ...s.pill, ...(activeCategory === "all" ? s.pillActive : {}) }}
          className="pill"
        >
          All
        </button>
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                ...s.pill,
                ...(isActive ? { ...s.pillActive, background: meta.color, borderColor: meta.color } : {}),
              }}
              className="pill"
            >
              <span style={{ marginRight: 4, fontSize: 13 }}>{meta.icon}</span>
              {cat}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <main style={s.main}>
        {loading ? (
          <div style={s.stateWrap}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={s.skeleton} className="skeleton">
                <div style={s.skeletonThumb} />
                <div style={s.skeletonBody}>
                  <div style={{ ...s.skeletonLine, width: "60%", height: 10 }} />
                  <div style={{ ...s.skeletonLine, width: "90%", height: 14 }} />
                  <div style={{ ...s.skeletonLine, width: "75%", height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🎬</div>
            <p style={s.emptyTitle}>No videos found</p>
            <p style={s.emptySubtitle}>Try a different keyword or category</p>
            <button onClick={() => { setSearch(""); setActiveCategory("all"); }} style={s.resetBtn}>
              Reset filters
            </button>
          </div>
        ) : grouped && !search ? (
          Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} style={s.section}>
                <div style={s.sectionHeader}>
                  <span style={{ ...s.sectionDot, background: meta.color }} />
                  <h3 style={s.sectionTitle}>{cat}</h3>
                  <span style={s.sectionCount}>{items.length}</span>
                </div>
                {items.map((video) => (
                  <VideoCard key={video._id} video={video} meta={meta} onClick={() => setPlaying(video)} />
                ))}
              </div>
            );
          })
        ) : (
          filteredVideos.map((video) => {
            const meta = CATEGORY_META[video.category] || { icon: "📂", color: "#6b7280" };
            return <VideoCard key={video._id} video={video} meta={meta} onClick={() => setPlaying(video)} />;
          })
        )}
      </main>

      {/* Modal */}
      {playing && (
        <div style={s.backdrop} onClick={(e) => e.target === e.currentTarget && setPlaying(null)}>
          <div style={s.modal} className="modal-enter">
            <div style={s.modalTop}>
              <div style={s.modalHandle} />
              <button style={s.closeBtn} onClick={() => setPlaying(null)} className="close-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={s.iframeWrap}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={s.iframe}
              />
            </div>

            <div style={s.modalBody}>
              <div style={s.modalMeta}>
                <span style={{
                  ...s.modalCatBadge,
                  background: (CATEGORY_META[playing.category]?.color || "#f59e0b") + "22",
                  color: CATEGORY_META[playing.category]?.color || "#f59e0b",
                }}>
                  {CATEGORY_META[playing.category]?.icon} {playing.category}
                </span>
                <span style={s.modalDate}>
                  {new Date(playing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <h2 style={s.modalTitle}>{playing.title}</h2>
              {playing.description && <p style={s.modalDesc}>{playing.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, meta, onClick }) {
  return (
    <div style={s.card} className="video-card" onClick={onClick}>
      <div style={s.thumbWrap}>
        <img
          src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
          alt={video.title}
          style={s.thumb}
          loading="lazy"
        />
        <div style={s.thumbOverlay}>
          <div style={s.playBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
        <div style={{ ...s.catDot, background: meta.color }} />
      </div>
      <div style={s.cardBody}>
        <span style={{ ...s.catBadge, color: meta.color, background: meta.color + "18" }}>
          {meta.icon} {video.category}
        </span>
        <h3 style={s.cardTitle}>{video.title}</h3>
        {video.description && <p style={s.cardDesc}>{video.description}</p>}
        <div style={s.cardFoot}>
          <span style={s.cardDate}>
            {new Date(video.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <div style={s.watchBtn}>
            <span>Watch</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }

  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');

  .back-btn:hover { background: rgba(255,255,255,0.08) !important; }
  .back-btn:active { transform: scale(0.94); }

  .stat-chip:hover { transform: translateY(-2px); background: rgba(255,255,255,0.06) !important; }
  .stat-chip:active { transform: scale(0.97); }

  .pill:hover { background: rgba(255,255,255,0.08) !important; }
  .pill:active { transform: scale(0.96); }

  .clear-btn:hover { background: rgba(255,255,255,0.1) !important; }

  .video-card:hover { transform: translateY(-2px); background: #1c2536 !important; }
  .video-card:hover .play-btn { opacity: 1 !important; transform: scale(1) !important; }
  .video-card:active { transform: scale(0.99); }

  .close-btn:hover { background: rgba(255,255,255,0.12) !important; }

  @keyframes skeletonPulse { 0%,100% { opacity: 0.4 } 50% { opacity: 0.8 } }
  .skeleton { animation: skeletonPulse 1.6s ease-in-out infinite; }

  @keyframes modalSlide { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-enter { animation: modalSlide 0.3s cubic-bezier(0.34,1.56,0.64,1); }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  ::-webkit-scrollbar { display: none; }
`;

const s = {
  page: {
    minHeight: "100vh",
    background: "#0c1220",
    color: "#e2e8f0",
    fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif",
    overflowX: "hidden",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    background: "rgba(12,18,32,0.95)",
    backdropFilter: "blur(16px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  backBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  headerCenter: { flex: 1, textAlign: "center" },
  headerLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", display: "block" },
  headerTitle: { margin: 0, fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.01em" },
  countPill: {
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.25)",
    borderRadius: 20,
    padding: "5px 12px",
    textAlign: "center",
    flexShrink: 0,
  },
  countNum: { display: "block", fontSize: "0.95rem", fontWeight: 700, color: "#f59e0b", lineHeight: 1 },
  countTxt: { display: "block", fontSize: 9, color: "#92a0b3", letterSpacing: "0.06em", marginTop: 1 },

  // Hero
  heroStrip: {
    background: "linear-gradient(160deg, #111827 0%, #0c1220 60%)",
    padding: "24px 20px 20px",
    position: "relative",
    overflow: "hidden",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  heroContent: { marginBottom: 20, position: "relative" },
  heroEyebrow: { margin: "0 0 6px", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "#f59e0b", textTransform: "uppercase" },
  heroHeading: { margin: 0, fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em", color: "#f1f5f9" },
  statsRow: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, position: "relative" },
  statChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s",
    color: "#e2e8f0",
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  statCount: { margin: 0, fontWeight: 700, fontSize: "1.1rem", lineHeight: 1 },
  statLabel: { margin: 0, fontSize: 11, color: "#64748b", marginTop: 2 },

  // Search
  searchWrap: { padding: "16px 20px 10px" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#141e2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "13px 16px",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  searchBoxFocused: {
    borderColor: "rgba(245,158,11,0.4)",
    boxShadow: "0 0 0 3px rgba(245,158,11,0.08)",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    fontFamily: "inherit",
  },
  clearBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "none",
    color: "#94a3b8",
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s",
  },

  // Filter Row
  filterRow: { display: "flex", gap: 8, padding: "0 20px 16px", overflowX: "auto", scrollbarWidth: "none" },
  pill: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  pillActive: {
    background: "#f59e0b",
    borderColor: "#f59e0b",
    color: "#0c1220",
    fontWeight: 700,
  },

  // Main
  main: { padding: "4px 20px 100px" },

  // Section
  section: { marginBottom: 28 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  sectionTitle: { margin: 0, fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8", flex: 1 },
  sectionCount: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    color: "#64748b",
  },

  // Card
  card: {
    display: "flex",
    gap: 14,
    background: "#141e2e",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  thumbWrap: { width: 130, borderRadius: 12, overflow: "hidden", flexShrink: 0, position: "relative", aspectRatio: "16/10" },
  thumb: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  thumbOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
    transform: "scale(0.9)",
    transition: "all 0.2s",
  },
  catDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%" },
  cardBody: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 },
  catBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 8,
    display: "inline-block",
    width: "fit-content",
    letterSpacing: "0.02em",
  },
  cardTitle: { margin: 0, fontSize: "0.95rem", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.01em", color: "#f1f5f9" },
  cardDesc: { margin: 0, fontSize: "0.78rem", color: "#64748b", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 4 },
  cardDate: { fontSize: 11, color: "#475569" },
  watchBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#f59e0b",
    letterSpacing: "0.03em",
  },

  // Skeleton
  stateWrap: { display: "flex", flexDirection: "column", gap: 12 },
  skeleton: { display: "flex", gap: 14, background: "#141e2e", borderRadius: 18, padding: 12, border: "1px solid rgba(255,255,255,0.05)" },
  skeletonThumb: { width: 130, borderRadius: 12, background: "#1e2937", flexShrink: 0, aspectRatio: "16/10" },
  skeletonBody: { flex: 1, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" },
  skeletonLine: { background: "#1e2937", borderRadius: 6 },

  // Empty
  empty: { textAlign: "center", padding: "80px 20px" },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" },
  emptySubtitle: { margin: "0 0 24px", fontSize: "0.85rem", color: "#64748b" },
  resetBtn: {
    background: "rgba(245,158,11,0.12)",
    border: "1px solid rgba(245,158,11,0.3)",
    color: "#f59e0b",
    padding: "10px 24px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },

  // Modal
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(8,12,22,0.92)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  modal: {
    width: "100%",
    maxWidth: 500,
    background: "#111827",
    borderRadius: "24px 24px 0 0",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "none",
  },
  modalTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 20px 10px",
    position: "relative",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0",
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  iframeWrap: { width: "100%", aspectRatio: "16/9", background: "#000" },
  iframe: { width: "100%", height: "100%", border: "none", display: "block" },
  modalBody: { padding: "18px 20px 32px" },
  modalMeta: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalCatBadge: {
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 12px",
    borderRadius: 10,
    letterSpacing: "0.03em",
  },
  modalDate: { fontSize: 12, color: "#475569" },
  modalTitle: { margin: "0 0 10px", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em", color: "#f1f5f9" },
  modalDesc: { margin: 0, fontSize: "0.875rem", color: "#64748b", lineHeight: 1.6 },
};
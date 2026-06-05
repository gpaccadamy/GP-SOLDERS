import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { FiGlobe, FiBook } from "react-icons/fi";
import { MdOutlineCalculate } from "react-icons/md";
import { PiTextAa } from "react-icons/pi";

const SUBJECTS = [
  {
    id: "General Knowledge (GK)",
    label: "General Knowledge",
    desc: "GK & Current Affairs",
    icon: <FiGlobe size={22} />,
    gradient: ["#f59e0b", "#d97706"],
  },
  {
    id: "English",
    label: "English",
    desc: "Grammar & Writing",
    icon: <PiTextAa size={22} />,
    gradient: ["#3b82f6", "#2563eb"],
  },
  {
    id: "Kannada",
    label: "Kannada",
    desc: "Language & Literature",
    icon: <FiBook size={22} />,
    gradient: ["#10b981", "#059669"],
  },
  {
    id: "Maths",
    label: "Maths",
    desc: "Algebra & Arithmetic",
    icon: <MdOutlineCalculate size={22} />,
    gradient: ["#8b5cf6", "#7c3aed"],
  },
];

export default function StudentVideos() {
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("gp_token");
    const name = localStorage.getItem("gp_name");
    if (!token || !name) {
      nav("/student/login", { state: { from: { pathname: "/student/videos" } } });
    }
  }, [nav]);

  return (
    <div style={s.page}>

      {/* HEADER */}
      <div style={s.header}>
        <button onClick={() => nav("/student")} style={s.backBtn}>
          <FiArrowLeft size={18} />
        </button>
        <span style={s.headerTitle}>Video Class</span>
        <div style={{ width: 36 }} />
      </div>

      {/* HERO BANNER */}
      <div style={s.hero}>
        <div style={s.heroTag}>📚 Live Classes</div>
        <h2 style={s.heroH2}>Let's join<br />your class</h2>
        <p style={s.heroP}>Choose a class to join now</p>
        <div style={s.heroIcon}>🎓</div>
        <div style={s.heroBubble1} />
        <div style={s.heroBubble2} />
      </div>

      {/* SECTION TITLE */}
      <p style={s.sectionTitle}>Select a Subject</p>

      {/* SUBJECT CARDS */}
      <div style={s.cards}>
        {SUBJECTS.map((sub) => (
          <div
            key={sub.id}
            style={{
              ...s.card,
              background: `linear-gradient(135deg, ${sub.gradient[0]}, ${sub.gradient[1]})`,
            }}
            onClick={() => nav(`/student/videos/${encodeURIComponent(sub.id)}`)}
          >
            <div style={s.cardIcon}>{sub.icon}</div>
            <div style={s.cardInfo}>
              <div style={s.cardName}>{sub.label}</div>
              <div style={s.cardDesc}>{sub.desc}</div>
            </div>
            <button
              style={s.joinBtn}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                nav(`/student/videos/${encodeURIComponent(sub.id)}`);
              }}
            >
              Join
            </button>
          </div>
        ))}
      </div>

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
    justifyContent: "space-between",
    padding: "18px 20px 12px",
  },
  backBtn: {
    width: 36, height: 36,
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
  },
  hero: {
    margin: "0 16px 20px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
    borderRadius: 20,
    padding: "22px 20px",
    position: "relative",
    overflow: "hidden",
    minHeight: 130,
  },
  heroTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  heroH2: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    lineHeight: 1.2,
    marginBottom: 6,
    position: "relative",
    zIndex: 1,
  },
  heroP: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    position: "relative",
    zIndex: 1,
  },
  heroIcon: {
    position: "absolute",
    right: 18, bottom: 14,
    fontSize: 42,
    opacity: 0.9,
  },
  heroBubble1: {
    position: "absolute",
    right: -20, top: -20,
    width: 140, height: 140,
    background: "rgba(255,255,255,0.08)",
    borderRadius: "50%",
  },
  heroBubble2: {
    position: "absolute",
    right: 30, bottom: -30,
    width: 100, height: 100,
    background: "rgba(255,255,255,0.06)",
    borderRadius: "50%",
  },
  sectionTitle: {
    padding: "0 20px 12px",
    fontSize: 15,
    fontWeight: 700,
    color: "#e2e8f0",
  },
  cards: {
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 16,
    cursor: "pointer",
  },
  cardIcon: {
    width: 46, height: 46,
    borderRadius: 14,
    background: "rgba(255,255,255,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },
  joinBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1.5px solid rgba(255,255,255,0.35)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "7px 18px",
    borderRadius: 20,
    cursor: "pointer",
    flexShrink: 0,
  },
};

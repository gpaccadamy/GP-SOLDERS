import { useState, useEffect, useRef } from "react";
import { FiUpload, FiTrash2, FiCalendar, FiClock, FiEdit2, FiSave, FiX, FiList, FiArrowLeft, FiCheckCircle, FiAlertCircle, FiRadio  } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const API = "https://academy-backend-e02j.onrender.com/api/exam";

const TABS = [
  { id: "upload",    label: "Upload",    icon: <FiUpload size={14}/> },
  { id: "drafts",    label: "Drafts",    icon: <FiList size={14}/> },
  { id: "scheduled", label: "Scheduled", icon: <FiCalendar size={14}/> },
];

export default function AdminExam() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upload");
  const [liveStatus, setLiveStatus] = useState(null);
  const [license, setLicense] = useState(null);
  const [countdown, setCountdown] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    checkStatus();
    fetchLicense();
  }, []);

  const fetchLicense = async () => {
    try {
      const r = await fetch(`${API}/license`);
      const data = await r.json();
      setLicense(data);
    } catch {}
  };

  const checkStatus = async () => {
    try {
      const r = await fetch(`${API}/active-exam`);
      const d = await r.json();
      setLiveStatus(d);
      startStatusCountdown(d);
    } catch {}
  };

  const startStatusCountdown = (data) => {
    clearInterval(timerRef.current);
    if (!data || data.state === "none") return;
    const target = data.state === "live" ? new Date(data.exam.expiresAt) : new Date(data.exam.scheduledAt);
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - new Date()) / 1000));
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      setCountdown(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      if (diff === 0) { clearInterval(timerRef.current); setTimeout(checkStatus, 1000); }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  };

  const cancelExam = async (id) => {
    if (!window.confirm("Cancel this exam?")) return;
    await fetch(`${API}/cancel-exam/${id}`, { method: "POST" });
    checkStatus();
  };

  return (
    <div style={s.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600&display=swap'); @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}}
        .adminExamHeader { flex-direction: column !important; align-items: stretch !important; }
        .adminExamHeaderRight { flex-wrap: wrap !important; justify-content: space-between !important; width: 100% !important; }
        .adminExamLicenseBadge { width: 100% !important; justify-content: space-between !important; }
        .adminExamStatusBadge { width: 100% !important; justify-content: center !important; }
        .adminExamStatusPanel { margin: 16px 8px 0 !important; }
        .adminExamTabBar { overflow-x: auto !important; padding: 0 8px !important; }
        .adminExamTabBar button { min-width: 110px !important; white-space: nowrap !important; }
        .adminExamBody { padding: 12px 8px !important; }
        .adminExamFormGrid { grid-template-columns: 1fr !important; }
        .adminExamQOptions { grid-template-columns: 1fr !important; }
        .adminExamDraftItem { flex-direction: column !important; align-items: stretch !important; }
        .adminExamDraftInfo { width: 100% !important; }
        .adminExamUploadZone { padding: 18px !important; }
        .adminExamCard { padding: 16px !important; }
        .adminExamCountDownTime { font-size: 1.5rem !important; }
        .adminExamBtnDanger { width: 100% !important; }
        .adminExamGuideTh, .adminExamGuideTd { font-size: 0.72rem !important; padding: 6px 8px !important; }
        @media (max-width: 768px) {
          .adminExamHeader { flex-direction: column !important; align-items: stretch !important; }
          .adminExamHeaderRight { flex-wrap: wrap !important; justify-content: space-between !important; width: 100% !important; }
          .adminExamStatusPanel { margin: 16px 8px 0 !important; }
          .adminExamTabBar { overflow-x: auto !important; padding: 0 8px !important; }
          .adminExamTabBar button { min-width: 110px !important; white-space: nowrap !important; }
          .adminExamBody { padding: 12px 8px !important; }
          .adminExamFormGrid { grid-template-columns: 1fr !important; }
          .adminExamQOptions { grid-template-columns: 1fr !important; }
          .adminExamDraftItem { flex-direction: column !important; align-items: stretch !important; }
          .adminExamDraftInfo { width: 100% !important; }
          .adminExamUploadZone { padding: 18px !important; }
          .adminExamCard { padding: 16px !important; }
          .adminExamCountDownTime { font-size: 1.5rem !important; }
          .adminExamBtnDanger { width: 100% !important; }
          .adminExamGuideTh, .adminExamGuideTd { font-size: 0.72rem !important; padding: 6px 8px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={s.header} className="adminExamHeader">
        <button style={s.backBtn} onClick={() => navigate("/admin")}><FiArrowLeft size={18}/></button>
        <h1 style={s.headerTitle}>EXAM SCHEDULER</h1>
        <div style={s.headerRight} className="adminExamHeaderRight">
          {license && (
            <div style={s.licenseBadge} className="adminExamLicenseBadge">
              <div style={s.licenseText}>
                <span style={s.licenseNumber}>{license.totalConducted}</span>
                <span style={s.licenseLabel}>used</span>
              </div>
              <div style={s.licenseText}>
                <span style={s.licenseNumber}>{license.totalAllowed}</span>
                <span style={s.licenseLabel}>total</span>
              </div>
            </div>
          )}
          {liveStatus && liveStatus.state !== "none" && (
            <div style={{ ...s.statusBadge, background: liveStatus.state === "live" ? "rgba(63,185,80,0.15)" : "rgba(240,165,0,0.15)", borderColor: liveStatus.state === "live" ? "#3fb950" : "#f0a500", color: liveStatus.state === "live" ? "#3fb950" : "#f0a500" }} className="adminExamStatusBadge">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", animation: "pulse 1.5s infinite" }} />
              {liveStatus.state === "live" ? "LIVE" : "SCHEDULED"}
            </div>
          )}
        </div>
      </div>

      {/* LIVE STATUS PANEL */}
      {liveStatus && liveStatus.state !== "none" && (
        <div style={{ ...s.statusPanel, borderColor: liveStatus.state === "live" ? "rgba(63,185,80,0.4)" : "rgba(240,165,0,0.35)", background: liveStatus.state === "live" ? "rgba(63,185,80,0.07)" : "rgba(240,165,0,0.06)" }} className="adminExamStatusPanel">
          <div style={s.statusPanelHeader}>
            <FiRadio size={16} color={liveStatus.state === "live" ? "#3fb950" : "#f0a500"} />
            <span style={{ ...s.statusPanelTitle, color: liveStatus.state === "live" ? "#3fb950" : "#f0a500" }}>
              {liveStatus.state === "live" ? "🟢 Exam is LIVE" : "📅 Exam Scheduled"}
            </span>
          </div>
          <div style={s.statusPanelName}>{liveStatus.exam.title} · {liveStatus.exam.subject} · Test #{liveStatus.exam.testNumber}</div>
          <div style={s.countdownBox}>
            <div style={s.countdownLabel}>{liveStatus.state === "live" ? "Time Remaining" : "Starts In"}</div>
            <div style={{ ...s.countdownTime, color: liveStatus.state === "live" ? "#3fb950" : "#f0a500" }} className="adminExamCountDownTime">{countdown}</div>
          </div>
          <div style={s.statusMeta}>{liveStatus.exam.totalQuestions} questions · {liveStatus.exam.durationMinutes} mins</div>
          <button style={s.btnDanger} onClick={() => cancelExam(liveStatus.exam._id)}>Cancel Exam</button>
        </div>
      )}

      {/* TABS */}
      <div style={s.tabBar} className="adminExamTabBar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...s.tabBtn, ...(tab === t.id ? s.tabActive : {}) }}>
            {t.icon}<span style={{ marginLeft: 5 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={s.body} className="adminExamBody">
        {tab === "upload"    && <UploadTab onDone={() => { setTab("drafts"); }} />}
        {tab === "drafts"    && <DraftsTab onScheduled={() => { checkStatus(); setTab("scheduled"); }} />}
        {tab === "scheduled" && <ScheduledTab onCancel={checkStatus} />}
        {tab === "license"   && <LicenseTab license={license} onUpdate={fetchLicense} />}
      </div>
    </div>
  );
}

// ─── UPLOAD TAB ────────────────────────────────
function UploadTab({ onDone }) {
  const [form, setForm] = useState({ title: "", subject: "", testNumber: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async () => {
    if (!form.title || !form.subject || !form.testNumber) return setMsg({ type: "error", text: "Fill all fields" });
    if (!file) return setMsg({ type: "error", text: "Select an Excel file" });
    setLoading(true); setMsg(null);
    const fd = new FormData();
    fd.append("examFile", file);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    try {
      const r = await fetch(`${`${API}/upload-exam`}`, { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) {
        setMsg({ type: "success", text: `✅ ${d.totalQuestions} questions saved as draft!` });
        setForm({ title: "", subject: "", testNumber: "" }); setFile(null);
        setTimeout(onDone, 1500);
      } else setMsg({ type: "error", text: d.error || "Upload failed" });
    } catch { setMsg({ type: "error", text: "Server error" }); }
    setLoading(false);
  };

  return (
    <div>
      <DarkCard title="Upload Excel Question Paper" icon="📊">
        <div style={s.formGrid} className="adminExamFormGrid">
          <DarkField label="Exam Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Army GK Test" />
          <DarkField label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="e.g. General Knowledge" />
          <DarkField label="Test Number" value={form.testNumber} type="number" onChange={(v) => setForm({ ...form, testNumber: v })} placeholder="1" />
        </div>

        <div style={{ ...s.uploadZone, borderColor: file ? "#1f6feb" : "#30363d" }} className="adminExamUploadZone" onClick={() => document.getElementById("xlFile").click()}>
          <FiUpload size={24} color={file ? "#1f6feb" : "#8b949e"} />
          <span style={{ fontSize: "0.85rem", color: file ? "#1f6feb" : "#8b949e", marginTop: 6 }}>{file ? file.name : "Click to choose Excel (.xlsx/.xls)"}</span>
          <input id="xlFile" type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={(e) => setFile(e.target.files[0])} />
        </div>

        {msg && <Alert msg={msg} />}
        <button style={s.btnAccent} onClick={handleSubmit} disabled={loading}><FiUpload size={14}/> {loading ? "Processing..." : "Upload & Save Draft"}</button>
      </DarkCard>

      <DarkCard title="Excel Format Guide" icon="📋">
        <div style={{ overflowX: "auto" }}>
          <table style={s.guideTable}>
            <thead><tr>{["Col A: Q.No","Col B: Question","Col C: A","Col D: B","Col E: C","Col F: D","Col G: Answer"].map(h=><th key={h} style={s.guideTh}>{h}</th>)}</tr></thead>
            <tbody><tr><td style={s.guideTd}>1</td><td style={s.guideTd}>What is 2+2?</td><td style={s.guideTd}>2</td><td style={s.guideTd}>4</td><td style={s.guideTd}>6</td><td style={s.guideTd}>8</td><td style={s.guideTd}>B</td></tr></tbody>
          </table>
        </div>
      </DarkCard>
    </div>
  );
}

// ─── DRAFTS TAB ────────────────────────────────
function DraftsTab({ onScheduled }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [schedForm, setSchedForm] = useState({ scheduledAt: "", durationMinutes: "" });
  const [msg, setMsg] = useState(null);
  const [showSched, setShowSched] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/drafts`); setDrafts(await r.json()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectDraft = async (id) => {
    try {
      const r = await fetch(`${API}/drafts/${id}`);
      const d = await r.json();
      setSelected(d); setQuestions(d.questions); setEditing(null); setShowSched(true);
    } catch { setMsg({ type: "error", text: "Failed to load draft" }); }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    await fetch(`${API}/drafts/${id}`, { method: "DELETE" });
    if (selected?._id === id) { setSelected(null); setShowSched(false); }
    load();
  };

  const saveEdits = async () => {
    try {
      const r = await fetch(`${API}/drafts/${selected._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questions, totalQuestions: questions.length }) });
      if (r.ok) setMsg({ type: "success", text: "Changes saved!" });
      else setMsg({ type: "error", text: "Save failed" });
    } catch { setMsg({ type: "error", text: "Error" }); }
  };

  const scheduleExam = async () => {
    if (!schedForm.scheduledAt || !schedForm.durationMinutes) return setMsg({ type: "error", text: "Fill date and duration" });
    if (new Date(schedForm.scheduledAt) <= new Date()) return setMsg({ type: "error", text: "Time must be in the future" });
    try {
      const r = await fetch(`${API}/schedule/${selected._id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: schedForm.scheduledAt, durationMinutes: Number(schedForm.durationMinutes) }),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg({ type: "success", text: `✅ Scheduled! (${d.licenseUsed}/${d.licenseTotal} used)` });
        setSelected(null); setShowSched(false); load();
        setTimeout(onScheduled, 1500);
      } else setMsg({ type: "error", text: d.error || "Failed" });
    } catch { setMsg({ type: "error", text: "Error" }); }
  };

  return (
    <div>
      <DarkCard title="Saved Drafts" icon="📁">
        {loading ? <Loader /> : drafts.length === 0 ? <Empty text="No drafts yet. Upload an exam." /> : (
          drafts.map((d) => (
            <div key={d._id} style={s.draftItem} className="adminExamDraftItem">
              <div style={s.draftInfo} className="adminExamDraftInfo">
                <div style={s.draftTitle}>{d.title}</div>
                <div style={s.draftMeta}>{d.subject} · Test #{d.testNumber} · {d.totalQuestions} Qs</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={s.btnSmAccent} onClick={() => selectDraft(d._id)}><FiEdit2 size={12}/> Edit</button>
                <button style={s.btnSmDanger} onClick={() => deleteDraft(d._id)}><FiTrash2 size={12}/></button>
              </div>
            </div>
          ))
        )}
      </DarkCard>

      {selected && (
        <DarkCard title={`Questions — ${selected.title}`} icon="📝">
          <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ ...s.qCard, borderColor: editing === i ? "#1f6feb" : "#30363d" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={s.qNum}>{q.questionNumber || i + 1}</div>
                  <div style={{ flex: 1 }}>
                    {editing === i ? (
                      <textarea value={q.questionText} onChange={(e) => { const qs = [...questions]; qs[i] = { ...qs[i], questionText: e.target.value }; setQuestions(qs); }} style={s.qTextArea} />
                    ) : (
                      <div style={s.qTextDisplay}>{q.questionText}</div>
                    )}
                    <div style={s.qOptions} className="adminExamQOptions">
                      {["A","B","C","D"].map((opt) => (
                        <div key={opt} style={{ ...s.qOpt, borderColor: q.correctAnswer === opt ? "#3fb950" : "#30363d", background: q.correctAnswer === opt ? "rgba(63,185,80,0.08)" : "transparent" }}>
                          <span style={{ ...s.qOptLetter, color: q.correctAnswer === opt ? "#3fb950" : "#8b949e" }}>{opt}</span>
                          {editing === i ? (
                            <input value={q.options[opt] || ""} onChange={(e) => { const qs = [...questions]; qs[i] = { ...qs[i], options: { ...qs[i].options, [opt]: e.target.value } }; setQuestions(qs); }} style={s.optInput} />
                          ) : (
                            <span style={{ fontSize: "0.8rem" }}>{q.options[opt]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {editing === i && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: "0.78rem", color: "#8b949e" }}>Answer:</label>
                        <select value={q.correctAnswer} onChange={(e) => { const qs = [...questions]; qs[i] = { ...qs[i], correctAnswer: e.target.value }; setQuestions(qs); }} style={s.ansSelect}>
                          {["A","B","C","D"].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <button style={s.btnSmAccent} onClick={() => setEditing(null)}><FiCheckCircle size={12}/> Done</button>
                      </div>
                    )}
                  </div>
                  {editing !== i && <button style={s.editIconBtn} onClick={() => setEditing(i)}><FiEdit2 size={13}/></button>}
                </div>
              </div>
            ))}
          </div>
          {msg && <Alert msg={msg} />}
          <button style={{ ...s.btnAccent, marginTop: 12 }} onClick={saveEdits}><FiSave size={14}/> Save Changes</button>
        </DarkCard>
      )}

      {showSched && selected && (
        <DarkCard title="Schedule Exam" icon="📅" highlight>
          <div style={s.formGrid}>
            <DarkField label="Start Date & Time" type="datetime-local" value={schedForm.scheduledAt} onChange={(v) => setSchedForm({ ...schedForm, scheduledAt: v })} />
            <DarkField label="Duration (minutes)" type="number" value={schedForm.durationMinutes} onChange={(v) => setSchedForm({ ...schedForm, durationMinutes: v })} placeholder="e.g. 60" />
          </div>
          {schedForm.scheduledAt && schedForm.durationMinutes && (
            <div style={s.schedPreview}>
              <strong style={{ color: "#f0a500" }}>📅 Start:</strong> {new Date(schedForm.scheduledAt).toLocaleString()}<br />
              <strong style={{ color: "#f0a500" }}>⏱ Duration:</strong> {schedForm.durationMinutes} minutes<br />
              <strong style={{ color: "#f0a500" }}>🔴 End:</strong> {new Date(new Date(schedForm.scheduledAt).getTime() + Number(schedForm.durationMinutes) * 60000).toLocaleString()}
            </div>
          )}
          {msg && <Alert msg={msg} />}
          <button style={s.btnSchedule} onClick={scheduleExam}><FiCalendar size={14}/> Confirm Schedule</button>
        </DarkCard>
      )}
    </div>
  );
}

// ─── SCHEDULED TAB ─────────────────────────────
function ScheduledTab({ onCancel }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await fetch(`${API}/scheduled-exams`); setExams(await r.json()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this exam?")) return;
    await fetch(`${API}/cancel-exam/${id}`, { method: "POST" });
    load(); onCancel();
  };

  const statusColor = { scheduled: "#f0a500", live: "#3fb950", ended: "#8b949e" };

  return (
    <DarkCard title="All Scheduled Exams" icon="📅">
      {loading ? <Loader /> : exams.length === 0 ? <Empty text="No scheduled exams yet." /> : (
        exams.map((e) => (
          <div key={e._id} style={s.draftItem}>
            <div style={s.draftInfo}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={s.draftTitle}>{e.title}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${statusColor[e.status]}`, color: statusColor[e.status] }}>{e.status.toUpperCase()}</span>
              </div>
              <div style={s.draftMeta}>{e.subject} · Test #{e.testNumber} · {e.totalQuestions} Qs · {e.durationMinutes} min</div>
              <div style={s.draftMeta}>{new Date(e.scheduledAt).toLocaleString()}</div>
            </div>
            {(e.status === "scheduled" || e.status === "live") && (
              <button style={s.btnSmDanger} onClick={() => cancel(e._id)}>Cancel</button>
            )}
          </div>
        ))
      )}
    </DarkCard>
  );
}

// ─── SHARED ────────────────────────────────────
function DarkCard({ title, icon, children, highlight }) {
  return (
    <div style={{ ...s.card, borderColor: highlight ? "rgba(240,165,0,0.35)" : "#30363d", background: highlight ? "rgba(240,165,0,0.04)" : "#161b22" }}>
      <div style={s.cardTitle}>{icon && <span style={{ marginRight: 7 }}>{icon}</span>}{title}</div>
      {children}
    </div>
  );
}
function DarkField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      {label && <label style={s.fieldLabel}>{label}</label>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={s.darkInput} />
    </div>
  );
}
function Alert({ msg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: `1px solid ${msg.type === "success" ? "#238636" : "#da3633"}`, background: msg.type === "success" ? "rgba(35,134,54,0.15)" : "rgba(218,54,51,0.15)", color: msg.type === "success" ? "#3fb950" : "#f85149", fontSize: "0.88rem", margin: "12px 0" }}>
      {msg.type === "success" ? <FiCheckCircle size={14}/> : <FiAlertCircle size={14}/>}
      {msg.text}
    </div>
  );
}
function Loader() { return <div style={{ textAlign: "center", padding: 30, color: "#8b949e" }}>Loading...</div>; }
function Empty({ text }) { return <div style={{ textAlign: "center", padding: 24, color: "#8b949e", fontSize: "0.88rem" }}>{text}</div>; }

const s = {
  root: { background: "#0d1117", minHeight: "100vh", color: "#e6edf3", fontFamily: "'Inter',sans-serif", paddingBottom: 40 },
  header: { background: "#161b22", borderBottom: "1px solid #30363d", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 },
  backBtn: { background: "none", border: "none", color: "#8b949e", cursor: "pointer", display: "flex", padding: 0 },
  headerTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", fontWeight: 700, letterSpacing: 1, flex: 1 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  licBadge: { background: "#21262d", border: "1px solid", borderRadius: 10, padding: "5px 10px", display: "flex", flexDirection: "column", alignItems: "center" },
  licNum: { fontFamily: "'Rajdhani',sans-serif", fontSize: "0.95rem", fontWeight: 700, lineHeight: 1 },
  licLabel: { fontSize: "0.58rem", color: "#8b949e", textTransform: "uppercase" },
  statusBadge: { display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: "1px solid", fontSize: "0.72rem", fontWeight: 700 },

  statusPanel: { margin: "16px 16px 0", border: "1px solid", borderRadius: 12, padding: 16 },
  card: { border: "1px solid", borderRadius: 12, padding: 20, marginBottom: 16 },
  statusPanelHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  statusPanelTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1rem", fontWeight: 700 },
  statusPanelName: { fontSize: "0.88rem", fontWeight: 600, marginBottom: 10, color: "#e6edf3" },
  countdownBox: { background: "#21262d", borderRadius: 10, padding: "12px", textAlign: "center", marginBottom: 10 },
  countdownLabel: { fontSize: "0.72rem", color: "#8b949e", textTransform: "uppercase", marginBottom: 4 },
  countdownTime: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1.8rem", fontWeight: 700, letterSpacing: 2 },
  statusMeta: { fontSize: "0.78rem", color: "#8b949e", marginBottom: 10 },

  tabBar: { display: "flex", borderBottom: "1px solid #30363d", padding: "0 16px" },
  tabBtn: { display: "flex", alignItems: "center", padding: "10px 14px", background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit", borderBottom: "2px solid transparent", gap: 5 },
  tabActive: { color: "#58a6ff", borderBottom: "2px solid #58a6ff" },
  body: { padding: "16px" },

  card: { border: "1px solid", borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontFamily: "'Rajdhani',sans-serif", fontSize: "1rem", fontWeight: 700, marginBottom: 16, letterSpacing: 0.5 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 4 },
  fieldLabel: { display: "block", fontSize: "0.75rem", color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 },
  darkInput: { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 8, padding: "9px 12px", color: "#e6edf3", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  uploadZone: { border: "2px dashed", borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 12, transition: "border-color 0.2s" },

  btnAccent: { display: "inline-flex", alignItems: "center", gap: 7, background: "#1f6feb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: 7, background: "#da3633", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" },
  licenseBadge: { display: "flex", alignItems: "center", gap: "12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: "12px", padding: "10px 14px", color: "#c9d1d9", marginRight: "12px" },
  licenseText: { display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.2 },
  licenseNumber: { fontSize: "1rem", fontWeight: 700, color: "#58a6ff" },
  licenseLabel: { fontSize: "0.75rem", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em" },
  btnSmAccent: { display: "inline-flex", alignItems: "center", gap: 4, background: "#1f6feb", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" },
  btnSmDanger: { display: "inline-flex", alignItems: "center", gap: 4, background: "#da3633", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" },
  btnSchedule: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#d29922,#f0a500)", color: "#000", border: "none", padding: "13px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", cursor: "pointer", width: "100%", fontFamily: "inherit" },

  draftItem: { display: "flex", alignItems: "center", gap: 10, background: "#21262d", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", marginBottom: 8 },
  draftInfo: { flex: 1, minWidth: 0 },
  draftTitle: { fontWeight: 600, fontSize: "0.93rem", color: "#e6edf3", marginBottom: 2 },
  draftMeta: { fontSize: "0.76rem", color: "#8b949e" },

  qCard: { background: "#0d1117", border: "1px solid", borderRadius: 10, padding: 12 },
  qNum: { width: 24, height: 24, borderRadius: "50%", background: "#1f6feb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0, marginTop: 2 },
  qTextDisplay: { fontSize: "0.88rem", lineHeight: 1.5, marginBottom: 8, cursor: "pointer", color: "#e6edf3" },
  qTextArea: { width: "100%", background: "#161b22", border: "1px solid #1f6feb", borderRadius: 6, padding: "7px 10px", color: "#e6edf3", fontSize: "0.85rem", fontFamily: "inherit", resize: "vertical", minHeight: 50, outline: "none", marginBottom: 8, boxSizing: "border-box" },
  qOptions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 },
  qOpt: { background: "transparent", border: "1px solid", borderRadius: 6, padding: "5px 8px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 5 },
  qOptLetter: { fontWeight: 700, fontSize: "0.72rem", minWidth: 12 },
  optInput: { flex: 1, background: "#21262d", border: "none", color: "#e6edf3", fontSize: "0.78rem", fontFamily: "inherit", outline: "none", width: "100%" },
  ansSelect: { background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#e6edf3", padding: "4px 8px", fontSize: "0.82rem", fontFamily: "inherit" },
  editIconBtn: { background: "none", border: "none", color: "#8b949e", cursor: "pointer", padding: 4, flexShrink: 0 },

  schedPreview: { background: "#21262d", border: "1px solid rgba(240,165,0,0.2)", borderRadius: 8, padding: "12px 14px", fontSize: "0.83rem", color: "#8b949e", lineHeight: 1.8, marginBottom: 14 },

  guideTable: { borderCollapse: "collapse", fontSize: "0.78rem", width: "100%" },
  guideTh: { background: "#21262d", padding: "7px 10px", border: "1px solid #30363d", textAlign: "left", whiteSpace: "nowrap", color: "#8b949e" },
  guideTd: { padding: "7px 10px", border: "1px solid #30363d", color: "#e6edf3" },
};
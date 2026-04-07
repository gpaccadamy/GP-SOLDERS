import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { FiArrowLeft, FiDownload, FiSearch, FiFilter } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/exam";

export default function AdminResults() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [allResults, setAllResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState("all");

  // Fetch all results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/all-results`);
        if (res.ok) {
          const data = await res.json();
          setAllResults(data);
          setFilteredResults(data);
          setError("");
        } else {
          setError("Failed to load results");
        }
      } catch (err) {
        setError("Connection error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Filter results based on search and exam selection
  useEffect(() => {
    let results = allResults;

    // Filter by exam
    if (selectedExam !== "all") {
      results = results.filter(r => r.examId === selectedExam);
    }

    // Filter by search term (name or mobile)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        r =>
          r.studentName.toLowerCase().includes(term) ||
          r.studentMobile.toLowerCase().includes(term)
      );
    }

    setFilteredResults(results);
  }, [searchTerm, selectedExam, allResults]);

  // Get unique exams for dropdown
  const uniqueExams = useMemo(() => {
    const exams = {};
    allResults.forEach(r => {
      if (!exams[r.examId]) {
        exams[r.examId] = {
          id: r.examId,
          title: r.examTitle,
          subject: r.examSubject,
        };
      }
    });
    return Object.values(exams);
  }, [allResults]);

  // Group results by examId and sort
  const groupedResults = useMemo(() => {
    const groups = {};
    filteredResults.forEach(result => {
      if (!groups[result.examId]) {
        groups[result.examId] = [];
      }
      groups[result.examId].push(result);
    });

    // Sort students by score within each group
    Object.keys(groups).forEach(examId => {
      groups[examId].sort((a, b) => {
        const scoreA = (a.correct / a.total) * 100;
        const scoreB = (b.correct / b.total) * 100;
        return scoreB - scoreA;
      });
    });

    return groups;
  }, [filteredResults]);

  // Calculate stats
  const stats = useMemo(() => {
    if (filteredResults.length === 0) {
      return {
        totalStudents: 0,
        totalExams: 0,
        averageScore: 0,
        topScore: 0,
      };
    }

    const uniqueStudents = new Set(
      filteredResults.map(r => r.studentMobile)
    ).size;
    const uniqueExams = new Set(filteredResults.map(r => r.examId)).size;

    const scores = filteredResults.map(r => (r.correct / r.total) * 100);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const topScore = Math.max(...scores);

    return {
      totalStudents: uniqueStudents,
      totalExams: uniqueExams,
      averageScore: Math.round(averageScore),
      topScore: Math.round(topScore),
    };
  }, [filteredResults]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      showToast("No results to export", "warning");
      return;
    }

    const headers = [
      "Student Name",
      "Mobile",
      "Exam Title",
      "Subject",
      "Test Number",
      "Score",
      "Total",
      "Percentage",
      "Correct",
      "Wrong",
      "Skipped",
      "Submitted At",
    ];

    const rows = filteredResults.map(r => [
      r.studentName,
      r.studentMobile,
      r.examTitle,
      r.examSubject,
      r.examTestNumber,
      r.correct,
      r.total,
      Math.round((r.correct / r.total) * 100),
      r.correct,
      r.wrong,
      r.unanswered,
      new Date(r.submittedAt).toLocaleDateString("en-IN"),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `results-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const getRankColor = (rank) => {
    if (rank === 0) return "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"; // Gold
    if (rank === 1) return "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"; // Silver
    if (rank === 2) return "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"; // Bronze
    return "linear-gradient(135deg, #475569 0%, #334155 100%)";
  };

  const getRankLabel = (rank) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return rank + 1;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate("/admin")} style={styles.backBtn}>
            <FiArrowLeft size={24} />
          </button>
          <h1 style={styles.title}>ALL RESULTS</h1>
        </div>
        <div style={styles.center}>Loading results...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate("/admin")} style={styles.backBtn}>
          <FiArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>ALL RESULTS</h1>
        <div style={styles.headerBadge}>
          {filteredResults.length} Submissions
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Stats Section */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Students</p>
          <p style={styles.statValue}>{stats.totalStudents}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Exams</p>
          <p style={styles.statValue}>{stats.totalExams}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Average Score</p>
          <p style={styles.statValue}>{stats.averageScore}%</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Top Score</p>
          <p style={styles.statValue}>{stats.topScore}%</p>
        </div>
      </div>

      {/* Filter & Export Section */}
      <div style={styles.filterSection}>
        <div style={styles.searchWrapper}>
          <FiSearch size={18} color="#60a5fa" />
          <input
            type="text"
            placeholder="Search by student name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterWrapper}>
          <FiFilter size={18} color="#60a5fa" />
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Exams</option>
            {uniqueExams.map(exam => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.subject})
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleExportCSV} style={styles.exportBtn}>
          <FiDownload size={18} />
          Export CSV
        </button>
      </div>

      {/* Results Section */}
      {filteredResults.length === 0 ? (
        <div style={styles.emptyBox}>
          <p style={styles.emptyTitle}>No Results Found</p>
          <p style={styles.emptyText}>
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <div style={styles.resultsWrapper}>
          {Object.entries(groupedResults).map(([examId, results]) => {
            const examTitle = results[0]?.examTitle;
            const examSubject = results[0]?.examSubject;
            const testNumber = results[0]?.examTestNumber;

            return (
              <div key={examId} style={styles.examGroup}>
                {/* Exam Group Header */}
                <div style={styles.examGroupHeader}>
                  <div style={styles.examGroupInfo}>
                    <h3 style={styles.examGroupTitle}>{examTitle}</h3>
                    <p style={styles.examGroupMeta}>
                      {examSubject} • Test #{testNumber} • {results.length} submissions
                    </p>
                  </div>
                </div>

                {/* Results Table for this exam */}
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={{ ...styles.th, width: "8%" }}>Rank</th>
                        <th style={{ ...styles.th, width: "25%" }}>Student</th>
                        <th style={{ ...styles.th, width: "15%" }}>Score</th>
                        <th style={{ ...styles.th, width: "35%" }}>Breakdown</th>
                        <th style={{ ...styles.th, width: "17%" }}>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, idx) => {
                        const percentage = Math.round(
                          (result.correct / result.total) * 100
                        );

                        return (
                          <tr key={`${result._id}-${idx}`} style={styles.tableRow}>
                            {/* Rank */}
                            <td style={styles.td}>
                              <div
                                style={{
                                  ...styles.rankBadge,
                                  background: getRankColor(idx),
                                  color: idx < 3 ? "#000" : "#fff",
                                }}
                              >
                                {getRankLabel(idx)}
                              </div>
                            </td>

                            {/* Student */}
                            <td style={styles.td}>
                              <div style={styles.studentInfo}>
                                <p style={styles.studentName}>
                                  {result.studentName}
                                </p>
                                <p style={styles.studentMobile}>
                                  {result.studentMobile}
                                </p>
                              </div>
                            </td>

                            {/* Score */}
                            <td style={styles.td}>
                              <div
                                style={{
                                  ...styles.scorePill,
                                  background:
                                    percentage >= 80
                                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                      : percentage >= 60
                                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                }}
                              >
                                <span style={styles.scoreValue}>
                                  {result.correct}/{result.total}
                                </span>
                                <span style={styles.scorePercent}>
                                  {percentage}%
                                </span>
                              </div>
                            </td>

                            {/* Breakdown */}
                            <td style={styles.td}>
                              <div style={styles.breakdownContainer}>
                                <span style={styles.correctBadge}>
                                  ✓ {result.correct}
                                </span>
                                <span style={styles.wrongBadge}>
                                  ✕ {result.wrong}
                                </span>
                                <span style={styles.skippedBadge}>
                                  ⊘ {result.unanswered}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td style={styles.td}>
                              <span style={styles.dateText}>
                                {new Date(result.submittedAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1a1f3a 50%, #0f172a 100%)",
    color: "#e2e8f0",
    fontFamily: "'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', sans-serif",
    paddingBottom: "40px",
  },

  header: {
    padding: "20px 24px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderBottom: "2px solid #3b82f6",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.1)",
  },
  backBtn: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: "8px",
    borderRadius: "8px",
    transition: "all 0.3s ease",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "800",
    margin: 0,
    flex: 1,
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  headerBadge: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    borderRadius: "50px",
    fontSize: "0.9rem",
    fontWeight: "700",
    boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
  },

  center: {
    textAlign: "center",
    padding: "80px 20px",
    color: "#94a3b8",
  },
  errorBox: {
    margin: "16px",
    padding: "16px 20px",
    background: "linear-gradient(135deg, #7f1d1d 0%, #5f2c2c 100%)",
    color: "#fecaca",
    borderRadius: "12px",
    fontSize: "0.95rem",
    border: "1px solid #dc2626",
    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    padding: "20px",
    margin: "0 16px",
    marginTop: "20px",
  },
  statCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },
  statLabel: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#94a3b8",
    marginBottom: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  statValue: {
    margin: 0,
    fontSize: "2.2rem",
    fontWeight: "800",
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  filterSection: {
    padding: "20px",
    margin: "0 16px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "20px",
    border: "1px solid #334155",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  },
  searchWrapper: {
    flex: 1,
    minWidth: "240px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(15, 23, 42, 0.5)",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #475569",
    transition: "all 0.3s ease",
  },
  searchInput: {
    background: "none",
    border: "none",
    color: "#e2e8f0",
    outline: "none",
    fontSize: "0.95rem",
    flex: 1,
    placeholder: "#64748b",
  },
  filterWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(15, 23, 42, 0.5)",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #475569",
  },
  filterSelect: {
    background: "none",
    border: "none",
    color: "#e2e8f0",
    outline: "none",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  exportBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 20px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.95rem",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
    transition: "all 0.3s ease",
  },

  emptyBox: {
    margin: "40px 16px",
    padding: "80px 20px",
    textAlign: "center",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "2px dashed #475569",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "1.3rem",
    color: "#e2e8f0",
    marginBottom: "8px",
    fontWeight: "700",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.95rem",
  },

  resultsWrapper: {
    margin: "20px 16px",
  },

  examGroup: {
    marginBottom: "28px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "1px solid #334155",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  },
  examGroupHeader: {
    padding: "20px 16px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    borderBottom: "2px solid #1e40af",
  },
  examGroupInfo: {
    margin: 0,
  },
  examGroupTitle: {
    margin: "0 0 8px 0",
    fontSize: "1.3rem",
    fontWeight: "800",
    color: "#fff",
  },
  examGroupMeta: {
    margin: 0,
    fontSize: "0.9rem",
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },

  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "rgba(15, 23, 42, 0.5)",
    borderBottom: "2px solid #334155",
  },
  th: {
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#60a5fa",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  tableRow: {
    borderBottom: "1px solid #1e293b",
    transition: "all 0.3s ease",
  },
  td: {
    padding: "14px 16px",
    fontSize: "0.95rem",
    verticalAlign: "middle",
  },

  rankBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    fontWeight: "800",
    color: "#fff",
    fontSize: "1rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
  },

  studentInfo: {
    margin: 0,
  },
  studentName: {
    margin: 0,
    fontWeight: "700",
    color: "#e2e8f0",
    fontSize: "0.95rem",
  },
  studentMobile: {
    margin: "4px 0 0",
    fontSize: "0.85rem",
    color: "#64748b",
  },

  scorePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    borderRadius: "24px",
    color: "#fff",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  scoreValue: {
    fontSize: "0.95rem",
    fontWeight: "800",
  },
  scorePercent: {
    fontSize: "0.85rem",
    opacity: 0.95,
  },

  breakdownContainer: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  correctBadge: {
    background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
    color: "#a7f3d0",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)",
  },
  wrongBadge: {
    background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)",
    color: "#fecaca",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.2)",
  },
  skippedBadge: {
    background: "linear-gradient(135deg, #78350f 0%, #b45309 100%)",
    color: "#fde68a",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    boxShadow: "0 2px 8px rgba(217, 119, 6, 0.2)",
  },

  dateText: {
    color: "#94a3b8",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
};

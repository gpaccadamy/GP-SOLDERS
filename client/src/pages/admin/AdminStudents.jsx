import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { FiArrowLeft, FiUsers, FiEdit3, FiToggleLeft, FiToggleRight, FiUserCheck, FiUserX, FiSearch, FiTrash2 } from "react-icons/fi";

const API = "https://academy-backend-e02j.onrender.com/api/students";

export default function AdminStudents() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPassword, setEditingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", mobile: "", password: "", roll: "" });

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/all`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
          setError("");
        } else {
          setError("Failed to load students");
        }
      } catch (err) {
        setError("Connection error: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.mobile.includes(searchTerm) ||
      (student.roll && student.roll.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  // Update student password
  const handlePasswordUpdate = async (mobile) => {
    if (!newPassword.trim()) {
      showToast("Please enter a new password", "warning");
      return;
    }

    try {
      const res = await fetch(`${API}/update-password/${mobile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Password updated successfully!", "success");
        setEditingPassword(null);
        setNewPassword("");
      } else {
        showToast(data.error || "Failed to update password", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  // Toggle student active status
  const handleToggleActive = async (mobile, currentStatus) => {
    try {
      const res = await fetch(`${API}/toggle-active/${mobile}`, {
        method: "PUT",
      });

      const data = await res.json();

      if (res.ok) {
        setStudents(students.map(student =>
          student.mobile === mobile
            ? { ...student, active: !currentStatus }
            : student
        ));
        showToast(data.message, "success");
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  // Create new student
  const handleCreateStudent = async () => {
    if (!createForm.name || !createForm.mobile || !createForm.password) {
      showToast("Name, mobile and password are required", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.student) {
          setStudents([...students, data.student]);
        } else {
          const listRes = await fetch(`${API}/all`);
          if (listRes.ok) {
            const refreshed = await listRes.json();
            setStudents(refreshed);
          }
        }
        setCreateForm({ name: "", mobile: "", password: "", roll: "" });
        setShowCreateForm(false);
        showToast("Student created successfully!", "success");
      } else {
        showToast(data.error || "Failed to create student", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  // Delete student
  const handleDeleteStudent = async (mobile, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}" (${mobile})?\n\nThis will also delete all their exam results and cannot be undone!`)) {
      return;
    }

    try {
      const res = await fetch(`${API}/delete/${mobile}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setStudents(students.filter(student => student.mobile !== mobile));
        showToast(data.message, "success");
      } else {
        showToast(data.error || "Failed to delete student", "error");
      }
    } catch (err) {
      showToast("Connection error: " + err.message, "error");
    }
  };

  const activeStudents = filteredStudents.filter(s => s.active).length;
  const inactiveStudents = filteredStudents.filter(s => !s.active).length;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate("/admin")} style={styles.backBtn}>
            <FiArrowLeft size={24} />
          </button>
          <h1 style={styles.title}>STUDENT MANAGEMENT</h1>
        </div>
        <div style={styles.center}>Loading students...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={isMobile ? styles.mobileHeader : styles.header}>
        <button onClick={() => navigate("/admin")} style={styles.backBtn}>
          <FiArrowLeft size={24} />
        </button>
        <h1 style={isMobile ? styles.mobileTitle : styles.title}>STUDENT MANAGEMENT</h1>
        <div style={isMobile ? styles.mobileHeaderBadge : styles.headerBadge}>
          {students.length} Total
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Search Bar */}
      <div style={isMobile ? styles.mobileSearchContainer : styles.searchContainer}>
        <div style={isMobile ? styles.mobileSearchWrapper : styles.searchWrapper}>
          <FiSearch size={20} color="#64748b" />
          <input
            type="text"
            placeholder="Search by name, mobile, or roll..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={isMobile ? { ...styles.searchInput, ...styles.mobileSearchInput } : styles.searchInput}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={styles.clearSearchBtn}>✕</button>
          )}
        </div>
        {searchTerm && (
          <div style={styles.searchResults}>
            Showing {filteredStudents.length} of {students.length}
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div style={isMobile ? styles.mobileStatsGrid : styles.statsGrid}>
        <div style={isMobile ? styles.mobileStatCard : styles.statCard}>
          <FiUsers size={isMobile ? 24 : 32} color="#60a5fa" />
          <p style={styles.statLabel}>Total</p>
          <p style={styles.statValue}>{students.length}</p>
        </div>
        <div style={isMobile ? styles.mobileStatCard : styles.statCard}>
          <FiUserCheck size={isMobile ? 24 : 32} color="#10b981" />
          <p style={styles.statLabel}>Active</p>
          <p style={styles.statValue}>{activeStudents}</p>
        </div>
        <div style={isMobile ? styles.mobileStatCard : styles.statCard}>
          <FiUserX size={isMobile ? 24 : 32} color="#ef4444" />
          <p style={styles.statLabel}>Inactive</p>
          <p style={styles.statValue}>{inactiveStudents}</p>
        </div>
      </div>

      {/* Create Student Button */}
      <div style={isMobile ? styles.mobileCreateContainer : styles.createContainer}>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={isMobile ? { ...styles.createBtn, ...styles.mobileCreateBtn } : styles.createBtn}
        >
          {showCreateForm ? "Cancel" : "+ Create Student"}
        </button>
      </div>

      {/* Create Student Form */}
      {showCreateForm && (
        <div style={isMobile ? styles.mobileCreateForm : styles.createForm}>
          <h3 style={styles.formTitle}>Create New Student</h3>
          <div style={isMobile ? styles.mobileFormGrid : styles.formGrid}>
            <input
              type="text"
              placeholder="Full Name"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              style={isMobile ? { ...styles.formInput, ...styles.mobileFormInput } : styles.formInput}
            />
            <input
              type="tel"
              placeholder="Mobile Number"
              value={createForm.mobile}
              onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
              style={isMobile ? { ...styles.formInput, ...styles.mobileFormInput } : styles.formInput}
            />
            <input
              type="password"
              placeholder="Password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              style={isMobile ? { ...styles.formInput, ...styles.mobileFormInput } : styles.formInput}
            />
            <input
              type="text"
              placeholder="Roll Number (optional)"
              value={createForm.roll}
              onChange={(e) => setCreateForm({ ...createForm, roll: e.target.value })}
              style={isMobile ? { ...styles.formInput, ...styles.mobileFormInput } : styles.formInput}
            />
          </div>
          <div style={styles.formActions}>
            <button onClick={handleCreateStudent} style={styles.submitBtn}>Create Student</button>
            <button onClick={() => setShowCreateForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Students List - Cards for Mobile, Table for Desktop */}
      {filteredStudents.length === 0 ? (
        <div style={isMobile ? styles.mobileEmptyBox : styles.emptyBox}>
          <FiUsers size={isMobile ? 50 : 70} color="#475569" />
          <h3>No Students Found</h3>
          <p>{searchTerm ? "Try adjusting your search terms" : "Students will appear here once they register"}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          {!isMobile && (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ ...styles.th, width: "5%" }}>Status</th>
                    <th style={{ ...styles.th, width: "20%" }}>Student Details</th>
                    <th style={{ ...styles.th, width: "12%" }}>Roll Number</th>
                    <th style={{ ...styles.th, width: "15%" }}>Registration Date</th>
                    <th style={{ ...styles.th, width: "15%" }}>Actions</th>
                    <th style={{ ...styles.th, width: "18%" }}>Password</th>
                    <th style={{ ...styles.th, width: "15%" }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student._id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{
                          ...styles.statusBadge,
                          background: student.active
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        }}>
                          {student.active ? "Active" : "Inactive"}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.studentInfo}>
                          <p style={styles.studentName}>{student.name}</p>
                          <p style={styles.studentMobile}>{student.mobile}</p>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.rollText}>{student.roll || "N/A"}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {new Date(student.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleToggleActive(student.mobile, student.active)}
                          style={{
                            ...styles.toggleBtn,
                            background: student.active
                              ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                              : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                          }}
                        >
                          {student.active ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                          {student.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                      <td style={styles.td}>
                        {editingPassword === student.mobile ? (
                          <div style={styles.passwordEdit}>
                            <input
                              type="password"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              style={styles.passwordInput}
                            />
                            <button onClick={() => handlePasswordUpdate(student.mobile)} style={styles.saveBtn}>Save</button>
                            <button onClick={() => { setEditingPassword(null); setNewPassword(""); }} style={styles.cancelBtn}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingPassword(student.mobile)} style={styles.editPasswordBtn}>
                            <FiEdit3 size={16} />
                            Change Password
                          </button>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => handleDeleteStudent(student.mobile, student.name)} style={styles.deleteBtn}>
                          <FiTrash2 size={16} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          {isMobile && (
            <div style={styles.mobileCardsContainer}>
              {filteredStudents.map((student) => (
                <div key={student._id} style={styles.mobileCard}>
                  {/* Card Header */}
                  <div style={styles.mobileCardHeader}>
                    <div style={styles.mobileStudentInfo}>
                      <p style={styles.mobileStudentName}>{student.name}</p>
                      <p style={styles.mobileStudentMobile}>{student.mobile}</p>
                    </div>
                    <div style={{
                      ...styles.mobileStatusBadge,
                      background: student.active
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    }}>
                      {student.active ? "Active" : "Inactive"}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div style={styles.mobileCardDetails}>
                    <div style={styles.mobileDetailRow}>
                      <span style={styles.mobileDetailLabel}>Roll Number:</span>
                      <span style={styles.mobileDetailValue}>{student.roll || "N/A"}</span>
                    </div>
                    <div style={styles.mobileDetailRow}>
                      <span style={styles.mobileDetailLabel}>Registered:</span>
                      <span style={styles.mobileDetailValue}>
                        {new Date(student.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={styles.mobileCardActions}>
                    <button
                      onClick={() => handleToggleActive(student.mobile, student.active)}
                      style={{
                        ...styles.mobileActionBtn,
                        background: student.active
                          ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      }}
                    >
                      {student.active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                      {student.active ? "Deactivate" : "Activate"}
                    </button>

                    {editingPassword === student.mobile ? (
                      <div style={styles.mobilePasswordEdit}>
                        <input
                          type="password"
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={styles.mobilePasswordInput}
                        />
                        <div style={styles.mobilePasswordButtons}>
                          <button onClick={() => handlePasswordUpdate(student.mobile)} style={styles.mobileSaveBtn}>Save</button>
                          <button onClick={() => { setEditingPassword(null); setNewPassword(""); }} style={styles.mobileCancelBtn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPassword(student.mobile)} style={styles.mobileEditBtn}>
                        <FiEdit3 size={16} />
                        Change Password
                      </button>
                    )}

                    <button onClick={() => handleDeleteStudent(student.mobile, student.name)} style={styles.mobileDeleteBtn}>
                      <FiTrash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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

  // Header Styles
  header: {
    padding: "20px 24px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    borderBottom: "2px solid #3b82f6",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.1)",
  },
  mobileHeader: {
    padding: "16px 12px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    borderBottom: "2px solid #3b82f6",
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
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "800",
    margin: 0,
    flex: 1,
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  mobileTitle: {
    fontSize: "1.25rem",
    fontWeight: "800",
    margin: 0,
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerBadge: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    borderRadius: "50px",
    fontSize: "0.9rem",
    fontWeight: "700",
  },
  mobileHeaderBadge: {
    alignSelf: "flex-end",
    padding: "6px 12px",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    borderRadius: "50px",
    fontSize: "0.75rem",
    fontWeight: "700",
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
  },

  // Stats Styles
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    padding: "20px",
    margin: "0 16px",
    marginTop: "20px",
  },
  mobileStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    padding: "12px",
    margin: "0 12px",
    marginTop: "16px",
  },
  statCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  mobileStatCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "12px 8px",
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statLabel: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#94a3b8",
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
  },

  // Search Styles
  searchContainer: {
    margin: "20px 16px",
  },
  mobileSearchContainer: {
    margin: "12px 12px",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "12px",
    padding: "12px 16px",
  },
  mobileSearchWrapper: {
    display: "flex",
    alignItems: "center",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#e2e8f0",
    fontSize: "1rem",
    outline: "none",
    marginLeft: "12px",
  },
  mobileSearchInput: {
    fontSize: "0.9rem",
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "1.2rem",
    padding: "4px",
  },
  searchResults: {
    marginTop: "8px",
    fontSize: "0.85rem",
    color: "#94a3b8",
    textAlign: "center",
  },

  // Empty State
  emptyBox: {
    margin: "40px 16px",
    padding: "80px 20px",
    textAlign: "center",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "2px dashed #475569",
  },
  mobileEmptyBox: {
    margin: "20px 12px",
    padding: "40px 16px",
    textAlign: "center",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "12px",
    border: "2px dashed #475569",
  },

  // Desktop Table Styles
  tableWrapper: {
    margin: "20px 16px",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    borderRadius: "16px",
    border: "1px solid #334155",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
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
    padding: "16px",
    textAlign: "left",
    fontSize: "0.85rem",
    fontWeight: "700",
    color: "#60a5fa",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  tableRow: {
    borderBottom: "1px solid #1e293b",
  },
  td: {
    padding: "16px",
    fontSize: "0.95rem",
    verticalAlign: "middle",
  },

  // Table Cell Styles
  statusBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: "700",
    textAlign: "center",
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
  rollText: {
    color: "#94a3b8",
    fontWeight: "500",
  },
  dateText: {
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  editPasswordBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  passwordEdit: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  passwordInput: {
    padding: "6px 10px",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "0.85rem",
    outline: "none",
  },
  saveBtn: {
    padding: "6px 12px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 12px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  // Mobile Card Styles - Table to Cards Pattern [^13^][^17^]
  mobileCardsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    marginBottom: "20px",
  },
  mobileCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "16px",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
  },
  mobileCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #334155",
  },
  mobileStudentInfo: {
    flex: 1,
  },
  mobileStudentName: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: "4px",
  },
  mobileStudentMobile: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#64748b",
  },
  mobileStatusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    color: "#fff",
    fontSize: "0.75rem",
    fontWeight: "700",
    marginLeft: "8px",
  },
  mobileCardDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },
  mobileDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mobileDetailLabel: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    fontWeight: "500",
  },
  mobileDetailValue: {
    fontSize: "0.9rem",
    color: "#e2e8f0",
    fontWeight: "600",
  },
  mobileCardActions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  mobileActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  mobileEditBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  mobileDeleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px",
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  mobilePasswordEdit: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    background: "rgba(15, 23, 42, 0.5)",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #475569",
  },
  mobilePasswordInput: {
    padding: "10px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  mobilePasswordButtons: {
    display: "flex",
    gap: "8px",
  },
  mobileSaveBtn: {
    flex: 1,
    padding: "8px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  mobileCancelBtn: {
    flex: 1,
    padding: "8px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    cursor: "pointer",
  },

  // Create Student Styles
  createContainer: {
    display: "flex",
    justifyContent: "center",
    margin: "20px 0",
  },
  mobileCreateContainer: {
    margin: "15px 0",
  },
  createBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  mobileCreateBtn: {
    width: "100%",
    padding: "10px",
    fontSize: "0.9rem",
  },
  createForm: {
    background: "#1e2937",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #334155",
  },
  mobileCreateForm: {
    padding: "16px",
    marginBottom: "16px",
  },
  formTitle: {
    margin: "0 0 20px 0",
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#e2e8f0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "20px",
  },
  mobileFormGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "16px",
  },
  formInput: {
    padding: "12px 16px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    outline: "none",
  },
  mobileFormInput: {
    padding: "10px 12px",
    fontSize: "0.9rem",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
  },
  submitBtn: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.95rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};

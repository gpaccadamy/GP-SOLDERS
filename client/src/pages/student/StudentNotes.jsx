import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiSave, 
  FiTrash2, 
  FiClock, 
  FiType, 
  FiAlignLeft, 
  FiCheckCircle,
  FiInfo
} from 'react-icons/fi';

const STORAGE_KEY = 'gpsoldiers_notes_content';
const TIMESTAMP_KEY = 'gpsoldiers_notes_timestamp';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function StudentNotes() {
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Ready to write...');
  const [isExpired, setIsExpired] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Detect mobile screen
  useEffect(() => {
    const token = localStorage.getItem("gp_token");
    const name = localStorage.getItem("gp_name");
    if (!token || !name) {
      // For notes, we can allow access but maybe redirect to login
      // Since notes are local, perhaps allow but redirect if not logged in
      const navigate = (path) => window.location.href = path;
      navigate("/student/login");
      return;
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved notes on mount
  useEffect(() => {
    const savedContent = localStorage.getItem(STORAGE_KEY);
    const savedTimestamp = localStorage.getItem(TIMESTAMP_KEY);

    if (savedContent && savedTimestamp) {
      const savedTime = parseInt(savedTimestamp, 10);
      const age = Date.now() - savedTime;

      if (age < TWELVE_HOURS_MS) {
        setContent(savedContent);
        setLastSaved(new Date(savedTime));
        setSaveStatus(`Loaded from ${new Date(savedTime).toLocaleString()}`);
        updateCounts(savedContent);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIMESTAMP_KEY);
        setIsExpired(true);
        setSaveStatus('Previous notes expired (older than 12 hours)');
      }
    }
  }, []);

  // Update word and character counts
  const updateCounts = (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
  };

  // Auto-save function
  const saveNote = useCallback((text) => {
    if (text.trim()) {
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, text);
      localStorage.setItem(TIMESTAMP_KEY, now.toString());
      setLastSaved(new Date(now));
      setSaveStatus(`Saved at ${new Date(now).toLocaleTimeString()}`);
      setIsExpired(false);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    }
  }, []);

  // Handle content change with debounced auto-save
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    updateCounts(newContent);
    setSaveStatus('Saving...');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newContent);
    }, 1000);
  };

  // Clear all notes
  const handleClear = () => {
    if (window.confirm('Delete all notes permanently? This cannot be undone.')) {
      setContent('');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
      setLastSaved(null);
      setSaveStatus('Notes cleared');
      updateCounts('');
      textareaRef.current?.focus();
    }
  };

  // Format time remaining
  const getTimeRemaining = () => {
    if (!lastSaved) return null;
    const expiresAt = lastSaved.getTime() + TWELVE_HOURS_MS;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (content.trim()) {
        localStorage.setItem(STORAGE_KEY, content);
        localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
      }
    };
  }, [content]);

  return (
    <div style={styles.container}>
      {/* Header - Mobile Optimized */}
      <header style={isMobile ? styles.mobileHeader : styles.header}>
        <div style={isMobile ? styles.mobileHeaderLeft : styles.headerLeft}>
          <div style={isMobile ? styles.mobileIconWrapper : styles.iconWrapper}>
            <FiType size={isMobile ? 24 : 28} color="#f59e0b" />
          </div>
          <div>
            <h1 style={isMobile ? styles.mobileTitle : styles.title}>My Notes</h1>
            <p style={isMobile ? styles.mobileSubtitle : styles.subtitle}>
              Auto-saves • 12h expiry
            </p>
          </div>
        </div>
        
        <div style={isMobile ? styles.mobileHeaderRight : styles.headerRight}>
          <div style={isMobile ? styles.mobileStatusBadge : styles.statusBadge}>
            {saveStatus.includes('Saved') ? (
              <FiCheckCircle size={isMobile ? 14 : 16} color="#10b981" />
            ) : (
              <FiClock size={isMobile ? 14 : 16} color={isExpired ? "#ef4444" : "#64748b"} />
            )}
            <span style={{
              ...styles.statusText,
              fontSize: isMobile ? '0.75rem' : '0.85rem',
              color: saveStatus.includes('Saved') ? '#10b981' : isExpired ? '#ef4444' : '#94a3b8'
            }}>
              {isMobile ? (saveStatus.includes('Saved') ? 'Saved' : saveStatus) : saveStatus}
            </span>
          </div>
          {lastSaved && !isExpired && (
            <div style={isMobile ? styles.mobileTimeRemaining : styles.timeRemaining}>
              ⏱️ {getTimeRemaining()}
            </div>
          )}
        </div>
      </header>

      {/* Stats Bar - Mobile Optimized */}
      <div style={isMobile ? styles.mobileStatsBar : styles.statsBar}>
        <div style={styles.stat}>
          <FiAlignLeft size={isMobile ? 14 : 16} color="#64748b" />
          <span style={isMobile ? styles.mobileStatValue : styles.statValue}>{wordCount}</span>
          <span style={isMobile ? styles.mobileStatLabel : styles.statLabel}>words</span>
        </div>
        <div style={styles.stat}>
          <span style={isMobile ? styles.mobileStatValue : styles.statValue}>{charCount}</span>
          <span style={isMobile ? styles.mobileStatLabel : styles.statLabel}>chars</span>
        </div>
        <div style={styles.stat}>
          <span style={isMobile ? styles.mobileStatValue : styles.statValue}>
            {Math.ceil(charCount / 500)}
          </span>
          <span style={isMobile ? styles.mobileStatLabel : styles.statLabel}>pages</span>
        </div>
      </div>

      {/* Main Editor - Full Screen on Mobile */}
      <main style={styles.main}>
        <div style={isMobile ? styles.mobileEditorWrapper : styles.editorWrapper}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="Write your notes here...

📝 Everything saves automatically
⏰ Notes stay for 12 hours from last edit
💾 Auto-backup every second as you type"
            style={isMobile ? styles.mobileTextarea : styles.textarea}
            spellCheck={false}
          />
          
          {/* Floating Clear Button - Bottom Right */}
          <button 
            onClick={handleClear}
            style={isMobile ? styles.mobileFloatingClearBtn : styles.floatingClearBtn}
            title="Clear all notes"
          >
            <FiTrash2 size={isMobile ? 20 : 22} />
          </button>
        </div>

        {/* Info Footer - Mobile Optimized */}
        <div style={isMobile ? styles.mobileInfoFooter : styles.infoFooter}>
          <FiInfo size={isMobile ? 12 : 14} color="#64748b" />
          <span style={isMobile ? styles.mobileInfoText : styles.infoText}>
            {isMobile 
              ? "Saved locally. Auto-deleted after 12h of inactivity."
              : "Notes are saved locally in your browser. They will be automatically deleted after 12 hours of inactivity."
            }
          </span>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden', // Prevent horizontal scroll [^36^]
  },
  
  // Desktop Header Styles
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    padding: '12px 0',
    borderBottom: '1px solid #334155',
    flexWrap: 'wrap',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '20px',
    border: '1px solid #334155',
  },
  statusText: {
    fontWeight: 500,
    transition: 'color 0.3s',
  },
  timeRemaining: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 500,
  },

  // Mobile Header Styles
  mobileHeader: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #334155',
    gap: '12px',
  },
  mobileHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mobileIconWrapper: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
  },
  mobileTitle: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  mobileSubtitle: {
    margin: '2px 0 0',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  mobileHeaderRight: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  mobileStatusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '20px',
    border: '1px solid #334155',
  },
  mobileTimeRemaining: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontWeight: 500,
  },

  // Desktop Stats Styles
  statsBar: {
    display: 'flex',
    gap: '24px',
    padding: '12px 16px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #334155',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
  },

  // Mobile Stats Styles
  mobileStatsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px',
    padding: '10px 12px',
    background: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '10px',
    marginBottom: '12px',
    border: '1px solid #334155',
  },
  mobileStatValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#3b82f6',
  },
  mobileStatLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
  },

  // Main Content Styles
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: 0, // Important for flex child
  },

  // Desktop Editor Styles
  editorWrapper: {
    position: 'relative',
    flex: 1,
    minHeight: '60vh',
  },
  textarea: {
    width: '100%',
    minHeight: '60vh',
    padding: '20px',
    fontSize: '1.1rem',
    lineHeight: 1.6,
    background: '#1e293b',
    color: '#f1f5f9',
    border: '2px solid #334155',
    borderRadius: '16px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box', // Prevent padding overflow [^33^]
  },
  floatingClearBtn: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
    transition: 'all 0.3s ease',
    zIndex: 10,
    minHeight: '48px', // Touch target size [^36^]
    minWidth: '48px',
  },

  // Mobile Editor Styles - Full Screen Optimized
  mobileEditorWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 200px)', // Account for header and footer
  },
  mobileTextarea: {
    width: '100%',
    flex: 1,
    minHeight: '50vh',
    padding: '16px',
    fontSize: '16px', // Prevent iOS zoom on focus [^36^]
    lineHeight: 1.5,
    background: '#1e293b',
    color: '#f1f5f9',
    border: '2px solid #334155',
    borderRadius: '12px',
    resize: 'none', // Disable resize on mobile [^31^]
    outline: 'none',
    fontFamily: 'inherit',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box',
    WebkitAppearance: 'none', // Remove iOS default styling
  },
  mobileFloatingClearBtn: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
    zIndex: 10,
    minHeight: '48px',
    minWidth: '48px',
  },

  // Footer Styles
  infoFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    color: '#64748b',
    fontSize: '0.9rem',
    textAlign: 'center',
    background: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '12px',
    border: '1px dashed #334155',
  },
  infoText: {
    maxWidth: '600px',
    lineHeight: 1.5,
  },
  mobileInfoFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px',
    color: '#64748b',
    fontSize: '0.8rem',
    textAlign: 'center',
    background: 'rgba(30, 41, 59, 0.4)',
    borderRadius: '10px',
    border: '1px dashed #334155',
  },
  mobileInfoText: {
    lineHeight: 1.4,
  },
};

// Add hover effects and focus styles via CSS-in-JS
const styleTag = document.createElement('style');
styleTag.textContent = `
  textarea:focus {
    border-color: #f59e0b !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
  }
  button:hover {
    transform: translateY(-2px) scale(1.05);
  }
  button:active {
    transform: translateY(0) scale(0.95);
  }
  /* Prevent horizontal overflow on mobile */
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
`;
document.head.appendChild(styleTag);
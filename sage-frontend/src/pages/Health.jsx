import { useState, useEffect } from "react";
import { HeartPulse, Activity, Footprints, Brain, Trash2, AlertCircle, ShieldAlert, Stethoscope, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../services/supabaseClient";

function Health({ healthData, session, memoryVersion }) {
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [memoryError, setMemoryError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch memories from backend — re-fetches whenever memoryVersion changes (new memory saved from Chat)
  useEffect(() => {
    let cancelled = false;
    const fetchMems = async () => {
      if (!session?.user?.id) return;
      setLoadingMemories(true);
      setMemoryError(null);
      const { data, error } = await supabase
        .from('health_memories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (error) setMemoryError(error.message);
        else setMemories(data || []);
        setLoadingMemories(false);
      }
    };
    fetchMems();
    return () => { cancelled = true; };
  }, [session, memoryVersion]); // memoryVersion triggers re-fetch on new chat insight

  const handleDeleteMemory = async (memoryId) => {
    setDeletingId(memoryId);
    try {
      const { error } = await supabase.from('health_memories').delete().eq('id', memoryId);
      if (error) throw error;
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setDeletingId(null);
    }
  };

  // Health score calculation
  const calculateScore = () => {
    let score = 100;
    if (healthData.heartRate) {
      const hr = Number(healthData.heartRate);
      if (hr < 50 || hr > 110) score -= 20;
      else if (hr < 60 || hr > 100) score -= 10;
    }
    if (healthData.bloodPressure) {
      const [sys, dia] = healthData.bloodPressure.split("/").map(Number);
      if (sys > 140 || dia > 90) score -= 20;
      else if (sys > 130 || dia > 85) score -= 10;
    }
    if (healthData.steps) {
      const s = Number(healthData.steps);
      if (s < 3000) score -= 20;
      else if (s < 6000) score -= 10;
    }
    return Math.max(0, Math.min(100, score));
  };

  const hasData = healthData.heartRate || healthData.bloodPressure || healthData.steps;
  const score = hasData ? calculateScore() : null;

  const scoreConfig = score === null
    ? { color: "var(--c-text-3)", label: "--", message: "Chat with SAGE to begin tracking your health." }
    : score >= 85
    ? { color: "#10B981", label: `${score}%`, message: "Your vitals look great! Keep it up." }
    : score >= 60
    ? { color: "#F59E0B", label: `${score}%`, message: "Vitals are okay — room for improvement." }
    : { color: "#EF4444", label: `${score}%`, message: "Please consult a doctor about your symptoms." };

  const vitals = [
    {
      icon: HeartPulse,
      label: "Heart Rate",
      value: healthData.heartRate ? `${healthData.heartRate} bpm` : null,
      color: "#EF4444",
      normal: "60–100 bpm",
    },
    {
      icon: Activity,
      label: "Blood Pressure",
      value: healthData.bloodPressure || null,
      color: "#3B82F6",
      normal: "< 120/80 mmHg",
    },
    {
      icon: Footprints,
      label: "Daily Steps",
      value: healthData.steps ? Number(healthData.steps).toLocaleString() : null,
      color: "#10B981",
      normal: "Target: 10,000",
    },
  ];

  // Group memories by type from metadata
  const allergies = memories.filter(m => m.metadata?.type === 'allergy');
  const symptoms = memories.filter(m => m.metadata?.type === 'symptom');
  const medications = memories.filter(m => m.metadata?.type === 'medication');
  const otherMemories = memories.filter(m => 
    !['allergy', 'symptom', 'medication'].includes(m.metadata?.type)
  );

  const stagger = {
    show: { transition: { staggerChildren: 0.07 } },
    hidden: {},
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 28 } },
  };

  const MemoryTag = ({ mem }) => (
    <motion.div
      key={mem.id}
      variants={fadeUp}
      exit={{ opacity: 0, x: -20 }}
      className="health-tag-item"
    >
      <span className="health-tag-text">{mem.content || mem.memory || mem.text}</span>
      <button
        className="memory-delete-btn"
        onClick={() => handleDeleteMemory(mem.id)}
        disabled={deletingId === mem.id}
        title="Forget this"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );

  const CategoryCard = ({ icon: Icon, color, title, items, emptyText }) => (
    <motion.div variants={fadeUp} className="health-category-card">
      <div className="health-category-header">
        <div className="health-category-icon" style={{ background: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        <h3 className="health-category-title">{title}</h3>
        <span className="health-category-count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="health-category-empty">{emptyText}</p>
      ) : (
        <AnimatePresence>
          <motion.div className="health-tag-list" variants={stagger} initial="hidden" animate="show">
            {items.map(mem => <MemoryTag key={mem.id} mem={mem} />)}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );

  return (
    <div className="inner-page">
      <div className="inner-page-scroll">
        {/* Header */}
        <div className="inner-page-header">
          <div>
            <h1 className="inner-page-title">My Health</h1>
            <p className="inner-page-subtitle">Your health context, under your control.</p>
          </div>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="health-grid">

          {/* Score Card */}
          <motion.div variants={fadeUp} className="health-score-card">
            <div className="health-score-info">
              <p className="health-score-label">Overall Health Score</p>
              <h2 className="health-score-message">{scoreConfig.message}</h2>
              {!hasData && (
                <div className="health-no-data-hint">
                  <AlertCircle size={14} />
                  <span>Talk to SAGE in the Chat tab to add vitals</span>
                </div>
              )}
            </div>
            <div className="health-score-ring" style={{ "--score-color": scoreConfig.color }}>
              <svg viewBox="0 0 80 80" className="health-ring-svg">
                <circle cx="40" cy="40" r="34" className="health-ring-track" />
                <circle
                  cx="40" cy="40" r="34"
                  className="health-ring-fill"
                  style={{
                    stroke: scoreConfig.color,
                    strokeDashoffset: score !== null ? 213.6 - (213.6 * score) / 100 : 213.6,
                  }}
                />
              </svg>
              <span className="health-ring-label" style={{ color: scoreConfig.color }}>
                {scoreConfig.label}
              </span>
            </div>
          </motion.div>

          {/* Vital Cards */}
          {vitals.map((v) => {
            const Icon = v.icon;
            return (
              <motion.div key={v.label} variants={fadeUp} className="vital-card">
                <div className="vital-card-icon" style={{ "--icon-color": v.color }}>
                  <Icon size={22} />
                </div>
                <div className="vital-card-body">
                  <span className="vital-card-label">{v.label}</span>
                  <span className="vital-card-value" style={{ color: v.value ? v.color : "var(--c-text-4)" }}>
                    {v.value || "—"}
                  </span>
                  <span className="vital-card-normal">{v.normal}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Structured Health Categories */}
        {loadingMemories ? (
          <div className="memory-loading" style={{ marginTop: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="memory-skeleton" style={{ width: `${70 + i * 10}%` }} />
            ))}
          </div>
        ) : memoryError ? (
          <div className="memory-empty" style={{ marginTop: 24 }}>
            <AlertCircle size={32} style={{ color: "var(--c-text-4)", marginBottom: 12 }} />
            <p>{memoryError}</p>
          </div>
        ) : (
          <motion.div 
            className="health-categories-grid"
            variants={stagger} 
            initial="hidden" 
            animate="show"
            style={{ marginTop: 20 }}
          >
            <CategoryCard
              icon={ShieldAlert}
              color="#EF4444"
              title="Allergies"
              items={allergies}
              emptyText="No allergies noted yet."
            />
            <CategoryCard
              icon={Stethoscope}
              color="#F59E0B"
              title="Current Concerns"
              items={symptoms}
              emptyText="No symptoms noted yet."
            />
            <CategoryCard
              icon={Pill}
              color="#3B82F6"
              title="Medications"
              items={medications}
              emptyText="No medications noted yet."
            />
          </motion.div>
        )}

        {/* Other memories (general / vital type) */}
        {otherMemories.length > 0 && (
          <div className="memory-section" style={{ marginTop: 20 }}>
            <div className="memory-section-header">
              <div className="memory-section-title-row">
                <Brain size={18} style={{ color: "var(--c-primary)" }} />
                <h2 className="memory-section-title">SAGE Memory</h2>
              </div>
              <span className="memory-section-subtitle">
                Other health notes SAGE remembered
              </span>
            </div>
            <AnimatePresence>
              <motion.div className="memory-list" variants={stagger} initial="hidden" animate="show">
                {otherMemories.map((mem) => (
                  <motion.div
                    key={mem.id}
                    variants={fadeUp}
                    exit={{ opacity: 0, x: -20 }}
                    className="memory-item"
                  >
                    <div className="memory-item-dot" />
                    <div className="memory-item-content">
                      <p className="memory-item-text">{mem.content || mem.memory || mem.text}</p>
                      {mem.created_at && (
                        <span className="memory-item-date">
                          {new Date(mem.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <button
                      className="memory-delete-btn"
                      onClick={() => handleDeleteMemory(mem.id)}
                      disabled={deletingId === mem.id}
                      title="Forget this"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}

export default Health;
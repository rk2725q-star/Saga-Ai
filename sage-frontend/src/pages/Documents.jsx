import { useState, useEffect, useRef } from "react";
import {
  FileText, Upload, Trash2, MessageSquare, AlertCircle,
  Image, File, X, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDocuments, uploadDocument, askDocumentQuestion } from "../services/api";

const USER_ID = "demo_user";

function getFileIcon(type) {
  if (!type) return File;
  if (type.includes("pdf")) return FileText;
  if (type.includes("image")) return Image;
  return File;
}

function Documents({ uploadedFiles, setUploadedFiles }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);   // document being chatted
  const [docQuestion, setDocQuestion] = useState("");
  const [docAnswer, setDocAnswer] = useState(null);
  const [askingDoc, setAskingDoc] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch documents from backend
  const fetchDocs = () => {
    setLoading(true);
    setError(null);
    getDocuments(USER_ID)
      .then((data) => {
        const docs = Array.isArray(data) ? data : data.documents || [];
        setDocuments(docs);
      })
      .catch(() => setError("Backend offline — documents unavailable."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  // Also show locally uploaded files (optimistic UI)
  const allDocs = [
    ...documents,
    ...(uploadedFiles || []).filter(
      (f) => !documents.find((d) => d.name === f.name)
    ),
  ];

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);

    // Optimistic local add
    if (setUploadedFiles) {
      setUploadedFiles((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, name: file.name, type: file.type, size: file.size, local: true },
      ]);
    }

    try {
      const result = await uploadDocument(USER_ID, file);
      fetchDocs(); // refresh from server
    } catch (err) {
      setUploadError(err.message || "Upload failed. Is the backend running?");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAskDoc = async () => {
    if (!docQuestion.trim() || !activeDoc) return;
    setAskingDoc(true);
    setDocAnswer(null);
    try {
      const result = await askDocumentQuestion(activeDoc.id, docQuestion, USER_ID);
      setDocAnswer(result.answer || result.response || JSON.stringify(result));
    } catch (err) {
      setDocAnswer(`Error: ${err.message}`);
    } finally {
      setAskingDoc(false);
    }
  };

  const stagger = {
    show: { transition: { staggerChildren: 0.06 } },
    hidden: {},
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 28 } },
  };

  return (
    <div className="inner-page">
      <div className="inner-page-scroll">

        {/* Header */}
        <div className="inner-page-header">
          <div>
            <h1 className="inner-page-title">Documents</h1>
            <p className="inner-page-subtitle">Upload reports, scans, and prescriptions</p>
          </div>
          <button
            className="upload-trigger-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span className="upload-spinner" />
            ) : (
              <Upload size={16} />
            )}
            <span>{uploading ? "Uploading…" : "Upload File"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {uploadError && (
          <div className="docs-error-banner">
            <AlertCircle size={16} />
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div className="docs-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="doc-skeleton" />
            ))}
          </div>
        ) : error && allDocs.length === 0 ? (
          <div className="docs-empty">
            <AlertCircle size={40} style={{ color: "var(--c-text-4)", marginBottom: 16 }} />
            <p>{error}</p>
            <span>Start the backend server to load documents.</span>
          </div>
        ) : allDocs.length === 0 ? (
          <div className="docs-empty">
            <FileText size={40} style={{ color: "var(--c-text-4)", marginBottom: 16 }} />
            <p>No documents yet</p>
            <span>Upload a medical report, prescription, or scan to get started.</span>
          </div>
        ) : (
          <motion.div className="docs-list" variants={stagger} initial="hidden" animate="show">
            {allDocs.map((doc) => {
              const Icon = getFileIcon(doc.type || doc.file_type);
              const isActive = activeDoc?.id === doc.id;
              return (
                <motion.div key={doc.id} variants={fadeUp} className={`doc-card ${isActive ? "doc-card--active" : ""}`}>
                  <div className="doc-card-icon">
                    <Icon size={22} />
                  </div>
                  <div className="doc-card-body">
                    <span className="doc-card-name">{doc.name || doc.filename}</span>
                    <span className="doc-card-meta">
                      {doc.local ? "Uploading…" : (
                        doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : doc.dateUploaded || ""
                      )}
                      {doc.size ? ` · ${(doc.size / 1024).toFixed(1)} KB` : ""}
                    </span>
                  </div>
                  {!doc.local && (
                    <button
                      className="doc-chat-btn"
                      onClick={() => {
                        setActiveDoc(isActive ? null : doc);
                        setDocQuestion("");
                        setDocAnswer(null);
                      }}
                      title="Chat about this document"
                    >
                      <MessageSquare size={16} />
                      <span>Ask SAGE</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Inline Document Chat Panel */}
        <AnimatePresence>
          {activeDoc && (
            <motion.div
              className="doc-chat-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <div className="doc-chat-panel-header">
                <div className="doc-chat-panel-title">
                  <MessageSquare size={16} style={{ color: "var(--c-primary)" }} />
                  <span>Ask SAGE about <strong>{activeDoc.name || activeDoc.filename}</strong></span>
                </div>
                <button className="doc-chat-close" onClick={() => { setActiveDoc(null); setDocAnswer(null); }}>
                  <X size={16} />
                </button>
              </div>
              {docAnswer && (
                <div className="doc-chat-answer">
                  <div className="doc-chat-answer-label">SAGE says:</div>
                  <p>{docAnswer}</p>
                </div>
              )}
              <div className="doc-chat-input-row">
                <input
                  className="doc-chat-input"
                  placeholder="Ask a question about this document…"
                  value={docQuestion}
                  onChange={(e) => setDocQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskDoc()}
                />
                <button
                  className="doc-chat-send"
                  onClick={handleAskDoc}
                  disabled={askingDoc || !docQuestion.trim()}
                >
                  {askingDoc ? <span className="upload-spinner" /> : <Send size={16} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default Documents;
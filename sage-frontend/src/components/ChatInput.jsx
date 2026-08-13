import { useRef, useState } from "react";
import {
  Plus,
  FileText,
  Folder,
  Image as ImageIcon,
  Send,
  X,
} from "lucide-react";

function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fileInputRef = useRef(null);

  // Open the file picker
  const openFilePicker = (type) => {
    setShowUploadMenu(false);

    if (!fileInputRef.current) return;

    if (type === "document") {
      fileInputRef.current.accept =
        ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx";
    } else if (type === "photo") {
      fileInputRef.current.accept =
        "image/png,image/jpeg,image/jpg,image/webp";
    } else {
      fileInputRef.current.accept = "*/*";
    }

    fileInputRef.current.click();
  };

  // When a file is selected
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
  };

  // Send message
  const handleSend = () => {
    if (!message.trim() && !selectedFile) {
      return;
    }

    if (onSend) {
      onSend({
        message: message.trim(),
        file: selectedFile,
      });
    }

    setMessage("");
    setSelectedFile(null);
  };

  // Enter key
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrapper">

      {/* =========================
          UPLOAD MENU
      ========================== */}
      {showUploadMenu && (
        <div className="upload-menu">

          <button
            type="button"
            onClick={() => openFilePicker("document")}
          >
            <div className="upload-menu-icon">
              <FileText size={19} />
            </div>

            <div>
              <strong>Document</strong>
              <span>PDF, DOC, TXT</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openFilePicker("file")}
          >
            <div className="upload-menu-icon">
              <Folder size={19} />
            </div>

            <div>
              <strong>File</strong>
              <span>Any file</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openFilePicker("photo")}
          >
            <div className="upload-menu-icon">
              <ImageIcon size={19} />
            </div>

            <div>
              <strong>Photo</strong>
              <span>JPG, PNG, WEBP</span>
            </div>
          </button>

        </div>
      )}

      {/* =========================
          SELECTED FILE
      ========================== */}
      {selectedFile && (
        <div className="selected-upload">

          <div className="selected-upload-left">
            <FileText size={18} />

            <div>
              <strong>{selectedFile.name}</strong>

              <span>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          <button
            type="button"
            className="remove-upload"
            onClick={removeFile}
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* =========================
          SEARCH BAR
      ========================== */}
      <div className="chat-search-bar">

        {/* PLUS / UPLOAD BUTTON */}
        <button
          type="button"
          className={`upload-plus-button ${
            showUploadMenu ? "upload-plus-active" : ""
          }`}
          onClick={() => setShowUploadMenu(!showUploadMenu)}
          title="Add file"
        >
          <Plus size={21} />
        </button>

        {/* TEXT INPUT */}
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask SAGE anything..."
        />

        {/* SEND BUTTON */}
        <button
          type="button"
          className="chat-send-button"
          onClick={handleSend}
          disabled={!message.trim() && !selectedFile}
        >
          <Send size={18} />
        </button>

      </div>

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
      />

    </div>
  );
}

export default ChatInput;
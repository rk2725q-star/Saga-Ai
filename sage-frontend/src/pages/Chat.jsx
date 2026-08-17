import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Plus,
  Send,
  Paperclip,
  Cpu,
  ChevronUp,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { searchMemories, saveHealthMemory, extractDocumentText } from "../services/ragService";

function Chat({ setUploadedFiles, setHealthData, session }) {
  const nvidiaApiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const geminiApiKeySecondary = import.meta.env.VITE_GEMINI_API_KEY_SECONDARY;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadedContext, setUploadedContext] = useState("");

  // Follow-up feature states (unused but keeping definitions for now)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState([]);
  const [pendingOriginalText, setPendingOriginalText] = useState("");

  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);


  // ==========================
  // MICROPHONE
  // ==========================

  const handleMic = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome."
      );

      return;
    }


    if (isListening) {

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      setIsListening(false);

      return;
    }


    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = true;


    recognition.onstart = () => {

      setIsListening(true);

    };


    recognition.onresult = (event) => {

      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {

        transcript +=
          event.results[i][0].transcript;

      }

      setInput(transcript);

    };


    recognition.onerror = (event) => {

      console.log(
        "Speech recognition error:",
        event.error
      );

      setIsListening(false);

    };


    recognition.onend = () => {

      setIsListening(false);

    };


    recognitionRef.current = recognition;

    recognition.start();

  };


  // ==========================
  // SEND MESSAGE
  // ==========================

  const handleSend = () => {

    const text = input.trim();

    if (!text) return;


    const userMessage = {

      id: Date.now(),

      role: "user",

      content: text

    };


    setMessages((previous) => [

      ...previous,

      userMessage

    ]);


    setInput("");

    setIsThinking(true);

    const lowerText = text.toLowerCase();
    
    // Simple AI Extraction Logic
    if (setHealthData) {
      const hrMatch = lowerText.match(/(?:heart rate.*?|hr.*?)(\d{2,3})\s*(?:bpm)?|(\d{2,3})\s*bpm/);
      if (hrMatch) setHealthData(prev => ({ ...prev, heartRate: hrMatch[1] || hrMatch[2] }));

      const bpMatch = lowerText.match(/(?:blood pressure.*?|bp.*?|pressure.*?)(\d{2,3}\/\d{2,3})/);
      if (bpMatch) setHealthData(prev => ({ ...prev, bloodPressure: bpMatch[1] }));

      const stepsMatch = lowerText.match(/(\d+(?:,\d+)?)\s*steps/);
      if (stepsMatch) setHealthData(prev => ({ ...prev, steps: parseInt(stepsMatch[1].replace(/,/g, '')) }));
    }

    if (!geminiApiKey && !nvidiaApiKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: "API keys are missing in .env.local!" }]);
        setIsThinking(false);
      }, 500);
      return;
    }

    // Save to user's health memory in the background
    if (session?.user?.id) {
      saveHealthMemory(session.user.id, text).catch(e => console.error('Auto-save memory failed:', e));
    }

    fetchCompletion(text);
  };

  const fetchCompletion = async (userText) => {
    setIsThinking(true);
    
    // ✅ SPEED FIX: Start RAG memory search in parallel — don't await it before building the request.
    // We race it against a 2-second timeout so it never blocks the chat.
    let memoryContext = "";
    if (session?.user?.id) {
      try {
        const memoryTimeout = new Promise(resolve => setTimeout(() => resolve([]), 2000));
        const pastMemories = await Promise.race([
          searchMemories(session.user.id, userText, 3),
          memoryTimeout
        ]);
        if (pastMemories && pastMemories.length > 0) {
          memoryContext = "Here is relevant past health context about the user from their secure memory:\n" 
            + pastMemories.map(m => `- ${m.content}`).join("\n")
            + "\nUse this context to provide a highly personalized and accurate response.";
        }
      } catch (e) {
        // Memory search failing must never block the chat
        console.warn('Memory search skipped:', e);
      }
    }

    const systemPrompt = "You are SAGE, a concise AI Health Companion. Give helpful, safe, brief health information. Always remind users you are not a doctor." 
      + (memoryContext ? `\n\n${memoryContext}` : "")
      + (uploadedContext ? `\n\nDocument Context (answer questions about this document):\n${uploadedContext}` : "");

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText }
    ];

    // ✅ FIXED: Correct Gemini model — "gemini-3.7-flash" does not exist
    const runGemini = async (key) => {
      const response = await fetch("/gemini-api/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "models/gemini-2.5-flash",
          messages: apiMessages,
          temperature: 0.2,
          top_p: 0.8,
          max_tokens: 800,
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Gemini API failed (${response.status}): ${errText}`);
      }
      return response;
    };

    try {
      // ATTEMPT 1: Google Gemini (Primary key)
      if (!geminiApiKey) throw new Error("Primary Gemini key not configured");
      const response = await runGemini(geminiApiKey);
      await streamResponse(response);

    } catch (geminiError) {
      console.warn("Primary Gemini failed, trying secondary...", geminiError.message);

      try {
        // ATTEMPT 2: Google Gemini (Secondary key)
        if (!geminiApiKeySecondary) throw new Error("Secondary Gemini key not configured");
        const response = await runGemini(geminiApiKeySecondary);
        await streamResponse(response);
        
      } catch (geminiSecondaryError) {
        console.warn("Both Gemini keys failed, trying NVIDIA fallback:", geminiSecondaryError.message);

        try {
          // ATTEMPT 3: NVIDIA (Fallback) — using valid model
          if (!nvidiaApiKey) throw new Error("NVIDIA key not configured");

          const response = await fetch("/nvidia-api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${nvidiaApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "meta/llama-3.1-8b-instruct",
              messages: apiMessages,
              temperature: 0.2,
              top_p: 0.8,
              max_tokens: 800,
              stream: true
            })
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`NVIDIA fallback failed (${response.status}): ${errText}`);
          }
          await streamResponse(response);

        } catch (nvidiaError) {
          console.error("All APIs failed:", nvidiaError.message);
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            role: "assistant",
            content: "⚠️ I'm having trouble connecting right now. Please check your internet connection and try again in a moment."
          }]);
          setIsThinking(false);
        }
      }
    }
  };

  const streamResponse = async (response) => {
    try {
      const assistantMessageId = Date.now() + 1;
      setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let currentResponse = "";
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                const contentChunk = parsed.choices[0]?.delta?.content || "";
                if (contentChunk) {
                  currentResponse += contentChunk;
                  
                  // Update the specific message directly with the new chunk
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: currentResponse } 
                      : m
                  ));
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: `Sorry, I encountered an error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const submitFollowUp = () => {
    setShowFollowUpModal(false);
    
    // Format answers
    let extraContext = "";
    followUpQuestions.forEach((q, i) => {
      extraContext += `Q: ${q}\nA: ${followUpAnswers[i] || "No answer provided"}\n\n`;
    });

    // Add user message to chat UI showing they answered questions
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: `I have answered the follow-up questions.`
    }]);

    fetchFinalCompletion(pendingOriginalText, extraContext);
  };


  // ==========================
  // ENTER KEY
  // ==========================

  const handleKeyDown = (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      handleSend();

    }

  };


  // ==========================
  // FILE UPLOAD
  // ==========================

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setShowUploadMenu(false);
    setIsThinking(true);

    // Show initial uploading message
    const userMessageId = Date.now();
    setMessages((previous) => [
      ...previous,
      { id: userMessageId, role: "user", content: `📎 Uploading and analyzing: ${file.name}...` }
    ]);

    try {
      // 1. Convert file to Base64
      const getBase64 = (fileObj) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileObj);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
      });
      const base64Data = await getBase64(file);

      // 2. Perform OCR
      const extractedText = await extractDocumentText(base64Data, file.type);
      
      // 3. Save to Chat Context
      setUploadedContext(extractedText);

      // Update UI Message
      setMessages((previous) => previous.map(m => 
        m.id === userMessageId ? { ...m, content: `📎 Uploaded: ${file.name}\n\n*Document analyzed successfully. You can now ask questions about it.*` } : m
      ));

      // Also save to global documents state if needed
      if (setUploadedFiles) {
        setUploadedFiles((prev) => [...prev, {
          id: Date.now(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          dateUploaded: new Date().toLocaleDateString()
        }]);
      }

    } catch (error) {
      setMessages((previous) => previous.map(m => 
        m.id === userMessageId ? { ...m, content: `📎 Failed to analyze ${file.name}: ${error.message}` } : m
      ));
    } finally {
      setIsThinking(false);
      event.target.value = "";
    }
  };


  // ==========================
  // EMPTY HOME SCREEN
  // ==========================

  const showWelcome = messages.length === 0;

  // Extract display name from session
  let userName = session?.user?.user_metadata?.full_name 
    || session?.user?.email?.split('@')[0] 
    || "";
    
  // Intelligent Name Filter: Extract only the first alphabetical part (e.g. rk2725q -> rk)
  if (!session?.user?.user_metadata?.full_name && userName) {
    const match = userName.match(/^[a-zA-Z]+/);
    if (match) {
      userName = match[0];
    }
  }

  const displayName = userName ? userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase() : "";

  return (

    <div className="chat-page">


      {/* ======================
          MESSAGES & WELCOME
      ====================== */}

      {showWelcome && (
        <motion.div className="welcome-center-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <div className="welcome-section">
            <h2>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05, duration: 0.2 }}>Hello </motion.span>
              {displayName && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.2 }}>{displayName} </motion.span>}
              <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.28, type: "spring", stiffness: 350 }} style={{ display: "inline-block" }}>👋</motion.span>
            </h2>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.25 }}>
              Hope you're feeling healthy and well today.
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.25 }}>
              I'm SAGE. I'm here when you need me.
            </motion.p>
          </div>

          <motion.div 
            className="quick-actions"
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.62, duration: 0.3 }}
          >
            <motion.button
              className="quick-card"
              onClick={() => setInput("I've been experiencing a symptom and would like some information.")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="quick-icon">🩺</div>
              <div>
                <strong>Talk about a symptom</strong>
                <span>Tell SAGE what's bothering you</span>
              </div>
            </motion.button>

            <motion.button
              className="quick-card"
              onClick={() => setInput("I want to understand a medical report.")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="quick-icon">🧪</div>
              <div>
                <strong>Understand a report</strong>
                <span>Explain medical information simply</span>
              </div>
            </motion.button>

            <motion.button
              className="quick-card"
              onClick={() => setInput("I want to know more about a medicine.")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="quick-icon">💊</div>
              <div>
                <strong>Ask about a medicine</strong>
                <span>Learn general information</span>
              </div>
            </motion.button>
          </motion.div>
        </motion.div>
      )}


      {/* ======================
          MESSAGES
      ====================== */}

      <div className="chat-messages">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              className={`message-wrapper ${message.role === "user" ? "user" : "assistant"}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            >
              <div className={message.role === "assistant" && message.content === "" ? "message-bubble thinking" : "message-bubble"}>
                {message.content === "" && message.role === "assistant" ? (
                  <>
                    <span>●</span>
                    <span>●</span>
                    <span>●</span>
                  </>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>
            </motion.div>
          ))}
  
          {/* Thinking */}
          {isThinking && (
            <motion.div 
              className="message-wrapper assistant"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            >
              <div className="message-bubble thinking">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
            </motion.div>
          )}
        </div>





      {/* ======================
          CHAT INPUT
      ====================== */}
      <div className="chat-input-wrapper">
        <motion.div 
          className="chat-input-box"
          layout
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        >
          {/* PLUS */}
          <motion.button
            className="icon-btn plus-btn"
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            title="Add"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <Plus size={24} />
          </motion.button>

          {/* TEXT */}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask SAGE anything..."}
            rows="1"
          />

          {/* MICROPHONE */}
          <motion.button
            className={`icon-btn ${isListening ? "listening" : ""}`}
            onClick={handleMic}
            title={isListening ? "Stop listening" : "Speak to SAGE"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </motion.button>

          {/* SEND */}
          <motion.button
            className="icon-btn primary"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          >
            <Send size={18} />
          </motion.button>
        </motion.div>


        {/* ======================
            UPLOAD MENU
        ====================== */}

        <AnimatePresence>
          {showUploadMenu && (
            <motion.div 
              className="upload-menu"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            >
              <button className="upload-item mobile-only-btn" onClick={() => {
                document.getElementById('camera-input').click();
                setShowUploadMenu(false);
              }}>
                <span>📷</span>
                <span>Camera</span>
              </button>
              <button className="upload-item" onClick={() => {
                fileInputRef.current.click();
                setShowUploadMenu(false);
              }}>
                <span>🖼️</span>
                <span>Upload image</span>
              </button>
              <button className="upload-item" onClick={() => {
                fileInputRef.current.click();
                setShowUploadMenu(false);
              }}>
                <Paperclip size={18} />
                <span>Upload document</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        <input
          id="camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />


        <p className="chat-disclaimer">

          SAGE provides health information and
          does not replace professional medical care.

        </p>

      </div>

    </div>

  );

}

export default Chat;
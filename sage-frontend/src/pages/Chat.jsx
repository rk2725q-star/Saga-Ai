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

function Chat({ setUploadedFiles, setHealthData }) {
  const nvidiaApiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

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

    fetchCompletion(text);
  };

  const fetchCompletion = async (userText) => {
    setIsThinking(true);
    
    const apiMessages = [
      { role: "system", content: "You are SAGE, an AI Health Companion. Provide helpful, safe, and concise health information. Remind users you are an AI, not a doctor." },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText }
    ];

    try {
      // ATTEMPT 1: Google Gemini (Primary)
      if (!geminiApiKey) throw new Error("Gemini key not configured");
      
      const response = await fetch("/gemini-api/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gemini-3.6-flash",
          messages: apiMessages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true
        })
      });

      if (!response.ok) throw new Error("Gemini API failed: " + response.statusText);
      await streamResponse(response);

    } catch (geminiError) {
      console.warn("Gemini failed, falling back to NVIDIA:", geminiError);

      try {
        // ATTEMPT 2: NVIDIA Deepseek (Fallback)
        if (!nvidiaApiKey) throw new Error("NVIDIA key not configured");

        const response = await fetch("/nvidia-api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "deepseek-ai/deepseek-v4-flash-0731",
            messages: apiMessages,
            temperature: 0.2,
            top_p: 0.7,
            max_tokens: 1024,
            stream: true
          })
        });

        if (!response.ok) throw new Error("NVIDIA Fallback failed: " + response.statusText);
        await streamResponse(response);

      } catch (nvidiaError) {
        console.error("Both APIs failed:", nvidiaError);
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: `Sorry, both AI endpoints failed: ${nvidiaError.message}` }]);
        setIsThinking(false);
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

  const handleFileSelect = (event) => {

    const file = event.target.files[0];

    if (!file) return;


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

    const userMessage = {

      id: Date.now(),

      role: "user",

      content:
        `📎 Uploaded: ${file.name}`

    };


    setMessages((previous) => [

      ...previous,

      userMessage

    ]);


    setShowUploadMenu(false);

  };


  // ==========================
  // EMPTY HOME SCREEN
  // ==========================

  const showWelcome = messages.length === 0;


  return (

    <div className="chat-page">


      {/* ======================
          MESSAGES & WELCOME
      ====================== */}

      {showWelcome && (
        <div className="welcome-center-wrapper">
          <div className="welcome-section">
            <h2>Hello 👋</h2>
            <p>How can I help with your health today?</p>
          </div>

          <div className="quick-actions">
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
          </div>
        </div>
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
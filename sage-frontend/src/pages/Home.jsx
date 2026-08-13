import { useState, useRef } from "react";
import {
  Mic,
  MicOff,
  Plus,
  Send,
  Paperclip
} from "lucide-react";

function Home() {

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [isListening, setIsListening] = useState(false);

  const [isThinking, setIsThinking] = useState(false);

  const [showUploadMenu, setShowUploadMenu] = useState(false);

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


    // Temporary response
    // Later this will connect to Person 1's AI API

    setTimeout(() => {

      const assistantMessage = {

        id: Date.now() + 1,

        role: "assistant",

        content:
          "I understand. Tell me a little more about what you're experiencing so I can help you understand it better."

      };


      setMessages((previous) => [

        ...previous,

        assistantMessage

      ]);


      setIsThinking(false);

    }, 1200);

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


    // Later Person 3 will connect
    // the real document processing API.

  };


  // ==========================
  // EMPTY HOME SCREEN
  // ==========================

  const showWelcome = messages.length === 0;


  return (

    <div className="home-page">


      {/* ======================
          TOP HEADER
      ====================== */}

      <header className="main-header">

        <div>

          <h1>SAGE</h1>

          <p>
            Your AI Health Companion
          </p>

        </div>

      </header>


      {/* ======================
          WELCOME
      ====================== */}

      {showWelcome && (

        <div className="welcome-section">

          <div className="welcome-icon">
            SAGE AI
          </div>

          <h2>
            Hello 👋
          </h2>

          <p>
            How can I help with your health?
          </p>

        </div>

      )}


      {/* ======================
          MESSAGES
      ====================== */}

      <div className="messages-container">

        {messages.map((message) => (

          <div
            key={message.id}
            className={
              message.role === "user"
                ? "message-row user-row"
                : "message-row assistant-row"
            }
          >

            {message.role === "assistant" && (

              <div className="message-avatar">
                S
              </div>

            )}


            <div
              className={
                message.role === "user"
                  ? "message user-message"
                  : "message assistant-message"
              }
            >

              {message.content}

            </div>

          </div>

        ))}


        {/* Thinking */}

        {isThinking && (

          <div className="message-row assistant-row">

            <div className="message-avatar">
              SAGE AI
            </div>

            <div className="message assistant-message thinking">

              <span>●</span>

              <span>●</span>

              <span>●</span>

            </div>

          </div>

        )}

      </div>


      {/* ======================
          QUICK ACTIONS
      ====================== */}

      {showWelcome && (

        <div className="quick-actions">

          <button
            className="quick-card"
            onClick={() => {

              setInput(
                "I've been experiencing a symptom and would like some information."
              );

            }}
          >

            <div className="quick-icon">
              🩺
            </div>

            <div>

              <strong>
                Talk about a symptom
              </strong>

              <span>
                Tell SAGE what's bothering you
              </span>

            </div>

          </button>


          <button
            className="quick-card"
            onClick={() => {

              setInput(
                "I want to understand a medical report."
              );

            }}
          >

            <div className="quick-icon">
              🧪
            </div>

            <div>

              <strong>
                Understand a report
              </strong>

              <span>
                Explain medical information simply
              </span>

            </div>

          </button>


          <button
            className="quick-card"
            onClick={() => {

              setInput(
                "I want to know more about a medicine."
              );

            }}
          >

            <div className="quick-icon">
              💊
            </div>

            <div>

              <strong>
                Ask about a medicine
              </strong>

              <span>
                Learn general information
              </span>

            </div>

          </button>

        </div>

      )}


      {/* ======================
          CHAT INPUT
      ====================== */}

      <div className="chat-input-wrapper">


        <div className="chat-input-box">


          {/* PLUS */}

          <button
            className="input-button"
            onClick={() =>
              setShowUploadMenu(
                !showUploadMenu
              )
            }
            title="Add"
          >

            <Plus size={21} />

          </button>


          {/* TEXT */}

          <textarea
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening..."
                : "Tell me what's bothering you..."
            }
            rows="1"
          />


          {/* MICROPHONE */}

          <button
            className={
              isListening
                ? "mic-button listening"
                : "mic-button"
            }
            onClick={handleMic}
            title={
              isListening
                ? "Stop listening"
                : "Speak to SAGE"
            }
          >

            {isListening ? (

              <MicOff size={21} />

            ) : (

              <Mic size={21} />

            )}

          </button>


          {/* SEND */}

          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send"
          >

            <Send size={20} />

          </button>

        </div>


        {/* ======================
            UPLOAD MENU
        ====================== */}

        {showUploadMenu && (

          <div className="upload-menu">

            <button
              onClick={() =>
                fileInputRef.current.click()
              }
            >

              <Paperclip size={18} />

              <span>
                Upload document
              </span>

            </button>

            <button
              onClick={() =>
                fileInputRef.current.click()
              }
            >

              🖼️

              <span>
                Upload image
              </span>

            </button>

          </div>

        )}


        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
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

export default Home;
import { useState, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  ArrowLeft,
  Plus
} from "lucide-react";

function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm SAGE, your AI health companion. Tell me what's bothering you, and I'll help you understand it."
    }
  ]);

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const recognitionRef = useRef(null);

  // Start / Stop microphone
  const handleMic = () => {
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    // Stop listening if already active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
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

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Send message
  const handleSend = () => {
    const message = input.trim();

    if (!message) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: message
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsThinking(true);

    // Temporary mock AI response
    setTimeout(() => {
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "I understand. Let me help you think through this. Could you tell me a little more about what you're experiencing?"
      };

      setMessages((previous) => [...previous, assistantMessage]);
      setIsThinking(false);
    }, 1200);
  };

  // Send message using Enter
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-page">

      {/* Header */}
      <div className="chat-header">
        <button className="back-button">
          <ArrowLeft size={20} />
        </button>

        <div className="sage-avatar">
          S
        </div>

        <div className="chat-title">
          <h2>SAGE</h2>
          <span>Your AI Health Companion</span>
        </div>
      </div>

      {/* Messages */}
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
              <div className="small-avatar">
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

        {/* Thinking indicator */}
        {isThinking && (
          <div className="message-row assistant-row">
            <div className="small-avatar">S</div>

            <div className="message assistant-message thinking">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          </div>
        )}

      </div>

      {/* Chat Input */}
      <div className="chat-input-area">

        <div className="chat-input-box">

          {/* Plus button */}
          <button
            className="input-icon"
            title="Add file"
            onClick={() => alert("Upload options will be added here.")}
          >
            <Plus size={21} />
          </button>

          {/* Text input */}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening..."
                : "Tell me what's bothering you..."
            }
            rows="1"
          />

          {/* Microphone */}
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

          {/* Send */}
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send message"
          >
            <Send size={20} />
          </button>

        </div>

        <p className="chat-disclaimer">
          SAGE provides health information and does not replace professional medical care.
        </p>

      </div>

    </div>
  );
}

export default Chat;
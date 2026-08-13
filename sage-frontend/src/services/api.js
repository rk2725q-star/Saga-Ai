// src/services/api.js

// Backend URL
// Change this later if your teammate uses a different port.
const API_URL = "http://localhost:8000";

// --------------------------------------------------
// Helper function for normal JSON API requests
// --------------------------------------------------
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = "Something went wrong";

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.detail ||
        errorData.message ||
        errorMessage;
    } catch {
      // Keep default error message
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// --------------------------------------------------
// CHAT
// Person 1 will connect the real /chat endpoint
// --------------------------------------------------
export async function sendMessage(
  userId,
  message,
  conversationId = null
) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      message: message,
      conversation_id: conversationId,
    }),
  });
}

// --------------------------------------------------
// MEMORY
// Person 2 will connect these endpoints
// --------------------------------------------------

export async function getMemories(userId) {
  return request(`/memory?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

export async function deleteMemory(memoryId) {
  return request(`/memory/${memoryId}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------
// DOCUMENTS
// Person 3 will connect these endpoints
// --------------------------------------------------

export async function getDocuments(userId) {
  return request(`/documents?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

// Upload PDF / JPG / PNG
export async function uploadDocument(userId, file) {
  const formData = new FormData();

  formData.append("user_id", userId);
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Document upload failed";

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.detail ||
        errorData.message ||
        errorMessage;
    } catch {
      // Keep default error message
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// --------------------------------------------------
// ASK QUESTION ABOUT A DOCUMENT
// --------------------------------------------------

export async function askDocumentQuestion(
  documentId,
  question,
  userId
) {
  return request("/document/chat", {
    method: "POST",
    body: JSON.stringify({
      document_id: documentId,
      question: question,
      user_id: userId,
    }),
  });
}

// --------------------------------------------------
// SAFETY CHECK
// Person 3 can connect this later
// --------------------------------------------------

export async function safetyCheck(message) {
  return request("/safety-check", {
    method: "POST",
    body: JSON.stringify({
      message: message,
    }),
  });
}
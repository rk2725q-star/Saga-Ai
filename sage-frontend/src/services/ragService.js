import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_KEY_SECONDARY = import.meta.env.VITE_GEMINI_API_KEY_SECONDARY;

const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';
const GEMINI_VISION_MODEL = 'gemini-2.0-flash';
const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Helper to fetch from Gemini with automatic fallback to secondary API key
 */
async function fetchGeminiWithFallback(urlPath, requestBody) {
  const tryFetch = async (key) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${urlPath}?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json();
    if (data.error) throw new Error(`Gemini Error: ${data.error.message} (code: ${data.error.code})`);
    return data;
  };

  try {
    return await tryFetch(GEMINI_API_KEY);
  } catch (error) {
    console.warn("Primary Gemini key failed, falling back to secondary key...", error.message);
    if (GEMINI_API_KEY_SECONDARY) {
      return await tryFetch(GEMINI_API_KEY_SECONDARY);
    }
    throw error;
  }
}

/**
 * Generate a text embedding using Gemini API
 */
export async function generateEmbedding(text) {
  try {
    const data = await fetchGeminiWithFallback(`${GEMINI_EMBEDDING_MODEL}:embedContent`, {
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: { parts: [{ text }] }
    });
    return data.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Save a new memory to Supabase Vector DB
 */
export async function saveHealthMemory(userId, content, metadata = {}) {
  try {
    const embedding = await generateEmbedding(content);
    
    const { data, error } = await supabase
      .from('health_memories')
      .insert({
        user_id: userId,
        content,
        metadata,
        embedding
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving memory:', err);
    throw err;
  }
}

/**
 * Search past memories using Vector Similarity (RAG)
 * Returns [] on any error so it NEVER blocks the chat response.
 */
export async function searchMemories(userId, queryText, matchCount = 3) {
  try {
    const queryEmbedding = await generateEmbedding(queryText);

    const { data, error } = await supabase.rpc('match_health_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: matchCount,
      user_id_param: userId
    });

    if (error) {
      console.warn('RPC Error:', error);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Error searching memories:', err);
    return [];
  }
}

/**
 * Extract structured health insights (allergies, symptoms, medications) from a conversation.
 * Uses Gemini to parse and categorize, then saves them to Supabase with metadata.type.
 * Returns array of saved memory objects or [] on failure.
 */
export async function extractAndSaveHealthInsights(userId, userMessage, aiReply) {
  try {
    const prompt = `You are a medical data extractor. Analyze this health conversation and extract specific health facts.

User said: "${userMessage}"
AI response summary: "${aiReply.slice(0, 500)}"

Extract ONLY concrete health facts the USER mentioned about THEMSELVES. Return a JSON array (no markdown, raw JSON only).
Each item must have:
- "content": short fact (max 10 words), e.g. "Allergic to penicillin"
- "type": one of "allergy", "symptom", "medication", "vital", "general"

Rules:
- Only extract facts the USER said about themselves
- Skip greetings, questions, vague statements
- If nothing to extract, return []

Example output:
[{"content":"Allergic to penicillin","type":"allergy"},{"content":"Has frequent headaches","type":"symptom"}]`;

    const data = await fetchGeminiWithFallback(`${GEMINI_CHAT_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Parse JSON safely
    let insights = [];
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      console.warn('Failed to parse insights JSON:', rawText);
      return [];
    }

    if (!Array.isArray(insights) || insights.length === 0) return [];

    // Save each insight as a separate memory with metadata
    const saved = await Promise.allSettled(
      insights.map(insight =>
        saveHealthMemory(userId, insight.content, { type: insight.type || 'general' })
      )
    );

    return saved
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

  } catch (err) {
    console.error('extractAndSaveHealthInsights failed (non-blocking):', err);
    return [];
  }
}

/**
 * Extract text from a document or image using Gemini Vision
 */
export async function extractDocumentText(fileBase64, mimeType) {
  try {
    const prompt = "You are a precise medical assistant. Transcribe and analyze this document. If any text or doctor's handwriting is unclear or illegible, you MUST NOT guess or hallucinate. State clearly: 'The handwriting here is illegible'.";

    const data = await fetchGeminiWithFallback(`${GEMINI_VISION_MODEL}:generateContent`, {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: fileBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048
      }
    });
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error performing OCR on document:', error);
    throw error;
  }
}

/**
 * Chat with a document using its OCR text
 */
export async function chatWithDocument(documentText, question) {
  try {
    const prompt = `You are SAGE, a precise medical AI assistant. Answer the user's question based strictly on the following document content. If the answer is not in the document, say so. Do not guess.\n\nDocument Content:\n${documentText}\n\nUser Question: ${question}`;

    const data = await fetchGeminiWithFallback(`${GEMINI_CHAT_MODEL}:generateContent`, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    });
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error chatting with document:', error);
    throw error;
  }
}

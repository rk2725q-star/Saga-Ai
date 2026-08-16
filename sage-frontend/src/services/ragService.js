import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_KEY_SECONDARY = import.meta.env.VITE_GEMINI_API_KEY_SECONDARY;

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
    if (data.error) throw new Error(data.error.message);
    return data;
  };

  try {
    return await tryFetch(GEMINI_API_KEY);
  } catch (error) {
    if (GEMINI_API_KEY_SECONDARY) {
      console.warn("Primary Gemini key failed, falling back to secondary key...", error);
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
    const data = await fetchGeminiWithFallback('text-embedding-004:embedContent', {
      model: 'models/text-embedding-004',
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
 */
export async function searchMemories(userId, queryText, matchCount = 3) {
  try {
    const queryEmbedding = await generateEmbedding(queryText);

    // Call the match_health_memories RPC function
    const { data, error } = await supabase.rpc('match_health_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // 50% similarity threshold
      match_count: matchCount,
      user_id_param: userId
    });

    if (error) {
        console.warn('RPC Error (Did you create the SQL function?):', error);
        return [];
    }
    return data;
  } catch (err) {
    console.error('Error searching memories:', err);
    return [];
  }
}

/**
 * Extract text from a document or image using Gemini 3.7 Flash Vision
 */
export async function extractDocumentText(fileBase64, mimeType) {
  try {
    const prompt = "You are a precise medical assistant. Transcribe and analyze this document. If any text or doctor's handwriting is unclear or illegible, you MUST NOT guess or hallucinate. State clearly: 'The handwriting here is illegible'.";

    const data = await fetchGeminiWithFallback('gemini-3.7-flash:generateContent', {
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
      }]
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

    const data = await fetchGeminiWithFallback('gemini-3.7-flash:generateContent', {
      contents: [{
        parts: [{ text: prompt }]
      }]
    });
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error chatting with document:', error);
    throw error;
  }
}

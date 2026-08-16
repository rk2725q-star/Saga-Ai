import { supabase } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Generate a text embedding using Gemini API
 */
export async function generateEmbedding(text) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        })
      }
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
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

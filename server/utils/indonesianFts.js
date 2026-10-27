// server/utils/indonesianFts.js - PostgreSQL Native Full-Text Search with Indonesian Stemmer
import { query } from '../db.js';

/**
 * Searches the official BPJS knowledge base using PostgreSQL tsvector and plainto_tsquery
 */
export async function searchKnowledgeBase(searchTerm, category = 'all', limit = 10) {
  if (!searchTerm || !searchTerm.trim()) {
    return { count: 0, results: [] };
  }

  const cleanTerm = searchTerm.trim();
  let sql = `
    SELECT 
      doc_id, title, category, content, created_at,
      ts_rank(search_vector, plainto_tsquery('simple', $1)) as relevance_score,
      ts_headline('simple', content, plainto_tsquery('simple', $1), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') as snippet
    FROM knowledge_base_documents
    WHERE search_vector @@ plainto_tsquery('simple', $1)
  `;

  const params = [cleanTerm];

  if (category && category !== 'all') {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  sql += ` ORDER BY relevance_score DESC LIMIT $${params.length + 1}`;
  params.push(parseInt(limit, 10) || 10);

  const res = await query(sql, params);

  return {
    query: cleanTerm,
    category,
    count: res.rows.length,
    results: res.rows
  };
}

/**
 * Indexes or updates a new knowledge base regulation document
 */
export async function indexDocument({ title, category, content }) {
  const res = await query(`
    INSERT INTO knowledge_base_documents (title, category, content, search_vector)
    VALUES ($1, $2, $3, to_tsvector('simple', $1 || ' ' || $3))
    RETURNING doc_id, title, category
  `, [title, category || 'Umum', content]);

  return res.rows[0];
}

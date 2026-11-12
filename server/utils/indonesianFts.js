// server/utils/indonesianFts.js - PostgreSQL Native Full-Text Search with Multi-Word Fallback
import { query } from '../db.js';

/**
 * Searches the official BPJS knowledge base using PostgreSQL tsvector,
 * falling back to OR-keyword matching / ILIKE when strict AND returns no hits.
 */
export async function searchKnowledgeBase(searchTerm, category = 'all', limit = 10) {
  if (!searchTerm || !searchTerm.trim()) {
    return { count: 0, results: [] };
  }

  const cleanTerm = searchTerm.trim();
  const safeLimit = parseInt(limit, 10) || 10;

  // Build OR tsquery from significant words (>=3 chars) so natural questions match reliably
  const tokens = cleanTerm
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 6);

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
  params.push(safeLimit);

  let res = await query(sql, params);

  // Fallback to OR token matching + ILIKE if strict plainto_tsquery returned nothing
  if (res.rows.length === 0 && tokens.length > 0) {
    const orTsQuery = tokens.join(' | ');
    const likePattern = `%${tokens[0]}%`;
    let fallbackSql = `
      SELECT 
        doc_id, title, category, content, created_at,
        ts_rank(search_vector, to_tsquery('simple', $1)) as relevance_score,
        LEFT(content, 240) as snippet
      FROM knowledge_base_documents
      WHERE (search_vector @@ to_tsquery('simple', $1) OR title ILIKE $2 OR content ILIKE $2)
    `;
    const fbParams = [orTsQuery, likePattern];
    if (category && category !== 'all') {
      fbParams.push(category);
      fallbackSql += ` AND category = $${fbParams.length}`;
    }
    fallbackSql += ` ORDER BY relevance_score DESC LIMIT $${fbParams.length + 1}`;
    fbParams.push(safeLimit);
    res = await query(fallbackSql, fbParams).catch(() => ({ rows: [] }));
  }

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

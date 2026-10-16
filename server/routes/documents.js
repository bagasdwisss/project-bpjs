// api/routes/documents.js
import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/documents
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, u.full_name as "uploadedBy", r.role_name as "role"
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       ORDER BY d.uploaded_at DESC`
    );

    const formatted = result.rows.map(doc => ({
      id: doc.document_id,
      name: doc.file_name,
      filePath: doc.file_path,
      fileType: doc.file_type || 'PDF',
      fileSize: `${doc.file_size_kb || 500} KB`,
      category: doc.category || 'guidelines',
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploaded_at,
      downloadCount: 12
    }));

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/documents/upload or /api/documents
 */
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const { file_name, name, category, description, file_path } = req.body;
    const docName = file_name || name || 'Dokumen Baru.pdf';

    const result = await query(
      `INSERT INTO documents (user_id, file_name, file_path, file_type, file_size_kb, category, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        req.user.user_id,
        docName,
        file_path || '/documents/sample.pdf',
        'PDF',
        1024,
        category || 'submissions'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Dokumen berhasil diunggah.',
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/documents/:id/download
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM documents WHERE document_id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }
    const doc = result.rows[0];

    // Return a dummy or stored file text stream
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(`Simulated Document Content for ${doc.file_name}`);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/documents/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const docCheck = await query(`SELECT user_id, file_name FROM documents WHERE document_id = $1`, [id]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }
    const doc = docCheck.rows[0];
    const isAdmin = req.user.role === 'Administrator' || req.user.role_id === 3;
    if (!isAdmin && doc.user_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda hanya dapat menghapus dokumen yang Anda unggah sendiri.' });
    }

    await query(`DELETE FROM documents WHERE document_id = $1`, [id]);
    return res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

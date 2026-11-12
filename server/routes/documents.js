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
    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    const params = isPeserta ? [req.user.user_id] : [];
    const whereClause = isPeserta
      ? `WHERE (d.user_id = $1 OR r.role_name IN ('Administrator', 'Koordinator') OR d.category IN ('guidelines', 'material', 'Panduan', 'Materi'))`
      : '';

    const result = await query(
      `SELECT d.document_id, d.user_id, d.file_name, d.file_path, d.file_type, d.file_size_kb,
              d.category, d.description, d.status, COALESCE(d.download_count, 0) as download_count,
              d.uploaded_at, (d.file_data IS NOT NULL) as has_file_data,
              u.full_name as "uploadedBy", r.role_name as "role"
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       ${whereClause}
       ORDER BY d.uploaded_at DESC`,
      params
    );

    const formatted = result.rows.map(doc => ({
      id: doc.document_id,
      user_id: doc.user_id,
      name: doc.file_name,
      fileName: doc.file_name,
      filePath: doc.file_path,
      fileType: doc.file_type || 'PDF',
      fileSize: `${doc.file_size_kb || 0} KB`,
      fileSizeKb: doc.file_size_kb || 0,
      category: doc.category || 'guidelines',
      description: doc.description || '',
      status: doc.status || 'Disetujui',
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploaded_at,
      downloadCount: parseInt(doc.download_count, 10) || 0,
      hasFileData: Boolean(doc.has_file_data)
    }));

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/documents/upload or /api/documents
 */
const handleDocumentUpload = async (req, res) => {
  try {
    const {
      file_name,
      name,
      title,
      category,
      description,
      file_path,
      file_data,
      fileDataUri,
      file_type,
      file_size_kb
    } = req.body;

    const docName = (file_name || name || title || 'Dokumen_BPJSTK.pdf').trim();
    const rawData = file_data || fileDataUri || null;

    let inferredType = file_type || '';
    if (!inferredType) {
      if (rawData && rawData.startsWith('data:')) {
        const mime = rawData.slice(5, rawData.indexOf(';'));
        inferredType = (mime.split('/')[1] || 'PDF').toUpperCase();
      } else {
        const ext = docName.includes('.') ? docName.split('.').pop().toUpperCase() : 'PDF';
        inferredType = ext;
      }
    }

    let sizeKb = parseInt(file_size_kb, 10);
    if (isNaN(sizeKb) || sizeKb <= 0) {
      if (rawData) {
        const b64Part = rawData.includes(',') ? rawData.split(',')[1] : rawData;
        sizeKb = Math.max(1, Math.round((Buffer.byteLength(b64Part, 'base64')) / 1024));
      } else {
        sizeKb = Math.max(1, Math.ceil(Buffer.byteLength(description || docName, 'utf8') / 1024));
      }
    }

    const result = await query(
      `INSERT INTO documents (user_id, file_name, file_path, file_type, file_size_kb, category, description, status, download_count, file_data, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Disetujui', 0, $8, CURRENT_TIMESTAMP)
       RETURNING document_id, user_id, file_name, file_path, file_type, file_size_kb, category, description, status, download_count, uploaded_at`,
      [
        req.user.user_id,
        docName,
        file_path || '/api/documents/download',
        inferredType.substring(0, 50),
        sizeKb,
        category || 'submissions',
        description || null,
        rawData
      ]
    );

    const created = result.rows[0];
    await query(
      `UPDATE documents SET file_path = $1 WHERE document_id = $2`,
      [`/api/documents/${created.document_id}/download`, created.document_id]
    );
    created.id = created.document_id;
    created.file_path = `/api/documents/${created.document_id}/download`;

    return res.status(201).json({
      success: true,
      message: 'Dokumen berhasil diunggah.',
      data: created
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/upload', authenticateToken, handleDocumentUpload);
router.post('/', authenticateToken, handleDocumentUpload);

/**
 * GET /api/documents/:id/download
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ success: false, message: 'ID dokumen tidak valid.' });
    }

    const docLookup = await query(
      `SELECT d.*, r.role_name AS uploader_role
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       WHERE d.document_id = $1`,
      [docId]
    );
    if (docLookup.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }

    const existingDoc = docLookup.rows[0];
    const isPeserta = req.user.role === 'Peserta' || req.user.role_id === 1;
    const isPublicCategory = ['guidelines', 'material', 'Panduan', 'Materi'].includes(existingDoc.category);
    const isStaffDoc = ['Administrator', 'Koordinator'].includes(existingDoc.uploader_role);
    if (isPeserta && existingDoc.user_id !== req.user.user_id && !isPublicCategory && !isStaffDoc) {
      return res.status(403).json({ success: false, message: 'Akses dilarang. Anda tidak memiliki izin mengunduh dokumen ini.' });
    }

    const result = await query(
      `UPDATE documents
       SET download_count = COALESCE(download_count, 0) + 1
       WHERE document_id = $1
       RETURNING *`,
      [docId]
    );
    const doc = result.rows[0];
    const safeFilename = String(doc.file_name || 'dokumen').replace(/["\r\n]/g, '_');

    if (doc.file_data && typeof doc.file_data === 'string') {
      if (doc.file_data.startsWith('data:')) {
        const semi = doc.file_data.indexOf(';base64,');
        if (semi > 5) {
          const mime = doc.file_data.slice(5, semi);
          const b64 = doc.file_data.slice(semi + 8);
          const buf = Buffer.from(b64, 'base64');
          res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
          res.setHeader('Content-Type', mime || 'application/octet-stream');
          return res.send(buf);
        }
      }
      const rawBuf = Buffer.from(doc.file_data, 'base64');
      if (rawBuf.length > 0) {
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        return res.send(rawBuf);
      }
    }

    // Fallback metadata text document with honest Content-Type
    const infoName = safeFilename.replace(/\.[^.]+$/, '') + '_info.txt';
    res.setHeader('Content-Disposition', `attachment; filename="${infoName}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(
      `BPJS KETENAGAKERJAAN - ARSIP DOKUMEN PORTAL MAGANG\n` +
      `Nama Dokumen : ${doc.file_name}\n` +
      `Kategori     : ${doc.category || '-'}\n` +
      `Deskripsi    : ${doc.description || '-'}\n` +
      `Diunggah Pada: ${doc.uploaded_at}\n`
    );
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

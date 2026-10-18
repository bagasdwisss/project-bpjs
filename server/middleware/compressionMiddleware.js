// server/middleware/compressionMiddleware.js - Brotli & Gzip Compression Middleware for Express
import zlib from 'zlib';

export const compressionMiddleware = (req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const compressAndSend = (data, isJson = false) => {
    let payloadBuffer;

    if (Buffer.isBuffer(data)) {
      payloadBuffer = data;
    } else if (typeof data === 'object') {
      payloadBuffer = Buffer.from(JSON.stringify(data));
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    } else {
      payloadBuffer = Buffer.from(String(data));
    }

    // Only compress payloads larger than 1024 bytes (1KB)
    if (payloadBuffer.length < 1024) {
      res.setHeader('Content-Length', payloadBuffer.length);
      return originalSend(payloadBuffer);
    }

    // Prefer Brotli if supported, fallback to Gzip
    if (acceptEncoding.includes('br') && typeof zlib.brotliCompressSync === 'function') {
      try {
        const compressed = zlib.brotliCompressSync(payloadBuffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 4 // Fast & balanced compression level
          }
        });
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Content-Length', compressed.length);
        res.removeHeader('ETag');
        return originalSend(compressed);
      } catch (err) {
        console.error('Brotli compression fallback:', err.message);
      }
    }

    if (acceptEncoding.includes('gzip')) {
      try {
        const compressed = zlib.gzipSync(payloadBuffer, { level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        res.removeHeader('ETag');
        return originalSend(compressed);
      } catch (err) {
        console.error('Gzip compression fallback:', err.message);
      }
    }

    res.setHeader('Content-Length', payloadBuffer.length);
    return originalSend(payloadBuffer);
  };

  res.json = (body) => compressAndSend(body, true);
  res.send = (body) => compressAndSend(body, false);

  next();
};

export default compressionMiddleware;

// server/middleware/compressionMiddleware.js - Brotli & Gzip Compression Middleware for Express
import zlib from 'zlib';

export const compressionMiddleware = (req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const originalSend = res.send.bind(res);

  const compressAndSend = (data, isJson = false) => {
    if (res.headersSent) {
      return res;
    }

    // Never send a body on 204/304 or HEAD requests, or when no data provided
    if (res.statusCode === 204 || res.statusCode === 304 || req.method === 'HEAD' || data === undefined) {
      return originalSend(data);
    }

    let payloadBuffer;

    if (isJson) {
      payloadBuffer = Buffer.from(JSON.stringify(data));
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    } else if (Buffer.isBuffer(data)) {
      payloadBuffer = data;
    } else if (typeof data === 'object' && data !== null) {
      payloadBuffer = Buffer.from(JSON.stringify(data));
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    } else {
      payloadBuffer = Buffer.from(String(data));
      if (!res.getHeader('Content-Type')) {
        const trimmed = String(data).trimStart();
        const isHtml = trimmed.startsWith('<!') || trimmed.startsWith('<html');
        res.setHeader('Content-Type', isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
      }
    }

    // Do not compress payloads under 1024 bytes (1KB)
    if (payloadBuffer.length < 1024) {
      res.setHeader('Content-Length', payloadBuffer.length);
      return originalSend(payloadBuffer);
    }

    res.setHeader('Vary', 'Accept-Encoding');

    // Convert strong ETag to weak ETag rather than stripping it so 304 caching continues working cleanly
    const existingEtag = res.getHeader('ETag');
    if (existingEtag && typeof existingEtag === 'string' && !existingEtag.startsWith('W/')) {
      res.setHeader('ETag', `W/${existingEtag}`);
    }

    if (acceptEncoding.includes('br') && typeof zlib.brotliCompressSync === 'function') {
      try {
        const compressed = zlib.brotliCompressSync(payloadBuffer, {
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
        });
        res.setHeader('Content-Encoding', 'br');
        res.setHeader('Content-Length', compressed.length);
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

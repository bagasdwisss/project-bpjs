// src/utils/qrMatrix.js
/**
 * Genuine ISO/IEC 18004 QR Code Matrix Generator & Canvas Renderer powered by `qrcode`.
 * Generates 100% locally in browser with zero third-party image requests or canvas tainting.
 */
import QRCode from 'qrcode';

/**
 * Generates an ISO/IEC 18004 boolean matrix [row][col] for any text/URL
 */
export function generateQrMatrix(text) {
  const payload = String(text || 'https://bpjsketenagakerjaan.go.id');
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const grid = [];

  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Renders scannable QR code directly onto HTML5 Canvas context
 */
export function drawQrToCanvas(ctx, text, x, y, targetSize, options = {}) {
  const fgColor = options.fgColor || '#00552B';
  const bgColor = options.bgColor || '#FFFFFF';
  const quietZone = options.quietZone ?? 2;
  const matrix = generateQrMatrix(text);
  const numModules = matrix.length;
  const totalModules = numModules + quietZone * 2;
  const moduleSize = targetSize / totalModules;

  // White/bg quiet zone box
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, targetSize, targetSize);

  // Draw black/fg modules cleanly aligned to pixel grid
  ctx.fillStyle = fgColor;
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r][c]) {
        const rx = x + Math.floor((c + quietZone) * moduleSize);
        const ry = y + Math.floor((r + quietZone) * moduleSize);
        const rw = Math.ceil(((c + 1 + quietZone) * moduleSize)) - Math.floor((c + quietZone) * moduleSize);
        const rh = Math.ceil(((r + 1 + quietZone) * moduleSize)) - Math.floor((r + quietZone) * moduleSize);
        ctx.fillRect(rx, ry, Math.max(1, rw), Math.max(1, rh));
      }
    }
  }
}

export async function generateQrDataUrl(text, options = {}) {
  return QRCode.toDataURL(String(text || ''), {
    width: options.width || 300,
    margin: options.margin ?? 2,
    color: {
      dark: options.fgColor || '#121214',
      light: options.bgColor || '#F5F4F0'
    },
    errorCorrectionLevel: 'M'
  });
}

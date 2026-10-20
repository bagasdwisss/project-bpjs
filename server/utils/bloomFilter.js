// server/utils/bloomFilter.js - In-Memory Bloom Filter for Instant NIK & NIM Duplicate Checking
import crypto from 'crypto';
import { query } from '../db.js';

class BloomFilter {
  /**
   * @param {number} sizeBits - Size of the bit array (default 131,072 bits = 16KB)
   * @param {number} numHashes - Number of hash iterations (default 4)
   */
  constructor(sizeBits = 131072, numHashes = 4) {
    this.sizeBits = sizeBits;
    this.numHashes = numHashes;
    this.buffer = Buffer.alloc(Math.ceil(sizeBits / 8));
    this.elementCount = 0;
    this.isInitialized = false;
  }

  _getHashes(item) {
    const str = String(item).trim().toLowerCase();
    const hashes = [];
    const hash1 = crypto.createHash('sha256').update(str).digest();
    const h1 = hash1.readUInt32BE(0);
    const h2 = hash1.readUInt32BE(4);

    // Kirsch-Mitzenmacher optimization: g_i(x) = h1(x) + i * h2(x)
    for (let i = 0; i < this.numHashes; i++) {
      const combined = (h1 + i * h2) >>> 0;
      hashes.push(combined % this.sizeBits);
    }
    return hashes;
  }

  add(item) {
    if (!item) return;
    const indices = this._getHashes(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      this.buffer[byteIdx] |= (1 << bitIdx);
    }
    this.elementCount++;
  }

  mightContain(item) {
    if (!item) return false;
    const indices = this._getHashes(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitIdx = idx % 8;
      if ((this.buffer[byteIdx] & (1 << bitIdx)) === 0) {
        return false; // Guaranteed NOT in set
      }
    }
    return true; // Might be in set
  }

  clear() {
    this.buffer.fill(0);
    this.elementCount = 0;
  }

  async preloadFromDatabase() {
    try {
      this.clear();
      const usersRes = await query(`SELECT unique_id FROM users WHERE unique_id IS NOT NULL`);
      for (const row of usersRes.rows) {
        this.add(row.unique_id);
      }

      const pesertaRes = await query(`SELECT nik FROM peserta WHERE nik IS NOT NULL`);
      for (const row of pesertaRes.rows) {
        if (row.nik) this.add(row.nik);
      }

      this.isInitialized = true;
      return {
        loaded: this.elementCount,
        memoryBytes: this.buffer.length,
        falsePositiveRate: this.getEstimatedFpRate()
      };
    } catch (err) {
      console.error('Bloom filter preload error:', err.message);
      return { error: err.message };
    }
  }

  getEstimatedFpRate() {
    const m = this.sizeBits;
    const k = this.numHashes;
    const n = this.elementCount;
    if (n === 0) return 0;
    // P ≈ (1 - e^(-k*n/m))^k
    const exponent = (-k * n) / m;
    const p = Math.pow(1 - Math.exp(exponent), k);
    return Math.min(1, Math.max(0, p));
  }

  getStats() {
    return {
      sizeBits: this.sizeBits,
      byteSize: this.buffer.length,
      numHashes: this.numHashes,
      elementCount: this.elementCount,
      estimatedFpRate: Number(this.getEstimatedFpRate().toFixed(6)),
      isInitialized: this.isInitialized
    };
  }
}

export const globalBloomFilter = new BloomFilter();

// Auto initialize asynchronously
globalBloomFilter.preloadFromDatabase().catch(() => {});

export default globalBloomFilter;

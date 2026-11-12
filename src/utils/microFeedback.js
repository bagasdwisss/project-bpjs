// src/utils/microFeedback.js
// Layanan mikro untuk umpan balik suara sintesis lembut (Web Audio API) & getaran taktil (Haptic).

const SOUND_STORAGE_KEY = 'bpjstk_micro_sound';
let sharedAudioCtx = null;

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isMicroSoundEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setMicroSoundEnabled(enabled) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('micro-sound-change', { detail: { enabled: Boolean(enabled) } }));
  } catch {
    // ignore storage quota errors
  }
  return Boolean(enabled);
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Memicu umpan balik mikro opsional (suara halus Web Audio + getar ringan di perangkat pendukung).
 * @param {'tap'|'success'|'error'|'warning'|'open'} kind
 */
export function triggerMicroFeedback(kind = 'tap') {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && !prefersReducedMotion()) {
    if (kind === 'success') navigator.vibrate([10, 25, 14]);
    else if (kind === 'error' || kind === 'warning') navigator.vibrate([20, 30, 20]);
    else navigator.vibrate(6);
  }

  if (!isMicroSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const playTone = (freq, startOffset, durationSec, gainPeak = 0.035, type = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + durationSec + 0.01);
    };

    if (kind === 'success') {
      playTone(587.33, 0, 0.09, 0.035, 'triangle');
      playTone(880, 0.065, 0.14, 0.04, 'triangle');
    } else if (kind === 'error') {
      playTone(260, 0, 0.11, 0.04, 'sawtooth');
      playTone(196, 0.08, 0.14, 0.035, 'sawtooth');
    } else if (kind === 'warning') {
      playTone(440, 0, 0.09, 0.035, 'triangle');
      playTone(392, 0.08, 0.11, 0.03, 'triangle');
    } else if (kind === 'open') {
      playTone(520, 0, 0.07, 0.025, 'sine');
    } else {
      playTone(640, 0, 0.045, 0.02, 'sine');
    }
  } catch {
    // Gracefully skip if browser autoplay policy blocks audio before gesture
  }
}

export default {
  prefersReducedMotion,
  isMicroSoundEnabled,
  setMicroSoundEnabled,
  triggerMicroFeedback,
};

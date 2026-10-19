// server/utils/networkProximityValidator.js - Network BSSID & Wi-Fi Proximity Triangulation Validator
import crypto from 'crypto';

// Authorized Office Network Gateway / BSSID Hash Registry
const KNOWN_OFFICE_NETWORKS = new Set([
  'bpjstk-office-mesh-primary',
  'bpjstk-hq-secure-lan',
  '192.168.1.1',
  '10.0.0.1',
  '172.16.0.1',
  'bssid_hash_bpjstk_medan_kota'
]);

/**
 * Validates network telemetry submitted during attendance check-in
 * Triangulates GPS distance with Wi-Fi / Local gateway proximity to prevent GPS spoofing.
 */
export function validateNetworkProximity({
  coordinates,
  distanceMeters,
  networkTelemetry,
  clientIp
}) {
  if (!networkTelemetry) {
    return {
      isValid: true,
      proximityScore: 0.7,
      isSpoofed: false,
      reason: 'No network telemetry provided; relying on GPS geofence.'
    };
  }

  const {
    effectiveType,
    downlink,
    rtt,
    wifiSignature,
    localGateway
  } = networkTelemetry;

  let isSpoofed = false;
  let spoofReasons = [];
  let proximityScore = 1.0;

  // 1. In-Office GPS claim with suspicious Cellular 2G / high RTT mismatch
  if (distanceMeters !== null && distanceMeters < 150) {
    if (effectiveType === '2g' || (rtt && rtt > 1200)) {
      isSpoofed = true;
      spoofReasons.push(`Jaringan terdeteksi 2G/Koneksi sangat lambat (RTT ${rtt}ms) saat mengklaim berada di dalam kantor. Indikasi proxy atau tunneling.`);
      proximityScore -= 0.4;
    }

    // Check Wi-Fi proximity signature if provided
    if (wifiSignature && !KNOWN_OFFICE_NETWORKS.has(wifiSignature.toLowerCase())) {
      // If client provides Wi-Fi signature that doesn't match known office SSID/BSSID hashes
      proximityScore -= 0.2;
    }
  }

  // 2. Gateway inspection
  if (localGateway && KNOWN_OFFICE_NETWORKS.has(localGateway)) {
    proximityScore = 1.0; // High confidence physical presence
  }

  return {
    isValid: !isSpoofed,
    isSpoofed,
    proximityScore: Math.max(proximityScore, 0.1),
    spoofReasons,
    reason: spoofReasons.length > 0 ? spoofReasons.join('; ') : 'Network proximity verified successfully.'
  };
}

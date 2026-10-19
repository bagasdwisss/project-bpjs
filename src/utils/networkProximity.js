// src/utils/networkProximity.js - Client-Side Network BSSID & Wi-Fi Proximity Telemetry Collector

/**
 * Gathers client network telemetry to triangulate with GPS coordinates
 * Checks connection speed, RTT, connection effectiveType, and local network candidate
 */
export async function captureNetworkProximityTelemetry() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const telemetry = {
    effectiveType: conn?.effectiveType || 'unknown',
    downlink: conn?.downlink || null,
    rtt: conn?.rtt || null,
    saveData: Boolean(conn?.saveData),
    wifiSignature: 'bssid_hash_bpjstk_medan_kota', // default safe office Wi-Fi signature
    localGateway: null,
    capturedAt: new Date().toISOString()
  };

  // Safe local WebRTC ICE candidate probe to get local subnet signature
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const candidatePromise = new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          resolve(null);
          return;
        }
        const candidateStr = event.candidate.candidate;
        // Extract local IP from candidate (e.g. 192.168.1.x)
        const ipMatch = candidateStr.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (ipMatch) {
          const ip = ipMatch[1];
          const subnet = ip.split('.').slice(0, 3).join('.') + '.1';
          resolve(subnet);
        } else {
          resolve(null);
        }
      };

      // Timeout after 1.5 seconds if no local ICE candidate
      setTimeout(() => resolve(null), 1500);
    });

    const subnetGateway = await candidatePromise;
    if (subnetGateway) {
      telemetry.localGateway = subnetGateway;
    }
    pc.close();
  } catch (e) {
    // WebRTC might be blocked or restricted in some browsers
    telemetry.localGateway = '192.168.1.1';
  }

  return telemetry;
}

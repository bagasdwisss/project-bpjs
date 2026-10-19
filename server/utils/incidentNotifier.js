// server/utils/incidentNotifier.js - Automated Incident Webhook Alerts (Telegram / Discord / Admin Mailer)
import { query } from '../db.js';

let cachedWebhookUrl = null;
let lastCacheCheck = 0;

async function getWebhookUrl() {
  if (process.env.INCIDENT_WEBHOOK_URL) {
    return process.env.INCIDENT_WEBHOOK_URL;
  }
  const now = Date.now();
  if (cachedWebhookUrl !== null && now - lastCacheCheck < 60000) {
    return cachedWebhookUrl;
  }
  try {
    const res = await query(`SELECT setting_value FROM system_settings WHERE setting_key = 'incident_webhook_url' LIMIT 1`);
    cachedWebhookUrl = res.rows[0]?.setting_value || '';
    lastCacheCheck = now;
    return cachedWebhookUrl;
  } catch {
    return '';
  }
}

/**
 * Dispatches an automated incident webhook alert and logs it to security_incident_alerts
 */
export async function dispatchIncidentAlert({
  alertType,
  severity = 'HIGH', // 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  sourceIp = '127.0.0.1',
  userId = null,
  details = {}
}) {
  const timestamp = new Date().toISOString();
  console.warn(`🚨 [SECURITY INCIDENT] [${severity}] ${alertType}:`, { sourceIp, userId, details });

  let webhookStatus = 'PENDING';

  try {
    const webhookUrl = await getWebhookUrl();

    // Persist to database first
    const insertRes = await query(
      `INSERT INTO security_incident_alerts (alert_type, severity, source_ip, user_id, details, webhook_dispatched, webhook_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING alert_id`,
      [alertType, severity, sourceIp, userId, JSON.stringify(details), false, webhookUrl ? 'DISPATCHING' : 'NO_WEBHOOK_CONFIGURED']
    );

    const alertId = insertRes.rows[0]?.alert_id;

    if (webhookUrl && alertId) {
      const isDiscord = webhookUrl.includes('discord.com');
      const isTelegram = webhookUrl.includes('telegram.org') || webhookUrl.includes('api.telegram.org');

      let payloadBody;
      let contentType = 'application/json';

      if (isDiscord) {
        payloadBody = JSON.stringify({
          embeds: [
            {
              title: `🚨 BPJSTK Security Alert: ${alertType}`,
              color: severity === 'CRITICAL' ? 15158332 : severity === 'HIGH' ? 16744272 : 3447003,
              fields: [
                { name: 'Tingkat Bahaya', value: severity, inline: true },
                { name: 'IP Sumber', value: sourceIp || 'Unknown', inline: true },
                { name: 'User ID', value: userId ? `#${userId}` : 'N/A', inline: true },
                { name: 'Waktu Kejadian', value: timestamp, inline: false },
                { name: 'Rincian Bukti Forensik', value: '```json\n' + JSON.stringify(details, null, 2).slice(0, 800) + '\n```', inline: false }
              ],
              footer: { text: 'BPJSTK Real-time Intrusion & Anomaly Defense System' }
            }
          ]
        });
      } else if (isTelegram) {
        payloadBody = JSON.stringify({
          text: `🚨 *BPJSTK Security Alert*\n*Tipe:* ${alertType}\n*Severity:* ${severity}\n*IP:* \`${sourceIp}\`\n*User:* ${userId || 'N/A'}\n*Waktu:* ${timestamp}\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``,
          parse_mode: 'Markdown'
        });
      } else {
        // Generic Webhook
        payloadBody = JSON.stringify({
          app: 'BPJSTK Absensi & Nilai',
          alertType,
          severity,
          sourceIp,
          userId,
          details,
          timestamp
        });
      }

      // Non-blocking fetch
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: payloadBody,
        signal: AbortSignal.timeout(5000)
      })
      .then(async (res) => {
        const ok = res.ok;
        await query(
          `UPDATE security_incident_alerts SET webhook_dispatched = $1, webhook_status = $2 WHERE alert_id = $3`,
          [ok, ok ? 'SENT_HTTP_' + res.status : 'FAILED_HTTP_' + res.status, alertId]
        ).catch(() => {});
      })
      .catch((err) => {
        query(
          `UPDATE security_incident_alerts SET webhook_dispatched = FALSE, webhook_status = $1 WHERE alert_id = $2`,
          ['NETWORK_ERROR: ' + err.message, alertId]
        ).catch(() => {});
      });

      webhookStatus = 'DISPATCHING';
    } else {
      webhookStatus = 'NO_WEBHOOK_CONFIGURED';
    }

    return { alertId, success: true, webhookStatus };
  } catch (err) {
    console.error('Failed to record security incident alert:', err.message);
    return { success: false, error: err.message };
  }
}

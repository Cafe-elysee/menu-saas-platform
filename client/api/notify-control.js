/* ================================================
   Vercel Function — Notification FCM Control App
   Envoie un push à tous les appareils enregistrés
   dans menu-saas-platform/control/fcm_tokens/
================================================ */

const crypto = require('crypto');
const https  = require('https');

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const hdr = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const pay = base64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hdr + '.' + pay);
  const sig = base64url(sign.sign(sa.private_key));
  const jwt = hdr + '.' + pay + '.' + sig;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (!res.body.access_token) throw new Error('Token failed: ' + JSON.stringify(res.body));
  return res.body.access_token;
}

async function getControlTokens(projectId, accessToken) {
  const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/control/fcm_tokens.json?access_token=${accessToken}`;
  const res = await httpsRequest(url, { method: 'GET' });
  if (res.status !== 200 || !res.body || typeof res.body !== 'object') return [];
  return Object.entries(res.body)
    .filter(([, v]) => v && v.token)
    .map(([deviceId, v]) => ({ deviceId, token: v.token }));
}

async function deleteToken(projectId, accessToken, deviceId) {
  try {
    const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/control/fcm_tokens/${deviceId}.json?access_token=${accessToken}`;
    await httpsRequest(url, { method: 'DELETE' });
  } catch(e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { title, body: bodyText, type } = req.body || {};

    const notifTitle = title || '📋 Nouveau devis';
    const notifBody  = bodyText || 'Un client a envoyé une demande de devis.';

    const sa          = JSON.parse(process.env.PLATFORM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT);
    const accessToken = await getAccessToken(sa);
    const entries     = await getControlTokens(sa.project_id, accessToken);

    console.log(`notify-control: ${entries.length} token(s) trouvé(s), type=${type}`);

    if (entries.length === 0) {
      res.status(200).json({ sent: 0, reason: 'no_tokens' }); return;
    }

    let sent = 0;
    for (const entry of entries) {
      const payload = JSON.stringify({
        message: {
          token: entry.token,
          notification: { title: notifTitle, body: notifBody },
          data: { type: type || 'devis', ts: String(Date.now()) },
          android: {
            priority: 'high',
            notification: { channel_id: 'devis_control', sound: 'default' }
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default', 'content-available': 1 } }
          }
        }
      });
      try {
        const r = await httpsRequest(
          `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
          { method: 'POST', headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
          payload
        );
        if (r.status === 200) {
          sent++;
        } else if ([404, 410].includes(r.status) || r.body?.error?.status === 'UNREGISTERED') {
          await deleteToken(sa.project_id, accessToken, entry.deviceId);
        }
      } catch(e) { console.error('FCM error:', e.message); }
    }

    res.status(200).json({ sent, total: entries.length });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

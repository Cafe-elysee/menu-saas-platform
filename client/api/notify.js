/* ================================================
   Vercel Function — Notifications FCM SaaS
   Multi-restaurants via restaurantId
   Sans dépendances externes (Node.js built-in)
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
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database'
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hdr + '.' + pay);
  const sig = base64url(sign.sign(sa.private_key));
  const jwt = hdr + '.' + pay + '.' + sig;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res = await httpsRequest('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (!res.body.access_token) throw new Error('Token failed: ' + JSON.stringify(res.body));
  return res.body.access_token;
}

// ── Fetch FCM tokens depuis restaurants/{restaurantId}/devices/ ──
async function getFCMEntries(projectId, accessToken, restaurantId) {
  const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants/${restaurantId}/devices.json?access_token=${accessToken}`;
  const res = await httpsRequest(url, { method: 'GET' });
  if (res.status !== 200 || !res.body || typeof res.body !== 'object') return [];
  return Object.entries(res.body)
    .filter(([, v]) => v && v.token)
    .map(([deviceId, v]) => ({ deviceId, token: v.token, lang: v.lang || 'fr' }));
}

// ── Fetch nom du restaurant depuis restaurants/{restaurantId}/profile/name ──
async function getRestaurantName(projectId, accessToken, restaurantId) {
  try {
    const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants/${restaurantId}/profile/name.json?access_token=${accessToken}`;
    const res = await httpsRequest(url, { method: 'GET' });
    if (res.status === 200 && typeof res.body === 'string') return res.body;
  } catch(e) {}
  return restaurantId;
}

// ── Log dans restaurants/{restaurantId}/logs/notifications/ ──
async function logNotification(projectId, accessToken, restaurantId, logEntry) {
  try {
    const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants/${restaurantId}/logs/notifications/${logEntry.ts}.json?access_token=${accessToken}`;
    await httpsRequest(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(JSON.stringify(logEntry)) }
    }, JSON.stringify(logEntry));
  } catch(e) { console.warn('Log error:', e.message); }
}

// ── Supprime un token invalide ──
async function deleteToken(projectId, accessToken, restaurantId, deviceId) {
  try {
    const url = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants/${restaurantId}/devices/${deviceId}.json?access_token=${accessToken}`;
    await httpsRequest(url, { method: 'DELETE' });
    console.log('Token supprimé:', deviceId);
  } catch(e) { console.warn('Erreur suppression token:', e.message); }
}

const BELL  = { fr: n => `Appel : Table ${n}`, en: n => `Call : Table ${n}`, de: n => `Ruf : Tisch ${n}`, el: n => `Κλήση : Τραπέζι ${n}`, ar: n => `نداء : طاولة ${n}` };
const ORDER = { fr: { cmd:'Commande', takeaway:'À emporter', table:'Table' }, en: { cmd:'Order', takeaway:'Takeaway', table:'Table' }, de: { cmd:'Bestellung', takeaway:'Zum Mitnehmen', table:'Tisch' }, el: { cmd:'Παραγγελία', takeaway:'Σερβίρισμα', table:'Τραπέζι' }, ar: { cmd:'طلب', takeaway:'للخارج', table:'طاولة' } };
const MSG_LABEL = { fr:'Msg', en:'Msg', de:'Msg', el:'Μήν', ar:'رس' };

function buildBody(type, table, deviceLang, message) {
  if (type === 'message') return `${MSG_LABEL[deviceLang] || 'Msg'} : ${message}`;
  if (type === 'order') {
    const lbl = ORDER[deviceLang] || ORDER.fr;
    return `${lbl.cmd} · ${table === 'takeaway' ? lbl.takeaway : lbl.table + ' ' + table}`;
  }
  return (BELL[deviceLang] || BELL.fr)(table);
}

async function sendFCM(projectId, accessToken, entries, restaurantId, restaurantName, table, lang, type, message) {
  const ts = String(Date.now());
  const results = await Promise.all(entries.map(async entry => {
    const deviceLang = entry.lang || lang || 'fr';
    const body_text  = buildBody(type, table, deviceLang, message);
    const emoji      = type === 'order' ? '🧾' : '🔔';
    const title_text = `${emoji} ${restaurantName}`;
    const payload = JSON.stringify({
      message: {
        token: entry.token,
        notification: { title: title_text, body: body_text },
        data: {
          restaurantId,
          table: String(table),
          lang:  deviceLang,
          title: title_text,
          body:  body_text,
          type:  type || 'bell',
          ts
        },
        android: { priority: 'high', notification: { channel_id: 'commandes_serveur' } },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default', 'content-available': 1 } } },
        webpush: { headers: { 'TTL': '86400', 'Urgency': 'high' } }
      }
    });
    try {
      const res = await httpsRequest(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        { method: 'POST', headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
        payload
      );
      console.log('FCM result:', res.status, entry.deviceId);
      if (res.status === 200) return 1;
      if ([404, 410].includes(res.status) || res.body?.error?.status === 'UNREGISTERED') {
        await deleteToken(projectId, accessToken, restaurantId, entry.deviceId);
      }
    } catch(e) { console.error('FCM error:', e.message); }
    return 0;
  }));
  return { sent: results.reduce((a, b) => a + b, 0), total: entries.length };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { restaurantId, table, lang, type, message } = req.body || {};

    // Validation
    if (!restaurantId || typeof restaurantId !== 'string' || !/^[a-z0-9_-]+$/.test(restaurantId)) {
      res.status(400).json({ error: 'Missing or invalid restaurantId' }); return;
    }
    if (!table) { res.status(400).json({ error: 'Missing table' }); return; }

    console.log(`Notify: rid=${restaurantId} table=${table} type=${type}`);

    const sa           = JSON.parse(process.env.PLATFORM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT);
    const accessToken  = await getAccessToken(sa);
    const entries      = await getFCMEntries(sa.project_id, accessToken, restaurantId);
    const restaurantName = await getRestaurantName(sa.project_id, accessToken, restaurantId);

    console.log(`Tokens found: ${entries.length} for ${restaurantId}`);

    if (entries.length === 0) {
      res.status(200).json({ sent: 0, reason: 'no_tokens' }); return;
    }

    const result = await sendFCM(sa.project_id, accessToken, entries, restaurantId, restaurantName, table, lang, type || 'bell', message || null);

    // Log
    await logNotification(sa.project_id, accessToken, restaurantId, { ts: Date.now(), table, type: type || 'bell', sent: result.sent });

    console.log('Result:', JSON.stringify(result));
    res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

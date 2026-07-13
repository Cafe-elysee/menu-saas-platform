/* ============================================================
   Vercel Function — endpoint TEMPORAIRE, à supprimer après usage
   Purge config/adminPwd (mot de passe en clair) sur tous les restaurants.
   Protégé par CONTROL_APP_SECRET (même secret que les autres endpoints
   admin-only de ce projet). Écrit via le compte de service (bypass rules),
   même mécanisme que getMainDbToken()/fbAuthPatch dans notify-forfait.js.
============================================================ */

const crypto = require('crypto');
const https  = require('https');

const SAAS_DB = 'https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app';
const CONTROL_APP_SECRET = 'GnCtrl_LUM1zR1IVADMahfkKygna9fQXi4FqTmY';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const hdr = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const pay = base64url(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hdr + '.' + pay);
  const sig = base64url(sign.sign(sa.private_key));
  const jwt = hdr + '.' + pay + '.' + sig;
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } };
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data).access_token); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function fbRequest(path, method, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(SAAS_DB + path + '.json?access_token=' + token);
    const opts = { hostname: url.hostname, path: url.pathname + url.search, method };
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.query.secret !== CONTROL_APP_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  try {
    const raw = process.env.PLATFORM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return res.status(500).json({ ok: false, error: 'no service account configured' });
    const sa = JSON.parse(raw);
    const token = await getAccessToken(sa);

    const rids = await fbRequest('/restaurants', 'GET', token);
    if (!rids || typeof rids !== 'object') {
      return res.status(200).json({ ok: true, purged: [], note: 'restaurants vide ou introuvable' });
    }

    const purged = [];
    for (const rid of Object.keys(rids)) {
      const hadPwd = rids[rid] && rids[rid].config && rids[rid].config.adminPwd !== undefined;
      if (hadPwd) {
        await fbRequest('/restaurants/' + encodeURIComponent(rid) + '/config/adminPwd', 'DELETE', token);
        purged.push(rid);
      }
    }
    return res.status(200).json({ ok: true, purged, count: purged.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};

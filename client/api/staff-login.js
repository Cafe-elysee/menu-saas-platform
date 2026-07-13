/* ============================================================
   Vercel Function — connexion personnel (server-app)
   Vérifie le code PIN côté serveur (jamais côté navigateur) et mint un
   jeton personnalisé Firebase Auth {rid, role:'staff'} en cas de succès.
   Transition douce : si le restaurateur n'a pas encore défini de PIN
   (config/staffPinHash absent), le jeton est quand même délivré sans
   exiger de code — l'app existante continue de fonctionner à l'identique
   tant que cette protection n'est pas activée par le restaurateur.
============================================================ */

const crypto = require('crypto');
const { getServiceAccount, getAccessToken, mintCustomToken, fbRequest } = require('./_lib/firebaseAdmin');

const SAAS_DB = 'https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_ATTEMPTS  = 5;
const BLOCK_MS      = 30000;

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid, pin } = req.body || {};
  if (!rid) return res.status(400).json({ error: 'Missing rid' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const token = await getAccessToken(sa);

    const cfg = await fbRequest(SAAS_DB, '/restaurants/' + encodeURIComponent(rid) + '/config', 'GET', token);
    if (!cfg) return res.status(404).json({ error: 'Unknown rid' });
    if (cfg.active === false) return res.status(403).json({ error: 'Account suspended' });

    // Transition douce : pas de PIN configuré par ce restaurant → accès accordé sans code.
    if (!cfg.staffPinHash) {
      const customToken = mintCustomToken(sa, 'staff_' + rid, { rid, role: 'staff' });
      return res.status(200).json({ ok: true, customToken, pinRequired: false });
    }

    if (!pin) return res.status(401).json({ error: 'PIN required', pinRequired: true });

    const attemptsPath = '/restaurants/' + encodeURIComponent(rid) + '/config/loginAttemptsStaff';
    const attempts = await fbRequest(SAAS_DB, attemptsPath, 'GET', token) || {};
    const now = Date.now();
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return res.status(429).json({ error: 'Too many attempts', retryInMs: attempts.blockedUntil - now });
    }

    const hash = sha256Hex(pin);
    if (hash !== cfg.staffPinHash) {
      const count = (attempts.count || 0) + 1;
      const newState = count >= MAX_ATTEMPTS
        ? { count: 0, blockedUntil: now + BLOCK_MS }
        : { count };
      await fbRequest(SAAS_DB, attemptsPath, 'PUT', token, newState).catch(() => {});
      return res.status(401).json({ error: 'Invalid PIN', pinRequired: true, attemptsRemaining: Math.max(0, MAX_ATTEMPTS - count) });
    }

    await fbRequest(SAAS_DB, attemptsPath, 'DELETE', token).catch(() => {});
    const customToken = mintCustomToken(sa, 'staff_' + rid, { rid, role: 'staff' });
    return res.status(200).json({ ok: true, customToken, pinRequired: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

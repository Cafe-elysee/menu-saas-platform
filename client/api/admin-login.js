/* ============================================================
   Vercel Function — connexion admin (restaurateurs)
   Vérifie le mot de passe côté serveur (jamais côté navigateur) et
   mint un jeton personnalisé Firebase Auth {rid, role:'admin'} en cas
   de succès. Remplace la comparaison de hash faite jusqu'ici dans
   client/admin.html — ferme la possibilité de lire config/adminHash
   directement et de comparer en local.
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

  const { rid, password } = req.body || {};
  if (!rid || !password) return res.status(400).json({ error: 'Missing rid or password' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const token = await getAccessToken(sa);

    // Anti-bruteforce persistant (survit aux redémarrages de fonction, contrairement
    // au compteur en mémoire JS côté navigateur qu'il remplace).
    const attemptsPath = '/restaurants/' + encodeURIComponent(rid) + '/config/loginAttempts';
    const attempts = await fbRequest(SAAS_DB, attemptsPath, 'GET', token) || {};
    const now = Date.now();
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return res.status(429).json({ error: 'Too many attempts', retryInMs: attempts.blockedUntil - now });
    }

    const cfg = await fbRequest(SAAS_DB, '/restaurants/' + encodeURIComponent(rid) + '/config', 'GET', token);
    if (!cfg) return res.status(404).json({ error: 'Unknown rid' });
    if (cfg.active === false) return res.status(403).json({ error: 'Account suspended' });

    const expectedHash = cfg.adminHash;
    const hash = sha256Hex(password);

    if (!expectedHash || hash !== expectedHash) {
      const count = (attempts.count || 0) + 1;
      const newState = count >= MAX_ATTEMPTS
        ? { count: 0, blockedUntil: now + BLOCK_MS }
        : { count };
      await fbRequest(SAAS_DB, attemptsPath, 'PUT', token, newState).catch(() => {});
      return res.status(401).json({ error: 'Invalid password', attemptsRemaining: Math.max(0, MAX_ATTEMPTS - count) });
    }

    // Succès : réinitialiser le compteur, minter le jeton.
    await fbRequest(SAAS_DB, attemptsPath, 'DELETE', token).catch(() => {});
    const customToken = mintCustomToken(sa, 'admin_' + rid, { rid, role: 'admin' });
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

/* ============================================================
   Vercel Function — connexion control-app (identité "platform", Malek uniquement)
   Remplace l'ancien secret statique CONTROL_APP_SECRET (extractible d'un APK
   décompilé) par un vrai mot de passe, hashé côté serveur — jamais stocké en
   clair, jamais lisible depuis un client (platformAuth/* n'a aucune règle
   Firebase déclarée, donc refusé par défaut à tout accès client, authentifié
   ou non — seul ce service account, qui contourne les règles, peut y accéder).
   Anti-bruteforce persistant, même mécanique que admin-login.js/staff-login.js.

   Deux usages distincts (fusionnés dans ce même fichier pour rester sous la
   limite de 12 Serverless Functions du plan Hobby Vercel) :
   - {password} : connexion normale, mint {role:'platform'}.
   - {rid, sid} : impersonation admin pour le bouton "Admin ↗" de control-app —
     exige une session "platform" déjà valide (voir verifyIdToken plus bas),
     mint {rid, role:'admin'}. Remplace l'ancien secret réutilisable indéfiniment.
============================================================ */

const crypto = require('crypto');
const { getServiceAccount, getAccessToken, mintCustomToken, fbRequest, verifyIdToken } = require('./_lib/firebaseAdmin');

const SAAS_DB = 'https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_ATTEMPTS = 5;
const BLOCK_MS     = 30000;

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, rid, sid } = req.body || {};

  if (rid) {
    // Impersonation admin — exige une session "platform" déjà valide.
    const payload = await verifyIdToken(sid, 'menu-saas-platform');
    if (!payload || payload.role !== 'platform') return res.status(401).json({ error: 'Unauthorized' });
    const sa = getServiceAccount();
    if (!sa) return res.status(500).json({ error: 'Service account unavailable' });
    try {
      const customToken = mintCustomToken(sa, 'admin_' + rid, { rid, role: 'admin' });
      return res.status(200).json({ ok: true, customToken });
    } catch (e) {
      return res.status(500).json({ error: e.message || String(e) });
    }
  }

  if (!password) return res.status(400).json({ error: 'Missing password' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const token = await getAccessToken(sa);
    const auth = await fbRequest(SAAS_DB, '/platformAuth', 'GET', token);
    if (!auth || !auth.passwordHash) {
      return res.status(404).json({ error: 'Not configured', needsSetup: true });
    }

    const attempts = auth.loginAttempts || {};
    const now = Date.now();
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return res.status(429).json({ error: 'Too many attempts', retryInMs: attempts.blockedUntil - now });
    }

    const hash = sha256Hex(password);
    if (hash !== auth.passwordHash) {
      const count = (attempts.count || 0) + 1;
      const newState = count >= MAX_ATTEMPTS
        ? { count: 0, blockedUntil: now + BLOCK_MS }
        : { count };
      await fbRequest(SAAS_DB, '/platformAuth/loginAttempts', 'PUT', token, newState).catch(() => {});
      return res.status(401).json({ error: 'Invalid password', attemptsRemaining: Math.max(0, MAX_ATTEMPTS - newState.count) });
    }

    await fbRequest(SAAS_DB, '/platformAuth/loginAttempts', 'DELETE', token).catch(() => {});
    const customToken = mintCustomToken(sa, 'platform_malek', { role: 'platform' });
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

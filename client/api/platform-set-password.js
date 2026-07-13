/* ============================================================
   Vercel Function — définit ou change le mot de passe control-app
   (identité "platform", Malek uniquement).

   Deux modes, distingués par l'existence préalable du hash :
   - Aucun hash encore enregistré → création initiale (bootstrap), autorisée
     sans session (control-app n'a encore jamais pu se connecter). Ne fonctionne
     qu'UNE SEULE FOIS : dès qu'un hash existe, ce mode se ferme définitivement.
   - Un hash existe déjà → changement, exige un jeton "platform" déjà valide
     (même convention "sid" que verifySession() dans notify-forfait.js) et
     révoque les sessions déjà émises (comme saveAdminPassword() dans admin.html).
============================================================ */

const crypto = require('crypto');
const { getServiceAccount, getAccessToken, fbRequest, verifyIdToken, revokeRefreshTokens } = require('./_lib/firebaseAdmin');

const SAAS_DB = 'https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app';

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, sid } = req.body || {};
  if (!password || password.length < 4) return res.status(400).json({ error: 'Invalid password' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const token = await getAccessToken(sa);
    const existingHash = await fbRequest(SAAS_DB, '/platformAuth/passwordHash', 'GET', token);

    if (existingHash) {
      const payload = await verifyIdToken(sid, 'menu-saas-platform');
      if (!payload || payload.role !== 'platform') return res.status(401).json({ error: 'Unauthorized' });
    }

    const hash = sha256Hex(password);
    await fbRequest(SAAS_DB, '/platformAuth/passwordHash', 'PUT', token, hash);
    await fbRequest(SAAS_DB, '/platformAuth/loginAttempts', 'DELETE', token).catch(() => {});

    if (existingHash) {
      await revokeRefreshTokens(token, 'platform_malek').catch(() => {});
    }
    return res.status(200).json({ ok: true, wasSetup: !existingHash });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

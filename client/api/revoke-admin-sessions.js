/* ============================================================
   Vercel Function — révoque les sessions Firebase Auth d'un restaurant
   Appelé après un changement de mot de passe (saveAdminPassword() /
   premier login) — équivalent réel de l'ancien sessions.remove(),
   mais pour de vraies sessions Firebase Auth. Best-effort : un échec
   ne doit jamais bloquer le changement de mot de passe lui-même
   (déjà effectif dans tous les cas via config/adminHash).
============================================================ */

const { getServiceAccount, getAccessToken, revokeRefreshTokens } = require('./_lib/firebaseAdmin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid, role } = req.body || {};
  if (!rid && role !== 'platform') return res.status(400).json({ error: 'Missing rid' });
  const uid = role === 'platform' ? 'platform_malek' : (role === 'staff' ? 'staff_' : 'admin_') + rid;

  const sa = getServiceAccount();
  if (!sa) return res.status(200).json({ ok: false, note: 'service account unavailable' });

  try {
    const token = await getAccessToken(sa);
    await revokeRefreshTokens(token, uid);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || String(e) });
  }
};

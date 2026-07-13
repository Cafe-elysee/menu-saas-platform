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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid } = req.body || {};
  if (!rid) return res.status(400).json({ error: 'Missing rid' });

  const sa = getServiceAccount();
  if (!sa) return res.status(200).json({ ok: false, note: 'service account unavailable' });

  try {
    const token = await getAccessToken(sa);
    await revokeRefreshTokens(token, 'admin_' + rid);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || String(e) });
  }
};

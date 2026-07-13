/* ============================================================
   Vercel Function — identité control-app (Malek uniquement)
   Protégé par CONTROL_APP_SECRET (même secret déjà partagé avec
   notify-forfait.js/notify-payment.js). Deux usages :
   - sans "rid" : mint un jeton {role:'platform'} pour control-app
     lui-même (connexion silencieuse au démarrage).
   - avec "rid" : mint un jeton {rid, role:'admin'} pour CE restaurant,
     remplace l'ancien mécanisme config/ctrlBypass (fenêtre de course
     de 15s) par un vrai jeton signé, à usage unique via
     signInWithCustomToken() côté admin.html.
============================================================ */

const { getServiceAccount, mintCustomToken } = require('./_lib/firebaseAdmin');

const CONTROL_APP_SECRET = 'GnCtrl_LUM1zR1IVADMahfkKygna9fQXi4FqTmY';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { secret, rid } = req.body || {};
  if (secret !== CONTROL_APP_SECRET) return res.status(401).json({ error: 'Invalid secret' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const customToken = rid
      ? mintCustomToken(sa, 'admin_' + rid, { rid, role: 'admin' })
      : mintCustomToken(sa, 'platform_malek', { role: 'platform' });
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

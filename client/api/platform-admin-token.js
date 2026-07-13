/* ============================================================
   Vercel Function — mint un jeton {rid, role:'admin'} pour le bouton
   "Admin ↗" de control-app (ouvrir l'admin d'un restaurant depuis la
   liste des clients, sans mot de passe restaurateur).

   Remplace l'ancien secret statique réutilisable indéfiniment : exige
   désormais une session "platform" déjà valide (jeton vérifié côté serveur,
   même convention "sid" que verifySession() dans notify-forfait.js) —
   connaître une chaîne fixe ne suffit plus, il faut une session réelle,
   révocable, obtenue en s'étant authentifié avec le mot de passe.
============================================================ */

const { getServiceAccount, mintCustomToken, verifyIdToken } = require('./_lib/firebaseAdmin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid, sid } = req.body || {};
  if (!rid) return res.status(400).json({ error: 'Missing rid' });

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
};

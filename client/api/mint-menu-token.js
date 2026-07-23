/* ============================================================
   Vercel Function — jeton d'accès au menu public (client/index.html)
   Mint un jeton personnalisé Firebase Auth {rid, role:'menu-client'} scopé
   au restaurant réellement visité. Remplace l'ancienne connexion anonyme
   (signInAnonymously(), qui ne portait aucun claim rid) — sans ce claim,
   les règles Firebase ne pouvaient pas distinguer "commande passée sur CE
   restaurant" de "commande passée sur n'importe quel autre restaurant" et
   toléraient donc l'écriture cross-tenant (voir audit du 2026-07-22/23).
   Endpoint public par nature (aucun secret à vérifier, comme le menu
   lui-même) — la protection réelle vient des règles Firebase qui exigent
   désormais auth.token.rid === $rid pour écrire une commande/appel.
============================================================ */

const { getServiceAccount, getAccessToken, mintCustomToken, fbRequest } = require('./_lib/firebaseAdmin');

const SAAS_DB = 'https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app';
const RID_RE  = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid } = req.body || {};
  if (!rid || !RID_RE.test(rid)) return res.status(400).json({ error: 'Invalid rid' });

  const sa = getServiceAccount();
  if (!sa) return res.status(500).json({ error: 'Service account unavailable' });

  try {
    const token = await getAccessToken(sa);

    // Un restaurant inexistant ne reçoit jamais de jeton — évite de minter un accès
    // pour un rid qui ne correspond à rien de réel dans la base.
    const cfg = await fbRequest(SAAS_DB, '/restaurants/' + encodeURIComponent(rid) + '/config', 'GET', token);
    if (!cfg) return res.status(404).json({ error: 'Unknown rid' });

    const customToken = mintCustomToken(sa, 'menu_' + rid, { rid, role: 'menu-client' });
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

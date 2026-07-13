/* ============================================================
   Vercel Function — proxy d'écriture ET de lecture vers CONTROL_DB
   (menu-pro-control/commandes), réservé à l'identité "platform" (Malek/control-app).

   Remplace les écritures anonymes directes que faisait control-app jusqu'ici sur ce
   second projet Firebase — la connexion anonyme y était partagée avec n'importe quel
   visiteur de demo-page (même identité, mêmes droits), donc incapable de distinguer
   Malek d'un tiers. Le secret RTDB legacy (FIREBASE_CONTROL_SECRET) ne quitte jamais
   ce serveur — seul un jeton "platform" déjà valide (voir platform-login.js) permet
   d'en déclencher l'usage.

   op:'get' (lecture, ajouté audit sécurité 2026-07-13) : remplace l'ancienne règle
   Firebase ".read":true sur /commandes (fuite de données personnelles — nom/email/
   téléphone de tous les prospects lisibles par quiconque connaît l'URL du projet,
   visible en clair dans le bundle JS public de demo-page). control-app n'a plus de
   lecture directe sur ce projet Firebase — il interroge cet endpoint par sondage
   (voir _pollCommandes dans control-app/index.html). Fusionné dans ce fichier plutôt
   que créé à part : le plan Vercel Hobby limite à 12 fonctions serverless, déjà atteint.
============================================================ */

const https = require('https');
const { verifyIdToken } = require('./_lib/firebaseAdmin');

const CONTROL_DB = 'https://menu-pro-control-default-rtdb.europe-west1.firebasedatabase.app';

function controlRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const secret = process.env.FIREBASE_CONTROL_SECRET;
    const url = new URL(CONTROL_DB + path + '.json?auth=' + encodeURIComponent(secret));
    const bodyStr = body !== undefined ? JSON.stringify(body) : null;
    const opts = { hostname: url.hostname, path: url.pathname + url.search, method, headers: {} };
    if (bodyStr) {
      opts.headers['Content-Type']   = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sid, path, op, data } = req.body || {};
  // Restreint aux commandes uniquement — même authentifié, cet endpoint ne doit
  // jamais pouvoir toucher un autre sous-arbre de ce projet.
  if (!path || typeof path !== 'string' || (path !== '/commandes' && !path.startsWith('/commandes/'))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const VALID_OPS = ['set', 'update', 'remove', 'push', 'get'];
  if (!VALID_OPS.includes(op)) return res.status(400).json({ error: 'Invalid op' });

  const payload = await verifyIdToken(sid, 'menu-saas-platform');
  if (!payload || payload.role !== 'platform') return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.FIREBASE_CONTROL_SECRET) return res.status(500).json({ error: 'Control secret unavailable' });

  try {
    let result;
    if (op === 'get') {
      result = await controlRequest(path, 'GET');
      return res.status(200).json({ ok: true, data: result });
    } else if (op === 'remove') {
      result = await controlRequest(path, 'DELETE');
    } else if (op === 'push') {
      result = await controlRequest(path, 'POST', data);
    } else {
      result = await controlRequest(path, op === 'set' ? 'PUT' : 'PATCH', data === undefined ? null : data);
    }
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
};

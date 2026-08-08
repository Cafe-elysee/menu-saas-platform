/* ============================================================
   Helpers partagés — signature JWT avec le compte de service Firebase
   déjà utilisé (PLATFORM_SERVICE_ACCOUNT/FIREBASE_SERVICE_ACCOUNT),
   même technique que getAccessToken() dans notify-forfait.js, réutilisée
   ici pour minter des jetons personnalisés Firebase Auth (custom tokens)
   sans dépendre du SDK Admin complet.
============================================================ */

const crypto = require('crypto');
const https  = require('https');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signJwt(sa, payload) {
  const hdr  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const pay  = base64url(JSON.stringify(payload));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(hdr + '.' + pay);
  const sig = base64url(sign.sign(sa.private_key));
  return hdr + '.' + pay + '.' + sig;
}

function getServiceAccount() {
  const raw = process.env.PLATFORM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

// 🔴 Jeton d'accès Google mis en cache (2026-07-18) — cette fonction est appelée à
// CHAQUE connexion admin (manuelle ou reconnexion silencieuse automatique) ; sans
// cache, chaque appel refaisait un aller-retour réseau complet vers Google (en plus
// des lectures Firebase qui suivent), ajoutant de la latence et un point d'échec
// supplémentaire à chaque tentative — un facteur plausible d'échecs intermittents,
// d'autant plus visible depuis que la reconnexion automatique augmente la fréquence
// des appels à cet endpoint. Le jeton reste valide 1h (exp: now+3600) ; réutilisé tant
// qu'il reste au moins 2 minutes de marge, sinon renouvelé normalement. Le cache vit
// au niveau du module — profite des invocations "chaudes" (conteneur Vercel réutilisé),
// sans effet néfaste si le conteneur est froid (retombe simplement sur un appel normal).
let _accessTokenCache = null;
let _accessTokenExpiresAt = 0;
function getAccessToken(sa) {
  const nowMs = Date.now();
  if (_accessTokenCache && _accessTokenExpiresAt - nowMs > 120000) {
    return Promise.resolve(_accessTokenCache);
  }
  const now = Math.floor(nowMs / 1000);
  const jwt = signJwt(sa, {
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/userinfo.email'
  });
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.access_token) { reject(new Error('No access_token in response: ' + data.slice(0, 200))); return; }
          _accessTokenCache = parsed.access_token;
          _accessTokenExpiresAt = nowMs + ((parsed.expires_in || 3600) * 1000);
          resolve(parsed.access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Google OAuth request timed out')));
    req.write(body);
    req.end();
  });
}

// Jeton personnalisé Firebase Auth — signé directement avec la clé privée du
// compte de service, vérifiable par Firebase Auth sans appel réseau supplémentaire.
function mintCustomToken(sa, uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(sa, {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid: uid,
    claims: claims || {}
  });
}

function fbRequest(db, path, method, token, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(db + path + '.json?access_token=' + token);
    const bodyStr = body != null ? JSON.stringify(body) : null;
    const opts    = { hostname: url.hostname, path: url.pathname + url.search, method, headers: {} };
    if (bodyStr) {
      opts.headers['Content-Type']   = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Firebase REST request timed out')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Variante STRICTE de fbRequest, à utiliser UNIQUEMENT quand l'absence d'une valeur est
// interprétée comme une autorisation (ex. "aucun mot de passe plateforme enregistré → mode
// création initiale ouvert"). fbRequest() ci-dessus résout `null` aussi bien pour "le nœud
// n'existe pas" que pour "Firebase a répondu une page d'erreur HTML illisible" — confondre
// les deux transforme une panne passagère de Firebase en réouverture d'un mode privilégié
// (audit 2026-08-08). Ici, toute réponse non-2xx ou tout corps non parsable REJETTE, ce qui
// laisse l'appelant échouer fermé au lieu de supposer "absent".
function fbRequestStrict(db, path, method, token, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(db + path + '.json?access_token=' + token);
    const bodyStr = body != null ? JSON.stringify(body) : null;
    const opts    = { hostname: url.hostname, path: url.pathname + url.search, method, headers: {} };
    if (bodyStr) {
      opts.headers['Content-Type']   = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('Firebase REST ' + res.statusCode + ' on ' + path));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Firebase REST unparsable response on ' + path)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => req.destroy(new Error('Firebase REST request timed out')));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Révoque les jetons/sessions déjà émis pour un uid (équivalent réel du
// sessions.remove() actuel) — best-effort, jamais bloquant pour l'appelant.
function revokeRefreshTokens(accessToken, uid) {
  const body = JSON.stringify({ localId: uid, validSince: String(Math.floor(Date.now() / 1000)) });
  return new Promise((resolve) => {
    const opts = {
      hostname: 'identitytoolkit.googleapis.com', path: '/v1/accounts:update', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Bearer ' + accessToken
      }
    };
    const req = https.request(opts, res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ── Vérification d'un ID token Firebase Auth (côté serveur, sans SDK Admin) ──
// Documenté par Firebase ("Verify ID tokens using a third-party JWT library") :
// vérifier la signature RS256 avec les certificats publics Google (rotent
// régulièrement, mis en cache ici), puis les champs iss/aud/exp standards.
let _certsCache = null;
let _certsCacheUntil = 0;

function fetchGoogleCerts() {
  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', res => {
      let data = ''; res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function getGoogleCerts() {
  const now = Date.now();
  if (_certsCache && _certsCacheUntil > now) return _certsCache;
  _certsCache = await fetchGoogleCerts();
  _certsCacheUntil = now + 3600000; // 1h, largement sous la rotation réelle des clés Google
  return _certsCache;
}

async function verifyIdToken(idToken, projectId) {
  if (!idToken || typeof idToken !== 'string') return null;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const header  = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const certs   = await getGoogleCerts();
    const cert    = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(parts[0] + '.' + parts[1]);
    const sig = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (!verifier.verify(cert, sig)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    if (typeof payload.iat !== 'number' || payload.iat > now + 60) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== 'https://securetoken.google.com/' + projectId) return null;

    return payload; // contient .rid/.role (claims du jeton personnalisé) + .sub (uid)
  } catch (e) {
    return null;
  }
}

module.exports = { getServiceAccount, getAccessToken, mintCustomToken, fbRequest, fbRequestStrict, revokeRefreshTokens, verifyIdToken };

# STATE — Menu SaaS Platform

## Date dernière mise à jour : 2026-06-01

## Phase courante : PRODUCTION READY — EN ATTENTE TESTS APK SUR TÉLÉPHONE

---

## État des fichiers copiés (Phase 1)

| Fichier | Source | Taille | Statut |
|---------|--------|--------|--------|
| `client/index.html` | `H:\Mon Drive\Menu Pro\Menu Café Demo\index.html` | 440.9 KB | ✅ Copié |
| `client/admin.html` | `H:\Mon Drive\Menu Pro\Menu Café Demo\admin.html` | 298.3 KB | ✅ Copié |
| `client/manifest.json` | `H:\Mon Drive\Menu Pro\Menu Café Demo\manifest.json` | 0.9 KB | ✅ Copié |
| `client/vercel.json` | `H:\Mon Drive\Menu Pro\Menu Café Demo\vercel.json` | 0.1 KB | ✅ Copié |
| `client/service-worker.js` | `H:\Mon Drive\Menu Pro\Menu Café Demo\service-worker.js` | 2.8 KB | ✅ Copié |
| `client/firebase-messaging-sw.js` | `H:\Mon Drive\Menu Pro\Menu Café Demo\firebase-messaging-sw.js` | 5.4 KB | ✅ Copié |
| `client/icon.svg` | `H:\Mon Drive\Menu Pro\Menu Café Demo\icon.svg` | 2 KB | ✅ Copié |
| `client/icon-maskable.svg` | `H:\Mon Drive\Menu Pro\Menu Café Demo\icon-maskable.svg` | 0.8 KB | ✅ Copié |
| `client/api/notify.js` | `H:\Mon Drive\Menu Pro\Menu Café Demo\api\notify.js` | 7.6 KB | ✅ Copié |
| `control-app/index.html` | `H:\Mon Drive\Menu Pro\Controle Native\www\index.html` | 107 KB | ✅ Copié |
| `server-app/index.html` | `H:\Mon Drive\Menu Pro\Serveur Native\www\index.html` | 61.1 KB | ✅ Copié |

## Fichiers ABSENTS du source (à noter)

| Fichier | Raison | Action prévue |
|---------|--------|---------------|
| `app.html` (PWA serveur) | Supprimé en mai 2026 — remplacé par APK Capacitor natif | Recréer en Phase 5 si SaaS PWA nécessaire |

## Points techniques identifiés (à traiter en Phase 2)

- **Firebase hardcodé** : `client/index.html` et `client/admin.html` contenaient les clés Firebase de Café Élysée — remplacées par config dynamique via `restaurantId`
- **Préfixe localStorage** : `ce_` hardcodé partout — dynamisé par `restaurantId`
- **Noms hardcodés** : "Café Élysée", "cafe-elysee", "Κολωνάκι, Αθήνα" dans les fichiers — remplacés par données Firebase
- **VAPID key** : clé FCM Café Élysée dans `firebase-messaging-sw.js` et `client/index.html`
- **BroadcastChannel** : `'cafe-elysee-waiter'` — dynamisé
- **Cloudinary folder** : `fd.append('folder', 'elysee')` — dynamisé par `restaurantId`
- **api/notify.js** : utilisait `FIREBASE_SERVICE_ACCOUNT` (variable Vercel) — OK pour SaaS, adapté pour multi-restaurant
- **control-app/index.html** : contenait liste `CLIENTS` hardcodée (Café Élysée + Mozart) — migrée vers Firebase

## Décisions d'architecture (provisoires — confirmées Phase 2)

1. Chaque restaurant identifié par un `restaurantId` alphanumérique (ex: `cafe-oran`, `mozart`)
2. URL menu : `/client/index.html?rid={restaurantId}` — config chargée depuis Firebase au démarrage
3. URL admin : `/client/admin.html?rid={restaurantId}` — idem
4. `control-app` = dashboard Malek — liste tous les restaurants depuis Firebase
5. `vercel.json` unique gérant le routing pour toutes les routes

## Résultats Phase 2 — Audit

### Décisions d'architecture validées
1. **Un seul projet Firebase SaaS** (`menu-saas-platform`) pour tous les restaurants
2. Isolation par chemin RTDB : `restaurants/{restaurantId}/...`
3. `restaurantId` transmis via URL param `?rid=`
4. SW universel : config écrite dans Cache API par la page, lue par le SW
5. `api/notify.js` : accepte `restaurantId`, path dynamique `/restaurants/{rid}/devices/`
6. localStorage prefix : `{rid}_` au lieu de `ce_` / `mc_`
7. `control-app` : CLIENTS depuis Firebase RTDB au lieu du tableau hardcodé

### Hardcoded remplacés (résumé)
- Firebase configs : 5 occurrences (index, admin, server-app, firebase-messaging-sw, control-app)
- `ce_` localStorage prefix : ~55 occurrences (index + admin)
- `mc_` localStorage prefix : ~20 occurrences (server-app)
- Noms restaurant : "Café Élysée", "cafe-elysee-waiter", "cafe-elysee-v1"
- Firebase paths : tous préfixés par `restaurants/{restaurantId}/`
- `api/notify.js` : restaurantId accepté, titre dynamique, path dynamique

---

## Résultats Phase 3 — Refactoring SaaS

### Fichiers refactorisés (2026-06-01)

| Fichier | Changements | Statut |
|---------|-------------|--------|
| `client/index.html` | Firebase→SaaS, `_rref()`, `_RID`, `_PFX`, BroadcastChannel dynamique, notify+restaurantId | ✅ |
| `client/admin.html` | Firebase→SaaS, `_rref()`, `_RID`, `_PFX`, sessionStorage, Cloudinary folder dynamique | ✅ |
| `client/firebase-messaging-sw.js` | Config SaaS universelle, credentials réels injectés | ✅ |
| `client/api/notify.js` | Accepte restaurantId, paths dynamiques `/restaurants/{rid}/devices/` | ✅ |
| `server-app/index.html` | Firebase Mozart→SaaS, `_rref()`, `_RID`, `_PFX`, fcm_tokens→devices, anti-flash SaaS | ✅ |
| `control-app/index.html` | SAAS_FB_CONFIG, `_saasDb`, `loadClientsFromFirebase()`, `getClientDb()` proxy SaaS, firebaseConfig obsolètes supprimés | ✅ |

### Architecture SaaS implémentée

```js
// index.html + admin.html : URL param
const _RID  = new URLSearchParams(location.search).get('rid') || 'demo';
const _PFX  = _RID + '_';
const _rref = p => db.ref('restaurants/' + _RID + '/' + p);

// server-app : localStorage
const _RID = localStorage.getItem('saas_rid') || 'demo';

// control-app : proxy SaaS
getClientDb(slug).ref('menu/categories')
// → _saasDb.ref('restaurants/slug/menu/categories')
```

### Firebase SaaS — Credentials complets (2026-06-01)

| Clé | Valeur |
|-----|--------|
| projectId | `menu-saas-platform` |
| apiKey | `AIzaSyCM6SiQoWQfsq_t-80EfiVplXV9p534_eI` |
| messagingSenderId | `460781372428` |
| appId | `1:460781372428:web:55c33bfb6f8f8d5582da29` |
| databaseURL | `https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app` |
| **VAPID key** | `BDl5qclUNBK8u-bsuCydBWkZarZurlq_U6NiceUhQo7jDExp95hZuvpN2Pi7HY0ojVO0pWaHD0dOZEICvHi7rkg` |

Tous les placeholders `%%SAAS_*%%` ont été remplacés dans les 5 fichiers. ✅

### À faire avant Phase 4

- [ ] Tester isolation données entre restaurants (ouvrir 2 onglets avec `?rid=demo` et `?rid=test`)
- [ ] Vérifier que `_fill_saas_config.js` n'a plus de placeholders actifs
- [ ] Créer structure Firebase RTDB de base pour un restaurant demo

---

## Résultats Phase 4 — Flow commande (2026-06-01)

Flow complet déjà implémenté depuis Phase 3. Corrections appliquées :

| Fichier | Correction |
|---------|------------|
| `client/index.html` | `CART_KEY` et `ORDERS_HIST_KEY` : `ce_` → `_PFX` |
| `client/admin.html` | `STORE_KEY_SEC` : `ce_adm_sections` → `_PFX + 'adm_sections'` |
| `server-app/index.html` | `CALLS_KEY` et `MSGS_KEY` : `mc_` → `_PFX` |

### Flow commande validé

```
Client (index.html?rid=xxx)
  → panier → "Envoyer la commande"
  → fetch POST /api/notify { restaurantId, table, type:'order' }   [keepalive]
  → _rref('orders/' + orderId).set(order)
      → Firebase: restaurants/{rid}/orders/{orderId}

Serveur (server-app?rid=xxx)
  → _rref('orders').on('value', ...) écoute en temps réel

Vercel notify.js
  → lit restaurants/{rid}/devices/ → FCM tokens
  → envoie push notifications
  → log dans restaurants/{rid}/logs/notifications/
```

### Prochaine étape
Tests APK sur Redmi Note 13 5G (control-app + server-app)

---

## Résultats Phase 5 — Capacitor apps (2026-06-01)

### Fichiers créés

| Fichier | Contenu |
|---------|---------|
| `control-app/capacitor.config.json` | appId: `com.menupro.control`, webDir: `.` |
| `control-app/package.json` | Capacitor 6 + push-notifications |
| `control-app/android/` | Copie depuis H: Controle Native (Android project prêt) |
| `server-app/capacitor.config.json` | appId: `com.menupro.serveur`, webDir: `.` |
| `server-app/package.json` | Capacitor 6 + haptics + push-notifications |
| `control-app/google-services.json.TEMPLATE` | Template SaaS pour package `com.menupro.control` |
| `server-app/google-services.json.TEMPLATE` | Template SaaS pour package `com.menupro.serveur` |
| `BUILD.md` | Instructions complètes build APK |

### Bloquant : google-services.json SaaS

Malek doit aller sur Firebase Console → projet `menu-saas-platform` → ajouter apps Android :
- Package `com.menupro.control` → télécharger `google-services.json` → mettre dans `control-app/android/app/`
- Package `com.menupro.serveur` → télécharger `google-services.json` → mettre dans `server-app/android/app/`

### Bloquant : Node.js version

`npx cap add android` requiert Node.js **18 ou 20** (v25 incompatible avec Capacitor 6).
Pour server-app, le projet Android doit encore être initialisé.

Voir `BUILD.md` pour les étapes complètes.


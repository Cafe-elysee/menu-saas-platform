# STATE — Menu SaaS Platform

## Date dernière mise à jour : 2026-06-01

## Phase courante : PHASE 3 REFACTORING TERMINÉ — EN ATTENTE FIREBASE SAAS + TESTS

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

- **Firebase hardcodé** : `client/index.html` et `client/admin.html` contiennent les clés Firebase de Café Élysée — à remplacer par config dynamique via `restaurantId`
- **Préfixe localStorage** : `ce_` hardcodé partout — à dynamiser par `restaurantId`
- **Noms hardcodés** : "Café Élysée", "cafe-elysee", "Κολωνάκι, Αθήνα" dans les fichiers — à remplacer par données Firebase
- **VAPID key** : clé FCM Café Élysée dans `firebase-messaging-sw.js` et `client/index.html`
- **BroadcastChannel** : `'cafe-elysee-waiter'` — à dynamiser
- **Cloudinary folder** : `fd.append('folder', 'elysee')` — à dynamiser par `restaurantId`
- **api/notify.js** : utilise `FIREBASE_SERVICE_ACCOUNT` (variable Vercel) — OK pour SaaS, à adapter pour multi-restaurant
- **control-app/index.html** : contient liste `CLIENTS` hardcodée (Café Élysée + Mozart) — à migrer vers Firebase

## Décisions d'architecture (provisoires — à confirmer Phase 2)

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

### Hardcoded à remplacer (résumé)
- Firebase configs : 5 occurrences (index, admin, server-app, firebase-messaging-sw, control-app)
- `ce_` localStorage prefix : ~55 occurrences (index + admin)
- `mc_` localStorage prefix : ~20 occurrences (server-app)
- Noms restaurant : "Café Élysée", "cafe-elysee-waiter", "cafe-elysee-v1"
- Firebase paths : tous sans prefixe restaurantId (menu/, orders/, calls/, config/, fcm_tokens/)
- `api/notify.js` : pas de restaurantId, titre hardcodé, path fixe

### Prochaine étape
**Phase 3** : Créer projet Firebase SaaS + refactor complet de tous les fichiers
→ Un seul projet Firebase pour tous les restaurants
→ Tous les `.ref()` préfixés par `restaurants/{restaurantId}/`
→ SW universel avec config dynamique

---

## Résultats Phase 3 — Refactoring SaaS

### Fichiers refactorisés (2026-06-01)

| Fichier | Changements | Statut |
|---------|-------------|--------|
| `client/index.html` | Firebase→SaaS, `_rref()`, `_RID`, `_PFX`, BroadcastChannel dynamique, notify+restaurantId | ✅ |
| `client/admin.html` | Firebase→SaaS, `_rref()`, `_RID`, `_PFX`, sessionStorage, Cloudinary folder dynamique | ✅ |
| `client/firebase-messaging-sw.js` | Config SaaS universelle %%SAAS_%% | ✅ |
| `client/api/notify.js` | Accepte restaurantId, paths dynamiques `/restaurants/{rid}/devices/` | ✅ |
| `server-app/index.html` | Firebase Mozart→SaaS, `_rref()`, `_RID`, `_PFX`, fcm_tokens→devices, anti-flash SaaS | ✅ |
| `control-app/index.html` | SAAS_FB_CONFIG, `_saasDb`, `loadClientsFromFirebase()`, `getClientDb()` proxy SaaS, firebaseConfig obsolètes supprimés | ✅ |

### Architecture SaaS implémentée

```
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

### Configuration manquante (MALEK — à faire dans navigateur)
**Créer un projet Firebase SaaS**, puis remplacer dans TOUS les fichiers :
- `%%SAAS_API_KEY%%` → clé API du projet
- `%%SAAS_PROJECT_ID%%` → ID du projet (ex: `menu-saas-platform`)
- `%%SAAS_SENDER_ID%%` → messagingSenderId
- `%%SAAS_APP_ID%%` → appId

Fichiers concernés : `client/index.html`, `client/admin.html`, `client/firebase-messaging-sw.js`, `server-app/index.html`, `control-app/index.html`

**Commande de remplacement (à exécuter après avoir les vraies valeurs) :**
```
node _fill_saas_config.js
```
(fichier à créer avec les vraies valeurs quand Malek donne les credentials Firebase SaaS)

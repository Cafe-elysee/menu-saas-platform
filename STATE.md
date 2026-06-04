# STATE — Menu SaaS Platform
## Dernière mise à jour : 2026-06-04

---

## Phase courante : EN PRODUCTION — stable ✅

---

## 🔒 ÉTAT FONCTIONNEL (commit de référence)

**Commit** : `01f24f5` (2026-06-04)
**Branche** : `main`

Cet état est validé et fonctionnel. En cas de problème futur, on peut y revenir.
Pour mettre à jour l'état fonctionnel : demander à Claude de changer ce commit.

**Note build** : `npx cap sync` ne copie JAMAIS `index.html` automatiquement → toujours copier manuellement `server-app/index.html` vers `server-app/android/app/src/main/assets/public/index.html` avant chaque build APK.

---

## Déploiements actifs

| Service | URL / Info |
|---------|------------|
| Vercel SaaS | `https://menu-saas-platform.vercel.app` (compte malek24593636@gmail.com) |
| Vercel Démo | `https://menu-pro-demo.vercel.app` (compte mozartcafe.contact@gmail.com) |
| Firebase | projet `menu-saas-platform` (compte mozartcafe.contact@gmail.com) |
| GitHub SaaS | `github.com/Cafe-elysee/menu-saas-platform` |
| GitHub Démo | `github.com/mozart-cafe-menu/menu-pro-demo` |
| Restaurant demo | `?rid=demo` — mot de passe : `MenuPro2026` |

---

## Structure du projet (G:\Mon Drive\menu-saas-platform\)

```
menu-saas-platform/
├── client/
│   ├── index.html          ← menu client
│   ├── admin.html          ← panel admin restaurant
│   ├── service-worker.js
│   ├── firebase-messaging-sw.js
│   ├── qr-generator.html
│   ├── manifest.json
│   └── api/
│       ├── notify.js           ← FCM sonnette + commandes + messages → server-app
│       ├── notify-control.js   ← FCM devis → control-app
│       └── diag.js             ← diagnostic FCM (secret requis)
├── control-app/            ← APK Control (com.menupro.control.saas)
├── server-app/             ← APK Serveur (com.menupro.serveur)
├── demo-page/              ← page de vente (repo: mozart-cafe-menu/menu-pro-demo)
│   └── api/notify-devis.js ← délègue à notify-control
├── firebase-rules.json     ← règles Firebase RTDB v3 (⚠ déjà appliquées)
├── BUILD.md
├── STATE.md
└── MEMORY.md
```

---

## APKs

| Fichier | Package | Taille | Rebuilt |
|---------|---------|--------|---------|
| `MenuProControl-SaaS-v1.0.apk` | `com.menupro.control.saas` | 4.3 MB | 2026-06-04 (labels Nom/ID au-dessus + boutons Mettre à jour) ✅ |
| `MenuProServeur-SaaS-v1.0.apk` | `com.menupro.serveur` | 6.6 MB | 2026-06-04 (scroll conservé au changement statut commande) ✅ |

---

## Configuration Android — NE JAMAIS MODIFIER

| App | applicationId | namespace | capacitor appId |
|-----|---------------|-----------|-----------------|
| control-app | `com.menupro.control.saas` | `com.menupro.control` | `com.menupro.control.saas` |
| server-app | `com.menupro.serveur` | `com.monresto.serveur` | `com.menupro.serveur` |

**RÈGLE ABSOLUE** : namespace = package dans MainActivity.java.

**google-services.json** — projet `menu-saas-platform` :
- `com.menupro.control.saas` → `1:460781372428:android:739bbbacdecea46582da29`
- `com.menupro.serveur` → `1:460781372428:android:3f98b007731acf6f82da29`

---

## Système de notifications FCM — Architecture validée ✅

### Sonnette + Commandes → Server-app
```
Menu client (?rid=xxx)
  → POST /api/notify { restaurantId, table, type, lang }
  → Firebase restaurants/{rid}/devices/{deviceId}
  → FCM canal mp_srv_v3 → APK Serveur
```

### Messages admin → Server-app
```
Admin panel
  → POST /api/notify { type:'message', message, ... }
  → Firebase restaurants/{rid}/messages/{ts} (sauvegarde TOUJOURS)
  → FCM si appareils connectés (optionnel)
  → Server-app récupère via startMessagesListener() au démarrage
```

### Devis → Control-app
```
Page démo → POST /api/notify-devis
  → POST menu-saas-platform.vercel.app/api/notify-control
  → Firebase control/fcm_tokens/{deviceId}
  → FCM canal devis_control → APK Control
```

---

## Fonctionnalités — État complet

### Control App (`com.menupro.control.saas`)
- Clients chargés depuis Firebase en temps réel (fingerprint check)
- 5 langues par défaut (fr/en/el/de/ar) à la création
- Rétention 1 semaine par défaut sauvée dans Firebase
- Modals (suppression + nouveau client) hors du tabs-track → cliquables en toutes circonstances
- Bouton confirmer suppression toujours actif quelle que soit l'action précédente ✅
- Toggles/features correctement rechargés après création ou suppression de client ✅
- Un seul listener Firebase `restaurants` (pas de duplication après création) ✅
- Notifications : statut local (ctrl_fcm_last_reg), sans lecture Firebase bloquée
- Animations nav badge : bounce icône + pop badge + glow doré
- **Labels Nom et ID au-dessus des champs** (pas sur le côté) ✅
- **Boutons "Mettre à jour"** pour Nom et ID — même style que le bouton mot de passe ✅

### Server App (`com.menupro.serveur`)
- Barre d'alerte appel supprimée — animations nav badge à la place
- Onglet initial intelligent au démarrage (features + éléments en attente)
- Messages admin persistants (Firebase) + cleanup 30j
- 4 onglets : Appels / Commandes / Messages / Réglages
- Push notifications : canal mp_srv_v3, PRIORITY_MAX ✅
- Nom du restaurant affiché dès le démarrage (plus de flash "Menu Pro") ✅
- Sélecteur de langue : menu déroulant compact ✅
- Appels persistants dans Firebase ✅
- **Scroll conservé lors du changement de statut d'une commande** ✅

### Menu client (`index.html`)
- Commandes : `table` + `ts` (number) conformes Firebase rules
- Nom du restaurant mis en cache localStorage ✅
- Compteur catégories traduit en 5 langues ✅

### Admin panel (`admin.html`)
- 2 onglets : Affichage Menu / Commandes & Appels ✅
- Onglet 2 masqué si fonctionnalité désactivée depuis control-app ✅
- **Section Statistiques** : carte unique réductible/développable (chevron + état mémorisé) ✅
- **Graphiques dans la carte Statistiques** (pas de cartes individuelles) ✅
- Graphiques SVG animés top 10 : commandes/appels par table + produits vendus ✅
- **Labels axes X et Y plus lisibles** (taille + opacité augmentées) ✅
- **Tri croissant par numéro de table à valeur égale** ✅
- **Listeners démarrés au chargement si onglet 2 actif** (refresh page OK) ✅
- Filtre période : 7j · Aujourd'hui · 30j · 12 mois · Personnalisé (défaut : 30j) ✅
- FAB raccourcis contextuels selon onglet actif ✅
- Traduit en 5 langues ✅

### Système analytics agrégats Firebase
- Écritures fire-and-forget à chaque commande et appel ✅
- Structure : `analytics/{YYYY-MM-DD}/{orders,calls,products}` ✅
- Backfill one-time depuis commandes existantes (utilise `createdAt` ou `ts`) ✅
- Cleanup automatique après 365 jours ✅
- Firebase rules : validation `createdAt` sur analytics ✅

---

## Structure Firebase par restaurant

```
restaurants/{rid}/
  profile/name / createdAt / langs[]
  config/adminHash / active / features / retention / defaultLang / primaryLang / enabledLangs
  menu/cats[] / items[] / info / heroImage / logoUrl / ...
  orders/{id}/    ← { tableNum, table, ts, items, total, status, createdAt }
  calls/lastCall  ← { table, ts, lang }
  devices/{deviceId}/  ← tokens FCM server-app
  messages/{ts}/  ← { text, ts, lang } — cleanup 30j auto
  analytics/{YYYY-MM-DD}/  ← { createdAt, orders:{tbl:cnt}, calls:{tbl:cnt}, products:{id:{qty,name}} }

control/
  fcm_tokens/{deviceId}/  ← tokens FCM control-app
```

---

## Firebase Rules v3 — ✅ APPLIQUÉES (2026-06-03)

```
restaurants/$rid/devices/$deviceId  → token<300, ts number, lang string
restaurants/$rid/orders/$orderId    → table + ts number
restaurants/$rid/calls/$callId      → table + ts number
restaurants/$rid/messages/$msgId   → text string<500, ts number
restaurants/$rid/analytics/$dateKey → createdAt number
control/fcm_tokens/$deviceId        → lecture bloquée, écriture validée
demoPage/                           → lecture + écriture publique
```

---

## Audit complet — 2026-06-04 ✅

| Point | Statut |
|-------|--------|
| FCM retry 3 tentatives backoff | ✅ |
| Concurrence FCM max 8 | ✅ |
| Token invalide supprimé (404/410/UNREGISTERED) | ✅ |
| orderId anti-collision | ✅ |
| Diag sécurisé DIAG_SECRET | ✅ |
| escapeHtml sur toutes les données Firebase (server-app) | ✅ |
| Firebase rules v3 appliquées | ✅ |
| Messages admin persistants (Firebase, 30j) | ✅ |
| Modals hors tabs-track (fix touch Android) | ✅ |
| Pas de double listener Firebase après création client | ✅ |
| Flash "Menu Pro" → nom réel dès démarrage server-app | ✅ |
| Scroll conservé au changement de statut commande | ✅ |
| Labels Nom/ID au-dessus des champs control-app | ✅ |
| Boutons Mettre à jour Nom/ID — style unifié | ✅ |
| Section Statistiques : une seule carte réductible | ✅ |
| Graphiques : animation CSS @keyframes (toujours visibles) | ✅ |
| Graphiques : listeners démarrés au refresh sur onglet 2 | ✅ |
| Graphiques : backfill robuste (createdAt + ts fallback) | ✅ |
| Graphiques : labels axes lisibles | ✅ |
| Graphiques : tri croissant à valeur égale | ✅ |
| Bottom nav unified (admin+control) — style server-app pill+gold | ✅ |
| Desktop responsive admin + menu client élégant | ✅ |

---

## Prochaines étapes

- [ ] **Tables & QR codes** — corriger le système de création et téléchargement
- [ ] **Page démo** — corrections à définir
- [ ] Passer Firebase en Blaze avant 80 restaurants actifs
- [ ] APKs signés release

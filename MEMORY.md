# MEMORY — Menu SaaS Platform
## Dernière mise à jour : 2026-06-04

---

## Qui est Malek

- Entrepreneur vendeur de Menu Pro, pas développeur — expliquer en termes d'effet visible, sans jargon
- Communique par défaut en **SSH depuis Redmi Note 13** via Termius/Tailscale → jamais de popup GUI Windows
- Si le message commence par **"Ordinateur"** ou **"PC"** → mode Claude Code PC, pas de contraintes headless
- Teste les APKs sur son **Redmi Note 13 5G**
- Travaille en français (messages courts, parfois franglais)
- Utilise **uniquement des APKs natifs** (Capacitor)

---

## Règles absolues de travail

### 1. Autonomie totale
Ne laisser à Malek QUE : actions navigateur, installation APK, credentials expirés.
Ne jamais lister des fichiers "à faire", ne jamais demander confirmation pour des actions techniques.

### 2. Pipeline après chaque modification
1. Mettre à jour `STATE.md`
2. Git push (bon compte + commit + push)
3. **Rebuild APK OBLIGATOIRE** si `server-app/` ou `control-app/` touchés → copier à la racine → confirmer taille. Ne jamais oublier, ne jamais demander confirmation. Les fichiers `client/` (Vercel) ne nécessitent pas de rebuild.
4. Mettre à jour `MEMORY.md` si nouvelle info structurelle

### 3. Comptes git
| Repo | Compte gh | Email git |
|------|-----------|-----------|
| `menu-saas-platform` | `Cafe-elysee` | `malek24593636@gmail.com` |
| `menu-pro-demo` | `mozart-cafe-menu` | `mozartcafe.contact@gmail.com` |

### 4. Audit obligatoire avant chaque modif de code
Vérifier l'impact sur les fonctionnalités existantes. Ne jamais "c'est fait" sans vérification grep/lecture.

### 5. Fichiers HTML volumineux → Node.js pour les remplacements

### 6. Git pull obligatoire en début de session

---

## Comptes et accès

| Service | Compte | Détail |
|---------|--------|--------|
| GitHub SaaS | `Cafe-elysee` | email : `malek24593636@gmail.com` |
| GitHub Démo | `mozart-cafe-menu` | email : `mozartcafe.contact@gmail.com` |
| Vercel SaaS | `malek24593636@gmail.com` | https://menu-saas-platform.vercel.app/ |
| Vercel Démo | `mozartcafe.contact@gmail.com` | https://menu-pro-demo.vercel.app/ |
| Firebase SaaS | `mozartcafe.contact@gmail.com` | projet `menu-saas-platform` |
| Firebase Control | `mozartcafe.contact@gmail.com` | projet `menu-pro-control` (devis uniquement) |
| Cloudinary | `dowi189l9` | preset `menu_photos` — isolation par `/{rid}/` |
| Restaurant demo | `?rid=demo` | mot de passe : `MenuPro2026` |

---

## Firebase SaaS — Config

```
apiKey: AIzaSyCM6SiQoWQfsq_t-80EfiVplXV9p534_eI
messagingSenderId: 460781372428
databaseURL: https://menu-saas-platform-default-rtdb.europe-west1.firebasedatabase.app
VAPID: BDl5qclUNBK8u-bsuCydBWkZarZurlq_U6NiceUhQo7jDExp95hZuvpN2Pi7HY0ojVO0pWaHD0dOZEICvHi7rkg
```

**google-services.json** :
- `com.menupro.control.saas` → `1:460781372428:android:739bbbacdecea46582da29`
- `com.menupro.serveur` → `1:460781372428:android:3f98b007731acf6f82da29`

### Structure Firebase
```
restaurants/{rid}/
  profile/name / createdAt / langs[]
  config/adminHash / active / features / retention / defaultLang / primaryLang / enabledLangs
  menu/cats[] / items[] / info / heroImage / logoUrl / ...
  orders/{id}/    ← { tableNum, table, ts, items, total, status, createdAt }
  calls/lastCall  ← { table, ts, lang }
  devices/{deviceId}/  ← tokens FCM server-app
  messages/{ts}/  ← { text, ts, lang } — cleanup auto 30j
  analytics/{YYYY-MM-DD}/  ← { createdAt, orders:{tbl:cnt}, calls:{tbl:cnt}, products:{id:{qty,name}} }

control/
  fcm_tokens/{deviceId}/  ← tokens FCM control-app
```

---

## APKs SaaS — Config Android

| App | applicationId | namespace |
|-----|---------------|-----------|
| control-app | `com.menupro.control.saas` | `com.menupro.control` |
| server-app | `com.menupro.serveur` | `com.monresto.serveur` |

**RÈGLE ABSOLUE** : `namespace` = `package` dans `MainActivity.java`.

---

## Système FCM

| App | Token dans | Envoyé par |
|-----|-----------|------------|
| Server-app | `restaurants/{rid}/devices/{deviceId}` | `/api/notify` |
| Control-app | `control/fcm_tokens/{deviceId}` | `/api/notify-control` |

**Messages admin** : sauvegardés dans `restaurants/{rid}/messages/{ts}` même sans app connectée. Server-app charge l'historique via `startMessagesListener()`. Cleanup auto 30j.

---

## Langues — Deux paramètres

| Paramètre | Chemin Firebase | Effet |
|-----------|----------------|-------|
| `defaultLang` | `config/defaultLang` | Langue affichée au menu client à la 1ère visite |
| `primaryLang` | `config/primaryLang` | Langue de saisie admin + défaut server-app |

---

## Rétention — Defaults

- 1 semaine (604800000 ms) pour appels et commandes — sauvé dans Firebase à la création
- Messages admin : cleanup auto 30 jours dans Firebase

---

## Onglet initial server-app

1. Commandes en attente → Commandes (priorité absolue)
2. Appels en attente (sans commandes) → Appels
3. Commande seule OU les deux activées → Commandes
4. Sonnette seule → Appels
5. Aucune option → dernier onglet visité ou Appels

---

## Points techniques critiques

### Modals control-app hors tabs-track (IMPORTANT)
`#del-modal` et `#nc-modal` doivent être placés **après la fermeture de `#app`**, jamais dans `.tabs-track`. En WebView Android, `position:fixed` dans un parent transformé perd son ancrage au viewport → zone tactile décalée → boutons non cliquables.

### Section Statistiques admin — stats-card (IMPORTANT)
La section Statistiques utilise la classe `.stats-card` (PAS `adm-section`). Le JS `setupCollapsible()` enveloppe les `adm-section` dans `sec-body > sec-body-inner` — ce wrapping casse le rendu des graphiques Firebase. La section a son propre collapse via `toggleStatsCard()` (CSS max-height, état localStorage).

### Graphiques analytics — animation CSS @keyframes
Les barres SVG utilisent `@keyframes chartBarGrow` + CSS custom property `--bar-i` pour le délai. Pas de manipulation JS de classe `.anim` — trop fragile. Les barres sont rendues à leur position finale dès le départ.

### Listeners analytics — démarrage au chargement
`startOrdersListener()` et `startAnalyticsListener()` sont appelés depuis `switchAdminTab` ET depuis `DOMContentLoaded` si `_adminCurrentTab === 'orders'`. Sans ce double démarrage, un refresh sur l'onglet 2 ne charge pas les graphiques.

### Backfill analytics
`_backfillAnalyticsFromOrders()` s'exécute depuis le listener orders (après que `_adminAllOrders` est peuplé), avec `_analyticsBackfillDone` flag pour ne tourner qu'une fois par session. Utilise `o.createdAt || o.ts` pour couvrir les anciennes commandes.

### Commandes — Structure Firebase obligatoire
```js
{ tableNum, table: String(tableNum), ts: Date.now(), items, total, status:'pending', createdAt: ts }
```

### FCM sécurité
- 3 tentatives backoff | max 8 simultanés | token invalide supprimé sur 404/410
- Canal `mp_srv_v3` créé en Java natif (MainActivity.java server-app)

### escapeHtml
Appliqué sur toutes les données Firebase avant `innerHTML` dans server-app et control-app.

---

## Risques Capacitor — Google Drive corrompt les fichiers

| Fichier | Fix |
|---------|-----|
| `capacitor.plugins.json` vide | Remettre entrées PushNotificationsPlugin |
| `build.gradle` node_modules vide | Copier depuis l'autre app |
| `capacitor.config.json` avec bloc `server.url` | Supprimer ce bloc |

Ordre de vérification si push absent : plugins.json → settings.gradle → build.gradle → node_modules build.gradle → MainActivity.java

---

## Vercel — Notes

- `FIREBASE_SERVICE_ACCOUNT` "Needs Attention" = cosmétique → Redeploy (pas Rotate)
- `DIAG_SECRET` = `Malek2026Diag` — URL diag : `https://menu-saas-platform.vercel.app/api/diag?secret=Malek2026Diag`

---

## Firebase Rules v3 — APPLIQUÉES ✅ (2026-06-03)

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

## 🔒 État fonctionnel — 2026-06-04

**Commit de référence : `01f24f5`**

Ce que couvre cet état (tout validé par Malek) :
- FCM sonnette, commandes, messages admin ✅
- Commandes Firebase (structure validée) ✅
- Control-app : langues 5, carte stable, rétention 1 semaine, modals hors tabs-track ✅
- Control-app : bouton confirmer suppression toujours actif ✅
- Control-app : toggles rechargés correctement après création/suppression client ✅
- Control-app : un seul listener Firebase restaurants ✅
- Control-app : labels Nom/ID au-dessus des champs, boutons "Mettre à jour" style unifié ✅
- Server-app : onglet initial intelligent, messages persistants, cleanup 30j ✅
- Server-app : nom restaurant dès le démarrage, dropdown langue compact ✅
- Server-app : appels persistants Firebase, rétention via control-app ✅
- Server-app : scroll conservé au changement de statut commande ✅
- Menu client : nom restaurant en cache localStorage ✅
- Admin : 2 onglets Affichage Menu / Commandes & Appels ✅
- Admin : section Statistiques — carte unique réductible (chevron + état sauvegardé) ✅
- Admin : graphiques SVG top 10 (commandes/appels/produits) dans la carte Statistiques ✅
- Admin : animation graphiques CSS @keyframes (barres toujours visibles) ✅
- Admin : listeners démarrés au refresh sur onglet 2 ✅
- Admin : backfill analytics robuste (createdAt + ts fallback, regex corrigée) ✅
- Admin : labels axes X/Y plus lisibles, tri croissant à valeur égale ✅
- Admin : FAB raccourcis contextuels, swipe mobile, desktop responsive ✅
- Analytics agrégats Firebase : 12 mois, cleanup 365j, backfill ✅
- Bottom nav unified 3 apps (pill+gold) ✅
- Firebase rules v3 + analytics appliquées ✅
- Audit complet 2026-06-04 ✅

**Note build APK** : `npx cap sync` ne copie jamais `index.html` automatiquement — copie manuelle obligatoire vers `android/app/src/main/assets/public/index.html` avant chaque build.

---

## À faire

- [ ] **Tables & QR codes** — corriger système de création et téléchargement
- [ ] **Page démo** — corrections à définir
- [ ] Passer Firebase en Blaze avant 80 restaurants actifs
- [ ] APKs signés release

---

## Structure dossiers

```
G:\Mon Drive\menu-saas-platform\
├── client/       → Vercel SaaS
├── control-app/  → APK Control
├── server-app/   → APK Serveur
├── demo-page/    → Page démo (repo séparé, ignoré par git SaaS)
├── BUILD.md
├── STATE.md      → état courant + état fonctionnel
└── MEMORY.md     → ce fichier
```

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

### 2. Pipeline après chaque modification
1. Mettre à jour `STATE.md`
2. Git push (bon compte + commit + push)
3. **Rebuild APK OBLIGATOIRE** si `server-app/` ou `control-app/` touchés → copier à la racine → confirmer taille
4. Mettre à jour `MEMORY.md` si nouvelle info structurelle

### 3. Comptes git
| Repo | Compte gh | Email git |
|------|-----------|-----------|
| `menu-saas-platform` | `Cafe-elysee` | `malek24593636@gmail.com` |
| `menu-pro-demo` | `mozart-cafe-menu` | `mozartcafe.contact@gmail.com` |

### 4. Audit obligatoire avant chaque modif de code
### 5. Fichiers HTML volumineux → Node.js pour les remplacements
### 6. Git pull obligatoire en début de session

---

## Comptes et accès

| Service | Compte | Détail |
|---------|--------|--------|
| GitHub SaaS | `Cafe-elysee` | `malek24593636@gmail.com` |
| Vercel SaaS | `malek24593636@gmail.com` | https://menu-saas-platform.vercel.app/ |
| Firebase SaaS | `mozartcafe.contact@gmail.com` | projet `menu-saas-platform` |
| Cloudinary | `dowi189l9` | preset `menu_photos` — isolation `/{rid}/` |
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
  messages/{ts}/  ← { text, ts, lang } — cleanup 30j
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

## Points techniques critiques

### Section Statistiques admin — stats-card (IMPORTANT)
Classe `.stats-card` OBLIGATOIRE (jamais `adm-section`). Le JS `setupCollapsible()` wrapping casse les graphiques Firebase. Collapse via `toggleStatsCard()` CSS max-height + localStorage.

### Listeners analytics — démarrage au chargement
`startOrdersListener()` + `startAnalyticsListener()` depuis `switchAdminTab` ET depuis `DOMContentLoaded` si onglet 2 actif. Sinon refresh sur onglet 2 → graphiques vides.

### FAB visibilité — _updateScFabVisibility en dernier
Dans `syncStyleAdminUI`, `_updateScFabVisibility()` DOIT être appelé en DERNIER (après `scNoteBtn.style.display`). Sinon Note réapparaît sur onglet 2.

### Modals control-app hors tabs-track
`#del-modal` et `#nc-modal` après fermeture `#app`. Position:fixed dans parent transformé → zone tactile cassée sur Android.

### escapeHtml — partout sur données Firebase
- server-app : fonction `escapeHtml` définie, utilisée partout ✅
- control-app : fonction `escapeHtml` définie (depuis audit 2026-06-04), `client.name` escapé ✅
- admin.html : fonction `esc()` définie, utilisée ✅

### Graphiques analytics — animation CSS @keyframes
Barres SVG utilisent `@keyframes chartBarGrow` + CSS custom property `--bar-i`. Pas de manipulation JS de classe `.anim`.

### Backfill analytics
`_backfillAnalyticsFromOrders()` dans le listener orders avec `_analyticsBackfillDone` flag. Utilise `o.createdAt || o.ts`.

### Commandes — Structure Firebase
```js
{ tableNum, table: String(tableNum), ts: Date.now(), items, total, status:'pending', createdAt: ts }
```

---

## Risques Capacitor — Google Drive corrompt les fichiers

Ordre de vérification si push absent : plugins.json → settings.gradle → build.gradle → node_modules build.gradle → MainActivity.java

---

## Vercel — Notes

- `DIAG_SECRET` = `Malek2026Diag` — URL : `https://menu-saas-platform.vercel.app/api/diag?secret=Malek2026Diag`

---

## Firebase Rules v3 — APPLIQUÉES ✅ (2026-06-03)

```
restaurants/$rid/devices/$deviceId  → token<300, ts number, lang string
restaurants/$rid/orders/$orderId    → table + ts number
restaurants/$rid/calls/$callId      → table + ts number
restaurants/$rid/messages/$msgId   → text<500, ts number
restaurants/$rid/analytics/$dateKey → createdAt number
control/fcm_tokens/$deviceId        → lecture bloquée, écriture validée
demoPage/                           → lecture + écriture publique
```

---

## 🔒 État fonctionnel — 2026-06-04

**Commit de référence : `955bffb`** (après audit complet)

- FCM sonnette, commandes, messages admin ✅
- Control-app : labels Nom/ID, boutons Mettre à jour, escapeHtml, erreur modal ✅
- Server-app : onglet initial, messages, scroll, 5 langues ✅
- Admin : section Statistiques réductible, graphiques fonctionnels ✅
- Admin : traductions 5 langues complètes (tables, graphiques, badges, commandes) ✅
- Admin : FAB onglet 2 correct au refresh ✅
- Analytics : backfill robuste, période 30j défaut ✅
- Bottom nav unified, swipe, desktop responsive ✅
- Firebase rules v3 + analytics ✅
- Audit sécurité + traductions complet 2026-06-04 ✅

**Note build APK** : copie manuelle `index.html` obligatoire avant chaque build.

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
├── demo-page/    → Page démo (repo séparé)
├── BUILD.md
├── STATE.md
└── MEMORY.md
```

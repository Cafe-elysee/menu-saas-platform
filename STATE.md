# STATE — Menu SaaS Platform
## Dernière mise à jour : 2026-06-06 (gold light mode fix)

---

## Phase courante : EN PRODUCTION — stable ✅

---

## 🔒 ÉTAT FONCTIONNEL (commit de référence)

**Commit** : `e5c737c` (2026-06-05)
**Branche** : `main`

Cet état est validé et fonctionnel. En cas de problème futur, on peut y revenir.
Pour mettre à jour l'état fonctionnel : demander à Claude de changer ce commit.

**Note build** : `npx cap sync` ne copie JAMAIS `index.html` automatiquement → toujours copier manuellement vers `android/app/src/main/assets/public/index.html` avant chaque build APK.

---

## Déploiements actifs

| Service | URL / Info |
|---------|------------|
| Vercel SaaS | `https://menu-saas-platform.vercel.app` |
| Firebase | projet `menu-saas-platform` |
| GitHub SaaS | `github.com/Cafe-elysee/menu-saas-platform` |
| Restaurant demo | `?rid=demo` — mot de passe : `MenuPro2026` |

---

## APKs

| Fichier | Taille | Rebuild |
|---------|--------|---------|
| `MenuProControl-SaaS-v1.0.apk` | 4.3 MB | 2026-06-06 ✅ |
| `MenuProServeur-SaaS-v1.0.apk` | 6.9 MB | 2026-06-06 ✅ |

> Les changements FABs admin / bouton retour modal sont **web uniquement** (Vercel) — pas de rebuild APK nécessaire.

---

## Configuration Android — NE JAMAIS MODIFIER

| App | applicationId | namespace |
|-----|---------------|-----------|
| control-app | `com.menupro.control.saas` | `com.menupro.control` |
| server-app | `com.menupro.serveur` | `com.monresto.serveur` |

---

## Fonctionnalités — État complet

### Control App
- Clients Firebase temps réel, fingerprint check ✅
- Modals hors tabs-track, `escapeHtml` sur `client.name` ✅
- Boutons 3D gold (`#e2c278 → #c8a44e → #9a7a35`) — identique dark + light ✅
- **Forfait Client** — segmented control interrupteur élégant :
  - 📋 Menu QR → callBtn/orderUI/tableSystem/qrOrdering = false
  - 🛎 Commandes & Services → tout = true
  - Slider gold spring animation, un seul actif à la fois ✅
  - Nouveau client créé = Forfait Menu QR par défaut ✅
- Photos produits, Overlay fêtes, tous thèmes → toujours actifs (plus de contrôle licence) ✅
- Langues disponibles + Paramètres retirés (gérés depuis l'admin) ✅
- **Thème light par défaut** au 1er lancement (si aucun thème sauvegardé) ✅
- **Bouton Nouveau client** : effet 3D gold avancé (card-link style), police Outfit ✅
- **Textes gold en light mode** → couleur texte normale (`var(--text)`) ✅
- **Carte client — ordre Informations** : Nom → Mot de passe admin → ID ✅
- **Boutons pause/suppr dans Forfait** : 3D matte jaune amber (⏸ Mettre en pause) + rouge crimson (🗑️ Supprimer) → vert (▶ Réactiver) ✅
- **Rétention défaut nouveau client** : 1 mois (2592000000 ms) pour appels + commandes ✅

### Server App
- Onglet initial intelligent, messages persistants, scroll conservé ✅
- 5 langues, `escapeHtml` sur toutes données Firebase ✅
- **Écran Forfait Menu QR** : bloque si callBtn=false + orderUI=false (5 langues, respecte dark/light) ✅
- **Statut FCM simplifié** : "Application connectée / non connectée" (5 langues) ✅
- `applyLang()` synchronise le statut FCM à chaque changement de langue ✅
- **Détection suspension/suppression** : listener `config/active` — ⏸ "Service en pause" (active=false) ou 🚫 "Compte introuvable" (supprimé) — 5 langues, flag `_srvActiveKnown` évite faux positif au démarrage ✅

### Menu client (client/index.html)
- Numéro de table jamais affiché au client (interne uniquement) ✅
- Appel serveur : popup "Appeler le serveur ?" sans saisie si URL `?table=X` (5 langues) ✅
- Historique et succès commande : "🪑 À table" sans numéro ✅
- `#table-chip` jamais affiché ✅
- Boutons Menu ↗ (admin + control-app) ouvrent avec `?table=1` ✅
- **Détection suspension/suppression** : ⏸ "Menu en pause" (active=false) ou 🚫 "Menu introuvable" (supprimé) — 5 langues, `_menuActiveKnown` flag ✅

### Admin panel — 3 onglets ✅
- **Onglet 1 — Affichage Menu** : identique à avant ✅
- **Onglet 2 — Commandes & Appels** : identique à avant ✅
- **Onglet 3 — Réglages** :
  - Sections plates sans cartes (Nom → MDP → Langues → Paramètres langues) ✅
  - Boutons gold hardcodé `#c8a44e` dark + light ✅
  - Toggles langues gold hardcodé `#c8a44e` en light mode ✅
  - Nom du restaurant (lecture/écriture `profile/name`, sync temps réel) ✅
  - Langues disponibles (toggles, min 1 obligatoire) ✅
  - Langues — Paramètres (langue défaut + langue admin) ✅
  - Mot de passe admin (hash SHA-256 + écriture `config/adminHash`) ✅
- **Détection suspension/suppression** : vérification `config/active` au login + listener temps réel post-login — déconnexion forcée + message sur écran login ✅
  - Traduit en 5 langues ✅
- Swipe 3 onglets : display↔orders↔settings ✅
  - Orders masqué → display↔settings direct ✅
- switchAdminTab() réécrit (3 onglets, direction animée) ✅
- Fix stacking panels : sync DOM/state dans applyMenuSnapshot + display:none immédiat ✅
- Synchronisation auto via Firebase (admin ↔ control-app temps réel) ✅

### Admin panel — FABs
- `#fab-save` (doré) : onglet 1 uniquement, bottom-right ✅
- `#fab-notif` (vert) : onglet 2 uniquement, **même position** que fab-save ✅
- `#sc-fab` (raccourcis) : au-dessus du FAB principal (bottom-right), masqué sur Réglages ✅
- Animation fluide entrée/sortie (`_showFab` / `_hideFab`) : opacity + transform spring ✅
- **Bouton retour Android** : ferme le modal message serveur (`history.pushState` + `popstate`) ✅

### Admin panel — Statistiques
- Section Statistiques carte unique réductible ✅
- Graphiques analytics pleine largeur au refresh, ordre périodes ✅
- Design stats-card identique adm-section (dark + light) ✅
- FAB onglet 2 correct au refresh ✅

### Admin panel — QR Codes ✅
- Popup personnalisation : HSV picker, 5 styles, 3 coins, centre, aperçu SVG ✅
- PDF fond blanc, ID retiré, 2 colonnes haute résolution ✅
- Swipe bloqué quand popup ouvert, onglet restauré à la fermeture ✅

### Système de commande QR (global)
- 3 features (orderUI/tableSystem/qrOrdering) pilotés ensemble via Forfait ✅
- `writeQRSystem()` + `writeForfait()` dans control-app ✅

---

## Points techniques critiques

### Forfait Client — control-app
`writeForfait(slug, 'menu-qr')` : callBtn/orderUI/tableSystem/qrOrdering = false.
`writeForfait(slug, 'services')` : tout = true. Clic sur forfait déjà actif = ignoré (check `.active`).
Nouveau client : Forfait Menu QR par défaut (`callBtn:false, orderUI:false, tableSystem:false, qrOrdering:false`).

### Onglet Réglages admin — Architecture
`setupSettingsTab()` : 4 listeners Firebase (`profile/name`, `enabledLangs`, `defaultLang`, `primaryLang`).
`_settingsLangData` : état local `{ enabled, default, primary }`.
`adminToggleLang(lang, enabled)` : empêche de désactiver la dernière langue active.
Sync automatique : même Firebase → control-app et admin se voient mutuellement.

### Admin FABs — Architecture
`_showFab(el)` : set transform inline (start) → double rAF → add `.fab-visible` + clear transform → transition opacity+transform.
`_hideFab(el)` : remove `.fab-visible` → set transform inline → setTimeout 220ms clear.
Tous les FABs en `display:flex` permanent + `opacity:0; pointer-events:none` par défaut CSS.
`.fab-visible` : `opacity:1; pointer-events:all`.
Bouton retour Android modal notif : `history.pushState({adminModal:'notif'},'')` à l'ouverture, `popstate` ferme, `closeModal()` appelle `history.back()` si state présent.

### switchAdminTab — 3 onglets
`_TAB_ORDER = { display:0, orders:1, settings:2 }` → direction d'animation calculée par index.
Swipe : orders visible → display↔orders↔settings ; orders masqué → display↔settings.
`syncStyleAdminUI` : si orders masqué et tab=orders → `switchAdminTab('display')`.

### Section Statistiques — stats-card
Utilise `.stats-card` (jamais `adm-section`). Collapse via `toggleStatsCard()`. Ne jamais utiliser `setupCollapsible()` ici.

### QR Popup — scroll lock + tab guard
`_qrLockScroll()` : overflow:hidden sur html+body. Swipe guard dans touchstart/touchend. `_qrSavedTab` restauré à la fermeture.

### stats-card — mode clair
`html.light .stats-card` : `border-left-color:rgba(168,104,64,0.45)` + `border-right-color` obligatoires.

---

## Firebase Rules v3 — APPLIQUÉES ✅

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

## Audit complet — 2026-06-05 ✅

| Point | Statut |
|-------|--------|
| escapeHtml sur toutes données Firebase | ✅ |
| Traductions 5 langues complètes admin + server-app | ✅ |
| Onglet Réglages admin (Nom, Langues, MDP) — sections plates | ✅ |
| Boutons gold #c8a44e hardcodé dark + light (admin + control-app) | ✅ |
| Gold light mode — admin + server-app : --gold #c8a44e (pas #a86840), textes ico-modal-title + lang-tab→var(--cream) | ✅ |
| Toggles langues gold #c8a44e hardcodé light mode | ✅ |
| Sync temps réel admin ↔ control-app | ✅ |
| Forfait Client segmented control (spring animation) | ✅ |
| Nouveau client = Forfait Menu QR par défaut | ✅ |
| Écran forfait server-app (dark/light, 5 langues) | ✅ |
| Numéro table masqué côté client | ✅ |
| Appel serveur sans saisie si QR (`?table=X`) | ✅ |
| Swipe 3 onglets admin (orders masqué → direct display↔settings) | ✅ |
| Fix stacking panels admin (sync DOM/state) | ✅ |
| FABs admin bottom-right stackés (sc-fab au-dessus) | ✅ |
| Animation fluide FABs entrée/sortie (_showFab/_hideFab) | ✅ |
| Bouton retour Android ferme modal message serveur | ✅ |
| Control-app thème light par défaut au 1er lancement | ✅ |
| Control-app bouton Nouveau client 3D gold + Outfit | ✅ |
| Control-app textes gold → var(--text) en light mode | ✅ |
| Server-app FCM status simplifié (5 langues) | ✅ |
| Server-app applyLang() sync FCM status | ✅ |
| Photos/fêtes/thèmes toujours actifs | ✅ |
| Langues retirées de control-app | ✅ |
| stats-card bordures identiques adm-section | ✅ |
| QR popup scroll lock + tab guard | ✅ |
| PDF QR fond blanc, ID retiré | ✅ |
| Firebase rules v3 | ✅ |

---

## Prochaines étapes

- [ ] **Page démo** — corrections à définir
- [ ] Passer Firebase en Blaze avant 80 restaurants actifs
- [ ] APKs signés release

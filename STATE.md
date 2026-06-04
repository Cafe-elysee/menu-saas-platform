# STATE — Menu SaaS Platform
## Dernière mise à jour : 2026-06-04

---

## Phase courante : EN PRODUCTION — stable ✅

---

## 🔒 ÉTAT FONCTIONNEL (commit de référence)

**Commit** : `955bffb` (2026-06-04)
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
| `MenuProControl-SaaS-v1.0.apk` | 4.3 MB | 2026-06-04 — audit complet ✅ |
| `MenuProServeur-SaaS-v1.0.apk` | 6.6 MB | 2026-06-04 ✅ |

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
- 5 langues, rétention 1 semaine, modals hors tabs-track ✅
- Labels Nom/ID au-dessus des champs, boutons "Mettre à jour" unifiés ✅
- `escapeHtml` sur `client.name` dans innerHTML ✅
- Erreur suppression affichée dans modal (plus de `alert()`) ✅

### Server App
- Onglet initial intelligent, messages persistants, scroll conservé ✅
- 5 langues, `escapeHtml` sur toutes données Firebase ✅

### Menu client
- Cache nom restaurant localStorage ✅
- Analytics fire-and-forget ✅

### Admin panel
- 2 onglets, section Statistiques carte unique réductible ✅
- Graphiques analytics fonctionnels (stats-card, @keyframes, listeners) ✅
- Badges "top 10" traduits en 5 langues ✅
- Section Tables traduite (Générer, Copier, Copié, Table X) ✅
- Message "Aucune commande" traduit au changement de langue ✅
- FAB onglet 2 correct au refresh (Note absent, ordre fixé) ✅
- FAB développe la section avant de défiler ✅
- Variable CSS --border2 dupliquée supprimée ✅

---

## Points techniques critiques

### Section Statistiques — stats-card
Utilise `.stats-card` (jamais `adm-section`). Collapse via `toggleStatsCard()` CSS max-height. Le JS `setupCollapsible()` casserait les graphiques Firebase si appliqué ici.

### Listeners analytics au chargement
`startOrdersListener()` + `startAnalyticsListener()` appelés depuis `switchAdminTab` ET depuis `DOMContentLoaded` si onglet 2 actif. Backfill depuis listener orders (`_analyticsBackfillDone` flag).

### Modals control-app hors tabs-track
`#del-modal` et `#nc-modal` après fermeture `#app`. Position:fixed dans parent transformé → zone tactile décalée sur Android.

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

## Audit complet — 2026-06-04 ✅

| Point | Statut |
|-------|--------|
| escapeHtml sur toutes données Firebase (server-app + control-app) | ✅ |
| Traductions 5 langues complètes admin (tables, graphiques, commandes) | ✅ |
| FAB onglet 2 correct au refresh | ✅ |
| Section Statistiques réductible, graphiques fonctionnels | ✅ |
| Backfill analytics robuste | ✅ |
| alert() remplacé par affichage in-modal | ✅ |
| CSS --border2 dupliqué supprimé | ✅ |
| FCM retry, concurrence max 8, token invalide supprimé | ✅ |
| Firebase rules v3 appliquées | ✅ |

---

## Prochaines étapes

- [ ] **Tables & QR codes** — corriger système de création et téléchargement
- [ ] **Page démo** — corrections à définir
- [ ] Passer Firebase en Blaze avant 80 restaurants actifs
- [ ] APKs signés release

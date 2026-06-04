# STATE — Menu SaaS Platform
## Dernière mise à jour : 2026-06-06

---

## Phase courante : EN PRODUCTION — stable ✅

---

## 🔒 ÉTAT FONCTIONNEL (commit de référence)

**Commit** : `5d3ccc9` (2026-06-06)
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

⚠️ Les modifications depuis 955bffb touchent uniquement `client/` (Vercel) → pas de rebuild APK nécessaire.

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

### Admin panel — Statistiques
- 2 onglets, section Statistiques carte unique réductible ✅
- Graphiques analytics pleine largeur au refresh ✅
- Ordre périodes correct + localStorage ✅
- Design stats-card identique aux autres cartes ✅
- Badges "top 10" traduits en 5 langues ✅
- Section Tables traduite ✅
- Message "Aucune commande" traduit au changement de langue ✅
- FAB onglet 2 correct au refresh ✅

### Admin panel — QR Codes ✅ (ajouté post-955bffb)
- Bouton "QR ↗" et boutons Ouvrir/Copier par table ✅
- Popup personnalisation complet :
  - Picker couleur HSV custom (carré saturation/valeur + slider teinte) ✅
  - S=100% et V=100% par défaut à l'ouverture ✅
  - 6 presets couleur + champ hex ✅
  - 5 styles de modules (Carré, Arrondi, Points, Extra, Élégant) en 2 lignes ✅
  - 3 styles de coins (Carré, Arrondi, Cercle) ✅
  - Centre : Aucun / Texte (7 car.) / Image ✅
  - Centre transparent (sans fond blanc) ✅
  - Aperçu SVG vectoriel temps réel ✅
  - Bouton retour Android ferme le popup ✅
- PDF 2 colonnes haute résolution téléchargeable ✅
- Aperçu QR adapté à la taille du conteneur (SVG 100%) ✅

---

## Points techniques critiques

### Section Statistiques — stats-card
Utilise `.stats-card` (jamais `adm-section`). Collapse via `toggleStatsCard()` CSS max-height. Le JS `setupCollapsible()` casserait les graphiques Firebase si appliqué ici.

### Listeners analytics au chargement
`startOrdersListener()` + `startAnalyticsListener()` appelés depuis `switchAdminTab` ET depuis `DOMContentLoaded` si onglet 2 actif. Backfill depuis listener orders (`_analyticsBackfillDone` flag).

### Modals control-app hors tabs-track
`#del-modal` et `#nc-modal` après fermeture `#app`. Position:fixed dans parent transformé → zone tactile décalée sur Android.

### QR Popup — bouton retour Android
`history.pushState({qrModal:true},'')` à l'ouverture + listener `popstate` pour fermer → bouton retour natif Android fonctionne.

### QR Picker HSV
`_QR._hsv = {h:0,s:1,v:1}` initialisé dans `_QR`. Fonctions `_hsvToHex`, `_hexToHsv`, `_qrUpdateHsvUI`, `_qrInitHsvEvents`. Drag sur carré SV + slider teinte, touch + mouse.

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

## Audit complet — 2026-06-04 ✅ + QR 2026-06-06 ✅

| Point | Statut |
|-------|--------|
| escapeHtml sur toutes données Firebase (server-app + control-app) | ✅ |
| Traductions 5 langues complètes admin | ✅ |
| FAB onglet 2 correct au refresh | ✅ |
| Section Statistiques réductible, graphiques fonctionnels | ✅ |
| Graphiques pleine largeur au refresh + ordre périodes | ✅ |
| Backfill analytics robuste | ✅ |
| FCM retry, concurrence max 8, token invalide supprimé | ✅ |
| Firebase rules v3 appliquées | ✅ |
| QR codes — popup complet avec picker HSV, styles, PDF | ✅ |
| DIAG_SECRET retiré de MEMORY.md | ✅ |

---

## Prochaines étapes

- [ ] **Page démo** — corrections à définir
- [ ] Passer Firebase en Blaze avant 80 restaurants actifs
- [ ] APKs signés release

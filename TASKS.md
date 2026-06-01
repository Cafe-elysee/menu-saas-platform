# TASKS — Menu SaaS Platform

## PHASE 1 — Clonage complet ✅

- [x] Créer `G:\Mon Drive\menu-saas-platform\`
- [x] Créer structure dossiers (`client/`, `control-app/`, `client/api/`)
- [x] Copier `index.html` (menu web) depuis Menu Café Demo
- [x] Copier `admin.html` depuis Menu Café Demo
- [x] Copier `manifest.json`, `vercel.json`, `service-worker.js`, `firebase-messaging-sw.js`
- [x] Copier `icon.svg`, `icon-maskable.svg`
- [x] Copier `api/notify.js`
- [x] Copier `control-app/index.html` depuis Controle Native
- [x] Créer `PROJECT.md`, `TASKS.md`, `STATE.md`
- [ ] **NOTE** : `app.html` (PWA serveur) absent du source — supprimé en production (remplacé par APK natif). À recréer from scratch en Phase 5 si nécessaire pour le SaaS.
- [ ] Vérifier intégrité fichiers copiés (tailles OK)

## PHASE 2 — Audit système existant ⏳

- [ ] Analyser structure Firebase actuelle dans `client/index.html`
- [ ] Analyser structure Firebase dans `client/admin.html`
- [ ] Analyser `client/api/notify.js` — flow notifications
- [ ] Identifier tous les hardcoded restaurant data
- [ ] Identifier les localStorage keys à migrer
- [ ] Identifier les points de duplication entre clients
- [ ] Cartographier le flow commande complet
- [ ] Produire rapport d'architecture SaaS détaillé

## PHASE 3 — Firebase SaaS Architecture ✅

- [x] Définir schéma RTDB complet `restaurants/{restaurantId}/...`
- [x] Refactor `client/index.html` — prefix toutes les refs Firebase (_rref, _RID, _PFX)
- [x] Refactor `client/admin.html` — idem (+ Cloudinary folder dynamique)
- [x] Refactor `client/firebase-messaging-sw.js` — config SaaS universelle
- [x] Refactor `client/api/notify.js` — recevoir + valider restaurantId
- [x] Refactor `server-app/index.html` — config SaaS + localStorage _PFX + fcm_tokens→devices
- [x] Refactor `control-app/index.html` — SAAS_FB_CONFIG + loadClientsFromFirebase() + getClientDb() proxy SaaS
- [ ] Créer projet Firebase SaaS (à faire par Malek dans navigateur) — remplacer %%SAAS_*%% dans tous les fichiers
- [ ] Tester isolation données entre restaurants

## PHASE 4 — Flow commande complet ⏳

- [ ] Client : sélection menu → panier → submit
- [ ] Firebase write : `/restaurants/{restaurantId}/orders/{orderId}`
- [ ] Listener commandes côté serveur app
- [ ] Trigger Vercel API avec `restaurantId` + `orderId`
- [ ] Fetch tokens `/restaurants/{restaurantId}/devices/`
- [ ] Envoi FCM notifications

## PHASE 5 — Capacitor apps ⏳

- [ ] Refactor `control-app/index.html` — dashboard SaaS global
- [ ] Créer `server-app/index.html` — app serveur SaaS
- [ ] Build APK Control SaaS
- [ ] Build APK Server SaaS

## PHASE 6 — Table system + QR ⏳

- [ ] Admin : générateur tables (1 → N)
- [ ] Assigner `tableId` à chaque QR
- [ ] Format URL : `/menu.html?rid={restaurantId}&table={tableId}`
- [ ] Affichage "📍 Table X" côté client

## PHASE 7 — QR generation pro ⏳

- [ ] Page `qr-generator.html`
- [ ] Intégration `QRCode.js`
- [ ] Génération batch (toutes les tables)
- [ ] Grid view + preview
- [ ] Download PDF via `jsPDF` avec branding

## PHASE 8 — Vercel API notifications ⏳

- [ ] `api/notify.js` : recevoir `restaurantId` + `orderId`
- [ ] Valider `restaurantId`
- [ ] Fetch RTDB tokens `/restaurants/{restaurantId}/devices`
- [ ] Envoi FCM
- [ ] Log résultat dans RTDB logs

## PHASE 9 — Auth + Session ⏳

- [ ] Conserver SHA-256 login
- [ ] Ajouter session tokens Firebase : `sessions/{restaurantId}/`
- [ ] Validation admin access obligatoire

## PHASE 10 — Feature flags ⏳

- [ ] Implémenter `features/{qrOrdering, notifications, tableSystem, analytics}`
- [ ] Activation par restaurant depuis Control app

## PHASE 11 — Logging system ⏳

- [ ] `logs/orders/` — log chaque commande
- [ ] `logs/errors/` — log erreurs runtime
- [ ] `logs/actions/` — log actions admin

## PHASE 12 — Setup outils ⏳

- [ ] Créer repo GitHub SaaS
- [ ] Créer projet Vercel SaaS
- [ ] Créer projet Firebase SaaS
- [ ] Configurer FCM
- [ ] Configurer Cloudinary si nécessaire

## PHASE 13 — Tests ⏳

- [ ] Menu fonctionne
- [ ] Admin fonctionne
- [ ] Commandes live OK
- [ ] Capacitor app OK
- [ ] Notifications OK
- [ ] Firebase sync stable
- [ ] Isolation multi-restaurants vérifiée

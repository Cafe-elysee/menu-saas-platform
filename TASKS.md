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

## PHASE 2 — Audit système existant ✅

- [x] Analyser structure Firebase actuelle dans `client/index.html`
- [x] Analyser structure Firebase dans `client/admin.html`
- [x] Analyser `client/api/notify.js` — flow notifications
- [x] Identifier tous les hardcoded restaurant data
- [x] Identifier les localStorage keys à migrer
- [x] Identifier les points de duplication entre clients
- [x] Cartographier le flow commande complet
- [x] Produire rapport d'architecture SaaS détaillé (voir STATE.md)

## PHASE 3 — Firebase SaaS Architecture ✅

- [x] Définir schéma RTDB complet `restaurants/{restaurantId}/...`
- [x] Refactor `client/index.html` — prefix toutes les refs Firebase (_rref, _RID, _PFX)
- [x] Refactor `client/admin.html` — idem (+ Cloudinary folder dynamique)
- [x] Refactor `client/firebase-messaging-sw.js` — config SaaS universelle
- [x] Refactor `client/api/notify.js` — recevoir + valider restaurantId
- [x] Refactor `server-app/index.html` — config SaaS + localStorage _PFX + fcm_tokens→devices
- [x] Refactor `control-app/index.html` — SAAS_FB_CONFIG + loadClientsFromFirebase() + getClientDb() proxy SaaS
- [x] Créer projet Firebase SaaS (`menu-saas-platform`) — credentials injectés dans tous les fichiers via `_fill_saas_config.js`
- [ ] Tester isolation données entre restaurants (ouvrir 2 onglets ?rid=demo et ?rid=test)

## PHASE 4 — Flow commande complet ✅

- [x] Client : sélection menu → panier → submit
- [x] Firebase write : `_rref('orders/' + orderId).set(order)` → `/restaurants/{rid}/orders/{orderId}`
- [x] Listener commandes côté serveur app : `_rref('orders').on('value', ...)`
- [x] Trigger Vercel `/api/notify` avec `restaurantId` + `table` (keepalive fetch)
- [x] Fetch tokens `/restaurants/{restaurantId}/devices/` dans `notify.js`
- [x] Envoi FCM notifications
- [x] Corriger clés localStorage hardcodées (CART_KEY, ORDERS_HIST_KEY, STORE_KEY_SEC, CALLS_KEY, MSGS_KEY → _PFX)

## PHASE 5 — Capacitor apps ✅ (partiel — build manuel requis)

- [x] Refactor `control-app/index.html` — dashboard SaaS global (fait en Phase 3)
- [x] Refactor `server-app/index.html` — app serveur SaaS (fait en Phase 3)
- [x] Créer `control-app/capacitor.config.json` + `package.json`
- [x] Créer `server-app/capacitor.config.json` + `package.json`
- [x] Copier projet Android depuis H: Controle Native → `control-app/android/`
- [x] Créer templates `google-services.json.TEMPLATE` pour les deux apps
- [x] Créer `BUILD.md` avec instructions complètes
- [ ] **MALEK** : Télécharger `google-services.json` SaaS depuis Firebase Console (package: `com.menupro.control` et `com.menupro.serveur`)
- [ ] **MALEK** : `npx cap add android` pour server-app (avec Node.js 18/20)
- [ ] Build APK Control SaaS (Android Studio)
- [ ] Build APK Server SaaS (Android Studio)

## PHASE 6 — Table system + QR ✅

- [x] Admin : section "Tables & QR codes" — input nombre de tables → `_rref('config/tableCount').set(n)`
- [x] URLs générées : `index.html?rid={rid}&table={n}` avec bouton "Copier" par table
- [x] Section visible seulement si `showOrderUI` est actif (mode commande)
- [x] `client/index.html` : `_TID = URLSearchParams.get('table')` — saute le prompt si QR
- [x] Affichage "📍 Table X" chip dans nav quand `_TID` est défini
- [ ] Phase 7 (QR generation pro) : export PDF QR codes avec jsPDF

## PHASE 7 — QR generation pro ✅

- [x] Page `client/qr-generator.html` — standalone, accessible depuis admin
- [x] Intégration `QRCode.js` (CDN)
- [x] Génération batch (1-99 tables), config rid + URL de base + taille
- [x] Grid view avec sélection individuelle / tout sélectionner
- [x] Copier URLs sélectionnées (clipboard)
- [x] Export PDF via `jsPDF` : fond noir, branding or, grille 3 colonnes, multi-pages

## PHASE 8 — Vercel API notifications ✅

- [x] `api/notify.js` : reçoit `restaurantId` + `table` + `type`
- [x] Valide `restaurantId` (regex `[a-z0-9_-]+`)
- [x] Fetch RTDB tokens `/restaurants/{restaurantId}/devices/`
- [x] Envoi FCM multi-token avec retry
- [x] Log résultat dans `restaurants/{rid}/logs/notifications/`
- [x] Nettoyage tokens invalides (`deleteToken`)

## PHASE 9 — Auth + Session ✅

- [x] SHA-256 login conservé (`crypto.subtle.digest`)
- [x] Hash stocké dans Firebase `config/adminHash` (priorité sur fallback local)
- [x] Session tokens Firebase : `sessions/{rid}/{sessionId}` — écriture login, suppression logout
- [x] Vérification session au rechargement (révocation à distance depuis control-app)
- [x] Bypass `?ctrl=1` pour control-app avec `ctrlBypass` timestamp Firebase
- [x] Login screen : nom du restaurant chargé depuis Firebase `menu/info/name`
- [x] ADMIN_HASH fallback nettoyé (plus de password Café Élysée hardcodé)

## PHASE 10 — Feature flags ⏳

- [ ] Implémenter `features/{qrOrdering, notifications, tableSystem, analytics}`
- [ ] Activation par restaurant depuis Control app

## PHASE 11 — Logging system ⏳

- [ ] `logs/orders/` — log chaque commande
- [ ] `logs/errors/` — log erreurs runtime
- [ ] `logs/actions/` — log actions admin

## PHASE 12 — Setup outils ✅ (partiel)

- [x] Créer repo GitHub SaaS : `github.com/Cafe-elysee/menu-saas-platform`
- [x] Créer projet Firebase SaaS (`menu-saas-platform`) — credentials dans STATE.md
- [x] `BUILD.md` — instructions complètes build + déploiement
- [ ] **MALEK** : Créer projet Vercel SaaS (lier au repo GitHub)
- [ ] **MALEK** : Configurer variable `FIREBASE_SERVICE_ACCOUNT` dans Vercel
- [ ] **MALEK** : Configurer FCM dans Firebase Console
- [ ] Cloudinary : utilise cloud `dowi189l9` / preset `menu_photos` (déjà configuré)

## PHASE 13 — Tests ⏳

- [ ] Menu fonctionne
- [ ] Admin fonctionne
- [ ] Commandes live OK
- [ ] Capacitor app OK
- [ ] Notifications OK
- [ ] Firebase sync stable
- [ ] Isolation multi-restaurants vérifiée

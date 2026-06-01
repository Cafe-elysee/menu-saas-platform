# Menu SaaS Platform — Project Documentation

## Vision
Transformer les projets restaurants existants en une plateforme SaaS multi-restaurants complète,
autonome, scalable et prête production.

## Stack technique
- Vanilla JS (HTML/CSS/JS pur — zéro framework)
- Firebase Realtime Database (unique backend)
- Vercel (hosting + serverless API)
- Capacitor 6 (apps natives WebView)
- QRCode.js (génération QR codes)
- jsPDF (export PDF QR)
- FCM notifications via Vercel API

## Chemins critiques
- Source (READ ONLY) : `H:\Mon Drive\Menu Pro\`
- Projet SaaS       : `G:\Mon Drive\menu-saas-platform\`

## Structure du projet
```
menu-saas-platform/
├── client/                  ← Application web client (menu + admin)
│   ├── index.html           ← Menu web client (Phase 1 : clone Café Demo)
│   ├── admin.html           ← Admin panel restaurant
│   ├── manifest.json        ← PWA manifest
│   ├── vercel.json          ← Vercel routing
│   ├── service-worker.js    ← PWA cache
│   ├── firebase-messaging-sw.js  ← FCM service worker
│   ├── icon.svg / icon-maskable.svg
│   └── api/
│       └── notify.js        ← Vercel serverless — notifications FCM
│
├── control-app/             ← App Control Capacitor (dashboard Malek)
│   └── index.html           ← Phase 1 : clone Controle Native
│
├── PROJECT.md               ← Ce fichier
├── TASKS.md                 ← Tâches par phase
└── STATE.md                 ← État courant de la migration
```

## Architecture SaaS cible (Firebase RTDB)
```
restaurants/
  {restaurantId}/
    config/        ← paramètres, features, thème, langues
    menu/          ← catégories + produits
    orders/        ← commandes en temps réel
    tables/        ← système de tables
    devices/       ← tokens FCM
    sessions/      ← tokens de session admin
    logs/          ← journaux erreurs + actions
    settings/      ← rétention, mot de passe hash, etc.
```

## Règle absolue
Chaque nœud Firebase DOIT contenir `restaurantId`.
Aucune donnée globale autorisée.

## Comptes & accès
- Firebase : `mozartcafe.contact@gmail.com`
- GitHub SaaS : à créer
- Vercel SaaS : à créer
- Cloudinary : cloud `dowi189l9` / preset `menu_photos` (compte Malek)

## Phases
| Phase | Titre | Statut |
|-------|-------|--------|
| 1  | Clonage complet | ✅ TERMINÉ |
| 2  | Audit système existant | ✅ TERMINÉ |
| 3  | Firebase SaaS Architecture | ✅ TERMINÉ — projet `menu-saas-platform` actif |
| 4  | Flow commande complet | ✅ TERMINÉ |
| 5  | Capacitor apps | ✅ TERMINÉ — APKs buildés depuis G: |
| 6  | Table system + QR | ✅ TERMINÉ |
| 7  | QR generation pro | ✅ TERMINÉ — `qr-generator.html` + export PDF |
| 8  | Vercel API notifications | ✅ TERMINÉ — `api/notify.js` SaaS |
| 9  | Auth + Session | ✅ TERMINÉ — session tokens Firebase |
| 10 | Feature flags | ✅ TERMINÉ — tableSystem, qrOrdering |
| 11 | Logging system | ✅ TERMINÉ — orders, errors, actions, notifications |
| 12 | Setup outils | ✅ TERMINÉ — GitHub + Vercel + Firebase déployés |
| 13 | Tests + compatibilité | 🔶 PROTOCOLE CRÉÉ — tests APK en cours |
| 14 | Recovery system | ✅ TERMINÉ (fichiers créés) |

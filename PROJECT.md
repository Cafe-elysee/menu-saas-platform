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
| 2  | Audit système existant | ⏳ EN ATTENTE |
| 3  | Firebase SaaS Architecture | 🔶 REFACTORING OK — FIREBASE SaaS À CRÉER |
| 4  | Flow commande complet | ⏳ EN ATTENTE |
| 5  | Capacitor apps | ⏳ EN ATTENTE |
| 6  | Table system + QR | ⏳ EN ATTENTE |
| 7  | QR generation pro | ⏳ EN ATTENTE |
| 8  | Vercel API notifications | ⏳ EN ATTENTE |
| 9  | Auth + Session | ⏳ EN ATTENTE |
| 10 | Feature flags | ⏳ EN ATTENTE |
| 11 | Logging system | ⏳ EN ATTENTE |
| 12 | Setup outils | ⏳ EN ATTENTE |
| 13 | Tests + compatibilité | ⏳ EN ATTENTE |
| 14 | Recovery system | ✅ TERMINÉ (fichiers créés) |

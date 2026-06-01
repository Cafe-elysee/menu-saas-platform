# BUILD — Menu SaaS Platform

## Commande rebuild complète (depuis G: — tout automatique)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\malek\AppData\Local\Android\Sdk"

# Sync assets web → android
Copy-Item "G:\Mon Drive\menu-saas-platform\control-app\index.html" "G:\Mon Drive\menu-saas-platform\control-app\android\app\src\main\assets\public\index.html" -Force
Copy-Item "G:\Mon Drive\menu-saas-platform\server-app\index.html" "G:\Mon Drive\menu-saas-platform\server-app\android\app\src\main\assets\public\index.html" -Force

# Build
Set-Location "G:\Mon Drive\menu-saas-platform\control-app\android"; .\gradlew.bat assembleDebug
Set-Location "G:\Mon Drive\menu-saas-platform\server-app\android"; .\gradlew.bat assembleDebug

# Copier APKs à la racine
Copy-Item "G:\Mon Drive\menu-saas-platform\builds\control-app\debug\MenuProControl-SaaS-v1.0.apk" "G:\Mon Drive\menu-saas-platform\MenuProControl-SaaS-v1.0.apk" -Force
Copy-Item "G:\Mon Drive\menu-saas-platform\builds\server-app\debug\MenuProServeur-SaaS-v1.0.apk" "G:\Mon Drive\menu-saas-platform\MenuProServeur-SaaS-v1.0.apk" -Force
```

APKs à la racine :
- `G:\Mon Drive\menu-saas-platform\MenuProControl-SaaS-v1.0.apk`
- `G:\Mon Drive\menu-saas-platform\MenuProServeur-SaaS-v1.0.apk`

---

## Configuration Android — NE PAS MODIFIER

### Packages définitifs (CRITIQUE — ne pas changer le namespace)

| App | applicationId | namespace | MainActivity.java |
|-----|---------------|-----------|-------------------|
| control-app | `com.menupro.control.saas` | `com.menupro.control` | `package com.menupro.control` |
| server-app | `com.menupro.serveur` | `com.monresto.serveur` | `package com.monresto.serveur` |

**RÈGLE** : `namespace` = package de `MainActivity.java`. Ne jamais les désynchroniser.
**RÈGLE** : `applicationId` = identifiant unique sur le téléphone (peut différer du namespace).

### capacitor.config.json (appId doit correspondre à applicationId)

| App | appId dans capacitor.config.json |
|-----|----------------------------------|
| control-app | `com.menupro.control.saas` |
| server-app | `com.menupro.serveur` |

### google-services.json (même fichier pour les deux apps)

Contient les deux packages enregistrés dans Firebase `menu-saas-platform` :
- `com.menupro.control.saas` → mobilesdk_app_id: `1:460781372428:android:739bbbacdecea46582da29`
- `com.menupro.serveur` → mobilesdk_app_id: `1:460781372428:android:3f98b007731acf6f82da29`

Fichiers en place :
- `control-app/android/app/google-services.json`
- `server-app/android/app/google-services.json`

---

## Prérequis système

- JAVA_HOME : `C:\Program Files\Android\Android Studio\jbr` (JBR 21)
- ANDROID_HOME : `C:\Users\malek\AppData\Local\Android\Sdk`
- Node.js v25 installé (non utilisé pour Capacitor, juste pour scripts)
- Pas besoin d'Android Studio ouvert — build en ligne de commande

---

## Nouveau client — procédure complète

1. Ouvrir l'app Control SaaS sur le téléphone
2. Onglet Clients → bouton **"＋ Nouveau client"**
3. Remplir : nom du restaurant, identifiant (rid), mot de passe admin
4. Cliquer **Créer** → Firebase créé automatiquement
5. Donner au client :
   - **Lien admin** : `https://menu-saas-platform.vercel.app/admin.html?rid={rid}`
   - **App serveur** : `MenuProServeur-SaaS-v1.0.apk` + entrer le `rid` au premier lancement

---

## Checklist avant distribution APK

- [x] `google-services.json` SaaS dans `android/app/` des deux apps
- [x] Firebase `menu-saas-platform` actif
- [x] Restaurant `demo` créé (mot de passe : `MenuPro2026`)
- [x] Vercel déployé avec `FIREBASE_SERVICE_ACCOUNT`
- [ ] Test ouverture APK control-app sur Redmi Note 13 5G
- [ ] Test ouverture APK server-app sur Redmi Note 13 5G
- [ ] Test commande end-to-end
- [ ] Test notifications FCM

# BUILD — Menu SaaS Platform

## Commande rapide rebuild (tout depuis G:)

```powershell
# Mettre à jour les assets ET rebuilder les deux APKs en une commande :
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\malek\AppData\Local\Android\Sdk"
Copy-Item "G:\Mon Drive\menu-saas-platform\client\index.html" "G:\Mon Drive\menu-saas-platform\control-app\android\app\src\main\assets\public\index.html" -Force
Copy-Item "G:\Mon Drive\menu-saas-platform\server-app\index.html" "G:\Mon Drive\menu-saas-platform\server-app\android\app\src\main\assets\public\index.html" -Force
Set-Location "G:\Mon Drive\menu-saas-platform\control-app\android"; .\gradlew.bat assembleDebug
Set-Location "G:\Mon Drive\menu-saas-platform\server-app\android"; .\gradlew.bat assembleDebug
```

APKs générés dans :
- `G:\Mon Drive\menu-saas-platform\builds\control-app\debug\MenuProControl-v1.0.apk`
- `G:\Mon Drive\menu-saas-platform\builds\server-app\debug\MenuProServeur-v1.0.apk`

---


## Prérequis

- Node.js **18 ou 20** LTS (pas v21+) — Capacitor 6 incompatible avec Node.js v25
- Android Studio installé
- Android SDK configuré (`ANDROID_HOME`)
- Java 17+

---

## Étape 1 — google-services.json (OBLIGATOIRE avant build)

Aller sur Firebase Console → projet `menu-saas-platform` → Paramètres du projet → Tes applications

### Pour control-app (`com.menupro.control`)
1. Ajouter une app Android avec le package `com.menupro.control` si pas encore fait
2. Télécharger `google-services.json`
3. Copier dans **deux endroits** :
   - `control-app/google-services.json`
   - `control-app/android/app/google-services.json`

### Pour server-app (`com.menupro.serveur`)
1. Ajouter une app Android avec le package `com.menupro.serveur` si pas encore fait
2. Télécharger `google-services.json`
3. Copier dans **deux endroits** :
   - `server-app/google-services.json`
   - `server-app/android/app/google-services.json` (créé après `cap add android`)

Les templates sont dans `*.TEMPLATE` dans chaque dossier.

---

## Build control-app (projet Android déjà copié depuis H:)

Le projet Android existe déjà dans `control-app/android/`.
Il faut juste mettre à jour les assets web et le `google-services.json`.

```bash
cd "G:\Mon Drive\menu-saas-platform\control-app"

# 1. Copier index.html dans les assets Android
copy index.html android\app\src\main\assets\public\index.html

# 2. Copier le google-services.json téléchargé depuis Firebase
copy google-services.json android\app\google-services.json

# 3. Ouvrir dans Android Studio pour builder l'APK
npx cap open android
# → Android Studio : Build > Build APK(s) ou Generate Signed APK
```

---

## Build server-app (projet Android à initialiser)

Le projet Android doit être créé depuis zéro avec Node.js 18/20.

```bash
cd "G:\Mon Drive\menu-saas-platform\server-app"

# 1. Installer les dépendances (avec Node.js 18 ou 20)
npm install

# 2. Initialiser le projet Android
npx cap add android

# 3. Copier le google-services.json téléchargé depuis Firebase
copy google-services.json android\app\google-services.json

# 4. Synchroniser les assets web
npx cap sync android

# 5. Ouvrir dans Android Studio
npx cap open android
# → Android Studio : Build > Build APK(s) ou Generate Signed APK
```

---

## Sync rapide (mise à jour web assets uniquement)

Quand tu modifies `index.html`, pas besoin de rebuild l'APK complet.
Sync + rebuild depuis Android Studio suffit :

```bash
# control-app
copy "G:\Mon Drive\menu-saas-platform\control-app\index.html" "G:\Mon Drive\menu-saas-platform\control-app\android\app\src\main\assets\public\index.html"

# server-app (après cap add android)
cd "G:\Mon Drive\menu-saas-platform\server-app"
npx cap sync android
```

---

## Checklist avant release APK

- [ ] `google-services.json` SaaS dans `android/app/` des deux apps
- [ ] Firebase RTDB rules configurées pour `menu-saas-platform`
- [ ] Au moins un restaurant créé dans RTDB (`restaurants/demo/config/...`)
- [ ] Vercel API déployée avec `FIREBASE_SERVICE_ACCOUNT` configuré
- [ ] Test FCM : envoyer une commande de test, vérifier réception sur server-app

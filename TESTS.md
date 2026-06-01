# TESTS — Menu SaaS Platform

Protocole de test avant mise en production.
À exécuter avec au moins 2 restaurants : `demo` et un vrai (ex: `cafe-oran`).

---

## Prérequis

- [x] Vercel déployé : `https://menu-saas-platform.vercel.app/` avec `FIREBASE_SERVICE_ACCOUNT` configuré
- [x] Firebase RTDB `menu-saas-platform` accessible
- [x] Restaurant `demo` créé dans RTDB avec mot de passe `MenuPro2026`
- [x] APK Control : `builds/control-app/debug/MenuProControl-v1.0.apk`
- [ ] APK Server installé sur un téléphone Android staff (Redmi Note 13 5G)

---

## 1. Isolation multi-restaurants

- [ ] Ouvrir `index.html?rid=demo` et `index.html?rid=cafe-oran` dans deux onglets
- [ ] Vérifier que les menus sont distincts (données Firebase séparées)
- [ ] Passer une commande sur `demo` → vérifier qu'elle n'apparaît PAS dans `cafe-oran`
- [ ] Vérifier les clés localStorage : `demo_cart_v1` vs `cafe-oran_cart_v1` (DevTools > Application)

---

## 2. Login admin

- [ ] Ouvrir `admin.html?rid=demo`
- [ ] Login screen affiche le nom du restaurant (depuis Firebase `menu/info/name`)
- [ ] Mot de passe incorrect → message d'erreur
- [ ] Mot de passe correct → accès admin
- [ ] Vérifier dans Firebase : `restaurants/demo/sessions/{sessionId}` créé
- [ ] Recharger la page → toujours connecté (session valide)
- [ ] Logout → `sessions/{sessionId}` supprimé dans Firebase

---

## 3. Révocation de session (control-app)

- [ ] Se connecter à admin.html
- [ ] Dans Firebase Console, supprimer manuellement `restaurants/demo/sessions/{sessionId}`
- [ ] Recharger admin.html → redirection vers login screen (session révoquée)

---

## 4. Menu client

- [ ] Ouvrir `index.html?rid=demo` → menu s'affiche (catégories + produits)
- [ ] Thème visuel appliqué correctement
- [ ] Recherche fonctionne
- [ ] Langues disponibles selon `config/enabledLangs`
- [ ] Mode sombre / clair toggle

---

## 5. Système de tables QR

- [ ] Dans admin.html → section "Tables & QR codes" visible (si orderUI activé)
- [ ] Saisir 5 tables → clic "Générer"
- [ ] Firebase : `restaurants/demo/config/tableCount` = 5
- [ ] 5 URLs affichées avec bouton "Copier"
- [ ] Ouvrir `index.html?rid=demo&table=3` → chip "📍 Table 3" apparaît dans nav
- [ ] Commande envoyée sans prompt table (directement Table 3)

---

## 6. QR Generator

- [ ] Ouvrir `qr-generator.html?rid=demo`
- [ ] Saisir 5 tables → clic "Générer" → 5 QR codes affichés
- [ ] Sélectionner 3 QR codes → "Exporter PDF" → téléchargement PDF
- [ ] Vérifier QR codes scannables avec un téléphone
- [ ] URL scannée : `index.html?rid=demo&table=N`

---

## 7. Flow commande complet

- [ ] Ouvrir `index.html?rid=demo` (mode commande activé)
- [ ] Ajouter 2-3 produits au panier
- [ ] Envoyer commande (Table 2 via prompt ou QR)
- [ ] Firebase : `restaurants/demo/orders/{orderId}` créé avec status `pending`
- [ ] Server-app (téléphone) : commande apparaît dans liste
- [ ] Notification FCM reçue sur le téléphone
- [ ] Admin : commande visible en temps réel dans "Commandes"
- [ ] Admin : changer statut → "En cours" puis "Terminée"
- [ ] Firebase : `restaurants/demo/logs/orders/{orderId}` créé

---

## 8. Notifications FCM

- [ ] APK server-app installé, `rid` configuré (saas_rid en localStorage)
- [ ] Token FCM enregistré dans `restaurants/demo/devices/{deviceId}`
- [ ] Envoyer commande → notification reçue sur server-app dans < 5 secondes
- [ ] Firebase : `restaurants/demo/logs/notifications/{ts}` créé

---

## 9. Sonnette

- [ ] Appuyer sur le bouton sonnette dans index.html
- [ ] Server-app : alerte visuelle + vibration
- [ ] Firebase : `restaurants/demo/calls/lastCall` mis à jour

---

## 10. Feature flags (control-app)

- [ ] Désactiver "Système de tables QR" (`tableSystem = false`)
- [ ] Admin : section Tables disparaît
- [ ] Désactiver "Commande QR" (`qrOrdering = false`)
- [ ] Ouvrir `index.html?rid=demo&table=3` → chip Table absent, prompt apparaît
- [ ] Réactiver les deux flags → fonctionnement normal

---

## 11. Cloudinary — Upload photos

- [ ] Dans admin : ouvrir un produit → upload photo
- [ ] Photo uploadée dans Cloudinary dossier `/{rid}/`
- [ ] URL retournée stockée dans Firebase `menu/items/{id}/photo`
- [ ] Photo visible dans index.html côté client

---

## 12. Logs

- [ ] Login → `restaurants/demo/logs/actions/{ts}` type `login`
- [ ] Changement statut commande → `logs/actions/{ts}` type `order_status`
- [ ] Erreur JS intentionnelle (console) → `logs/errors/{ts}`
- [ ] Notification → `logs/notifications/{ts}`

---

## 13. Rétention automatique (server-app)

- [ ] `restaurants/demo/config/retention/orders` configuré (ex: 604800000 = 7 jours)
- [ ] Les commandes de plus de 7 jours sont supprimées automatiquement

---

## Résultat

| Test | Demo | Cafe Oran |
|------|------|-----------|
| Isolation données | ☐ | ☐ |
| Login / session | ☐ | ☐ |
| Menu client | ☐ | ☐ |
| Flow commande | ☐ | ☐ |
| FCM notifications | ☐ | ☐ |
| Tables + QR | ☐ | ☐ |
| Cloudinary upload | ☐ | ☐ |
| Feature flags | ☐ | ☐ |
| Logs | ☐ | ☐ |

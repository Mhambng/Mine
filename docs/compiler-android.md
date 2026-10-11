# Compiler Pépin Sprint pour Android

Le jeu est un site HTML/JavaScript (`pepin-sprint/`) empaqueté avec **Capacitor 8** (`app/`).
Le projet Android natif est dans `app/android/`. Il s'ouvre et se compile avec Android Studio.

> Ce projet n'a pas pu être compilé dans l'environnement où il a été préparé, faute de SDK Android.
> La première compilation se fait sur ton ordinateur avec les étapes ci-dessous.

## 1. Installer les outils (une seule fois)

- **Node.js** 22 ou plus récent : https://nodejs.org
- **Android Studio** (version récente) : https://developer.android.com/studio. Il installe le SDK Android et un JDK.
- Un téléphone Android avec le **mode développeur** et le **débogage USB** activés, ou un émulateur créé dans Android Studio.

## 2. Préparer le projet

```bash
cd app
npm install            # installe Capacitor et les plugins (pub, achats, vibrations…)
npx cap sync android   # copie le jeu (../pepin-sprint) dans le projet Android
npx cap open android   # ouvre Android Studio
```

À relancer après chaque modification du jeu : `npx cap sync android`.

## 3. Tester sur un téléphone

Dans Android Studio, choisis ton téléphone en haut, puis clique sur ▶ (Run).

À vérifier :

- [ ] Le jeu démarre en paysage, en plein écran, sans barre système.
- [ ] Le jeu passe en pause quand on reçoit un appel ou qu'on change d'application.
- [ ] Le bouton retour Android ferme les panneaux, met en pause, puis quitte.
- [ ] La pub de **test** s'affiche avec la deuxième chance. AdMob affiche un bandeau « Test Ad ».
- [ ] En mode avion, le jeu fonctionne et la pub échoue proprement avec un message.
- [ ] Les vibrations fonctionnent, et le réglage les coupe bien.
- [ ] Le jeu reste fluide sur un téléphone modeste (2 à 3 Go de RAM). La qualité baisse toute seule si besoin.

## 4. Remplacer les identifiants de test (avant la publication seulement)

| Quoi | Où | Valeur actuelle |
|---|---|---|
| ID d'application AdMob | `app/android/app/src/main/AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`) | ID de test Google |
| ID du bloc d'annonces récompensées | `pepin-sprint/js/config.js` → `monetization.admob.rewardedAndroid` | ID de test Google |
| Mode test AdMob | `pepin-sprint/js/config.js` → `monetization.admob.testing` | `true` → mettre `false` |
| Clé publique RevenueCat Android | `pepin-sprint/js/config.js` → `monetization.revenuecat.apiKeyAndroid` | vide (achats désactivés) |

**Dans la console AdMob :**

1. Crée l'application.
2. Crée **un seul** bloc d'annonces de type **Avec récompense**.
3. Dans *Paramètres de l'application*, déclare que l'application est **destinée aux enfants**.
4. Règle la classification maximale du contenu sur **G (tout public)**.

**Dans la Google Play Console :** crée trois **produits intégrés** (« achats uniques »), avec ces identifiants **exacts** :

| Identifiant | Nom | Prix suggéré |
|---|---|---|
| `no_ads` | Supprimer les pubs | 2,99 € |
| `pack_cosmique` | Pack Cosmique | 1,99 € |
| `pack_royal` | Pack Royal | 1,99 € |

Le jeu affiche toujours le prix renvoyé par le store, dans la devise du joueur.

**Dans RevenueCat :**

1. Crée le projet.
2. Relie l'application Google Play (avec un compte de service).
3. Importe les 3 produits.
4. Copie la **clé publique Android** dans `config.js`.

> **À vérifier avant de choisir RevenueCat :** le jeu vise des moins de 13 ans, donc tous les SDK de l'application doivent respecter le programme Familles de Google Play. RevenueCat n'est pas un SDK publicitaire, mais il faut le déclarer dans la section *Sécurité des données*. Si tu préfères n'avoir aucun service tiers pour les achats, on peut remplacer RevenueCat par Google Play Billing en direct. Il suffit d'écrire un nouveau fournisseur dans `pepin-sprint/js/monetization-native.js`, sans toucher au reste du jeu.

## 5. Créer la clé de signature (une seule fois, à conserver précieusement)

```bash
keytool -genkey -v -keystore pepin-sprint-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- **Ne mets jamais ce fichier dans Git.** Les fichiers `*.jks` et `*.keystore` sont déjà ignorés.
- Garde une copie de sauvegarde et le mot de passe dans un gestionnaire de mots de passe.
- Active la **signature d'application par Google Play** à la première mise en ligne. Ce fichier ne sert alors qu'à *envoyer* les versions : s'il est perdu, Google peut le réinitialiser.

## 6. Produire l'AAB signé

Dans Android Studio : **Build → Generate Signed App Bundle / APK → Android App Bundle**. Choisis le fichier `.jks`, puis la variante **release**.

Le fichier est créé ici : `app/android/app/release/app-release.aab`.

**À chaque nouvelle version :**

1. Augmente `versionCode` (1, 2, 3…), qui sert au store, et `versionName` (« 1.0.1 »…), qui est affiché aux joueurs. Les deux sont dans `app/android/app/build.gradle`.
2. Mets aussi à jour `CONFIG.app.version` dans `pepin-sprint/js/config.js`.

## 7. Taille de l'application

Le jeu ne contient **aucune image ni aucun son** : tout est dessiné et synthétisé par le code. Les seuls fichiers lourds sont deux polices (40 Ko).

L'essentiel du poids vient des SDK AdMob et Google Play Billing. Le format AAB permet à Google Play de n'envoyer à chaque téléphone que ce dont il a besoin.

## 8. Icônes, écran de démarrage, captures

Ils sont déjà générés à partir du personnage du jeu. Pour les refaire après un changement de style :

```bash
node tools/make-icons.js         # icônes Android, écran de démarrage, store/icone-512.png, image de présentation
node tools/make-screenshots.js   # store/captures/*.png (1920×1080)
```

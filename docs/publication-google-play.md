# Checklist de mise en ligne sur Google Play

Coche au fur et à mesure. Les étapes techniques (compilation, signature) sont dans [compiler-android.md](compiler-android.md).

## 1. Compte développeur

- [ ] Créer un compte sur https://play.google.com/console (frais unique de 25 $).
- [ ] Vérifier son identité. Les **comptes personnels** créés récemment doivent aussi faire un **test fermé** avec un nombre minimum de testeurs pendant une durée minimale avant de pouvoir publier en production (voir la section 8). Les règles exactes sont affichées dans la Play Console.
- [ ] Renseigner une adresse e-mail de contact pour les joueurs. Elle sera publique.

## 2. Créer l'application

- [ ] *Créer une application* : nom **Pépin Sprint**, langue par défaut **français**, type **Jeu**, **Gratuit**.
- [ ] Nom de package : `com.mhambng.pepinsprint`. Il est **définitif** une fois publié : change-le avant si tu veux un autre nom (dans `app/capacitor.config.json` et dans le dossier `app/android`).

## 3. Build signé

- [ ] AAB signé en **release** (voir compiler-android.md, étapes 5 et 6).
- [ ] Identifiants AdMob et RevenueCat **réels** dans le code, et `admob.testing: false`.
- [ ] `versionCode` incrémenté.
- [ ] Testé sur au moins un vrai téléphone, idéalement un modèle d'entrée de gamme.

## 4. Fiche du store

Les textes prêts à copier sont dans [fiche-store.md](fiche-store.md).

- [ ] Nom (30 caractères max), description courte (80) et description complète (4000).
- [ ] Icône 512×512 : `store/icone-512.png`.
- [ ] Image de présentation 1024×500 : `store/image-de-presentation-1024x500.png`.
- [ ] Au moins 2 captures d'écran de téléphone : `store/captures/` (1920×1080).
- [ ] Catégorie : **Jeux > Action** (ou Arcade). Tags : course, enfants, simple.
- [ ] Coordonnées : e-mail obligatoire, site web facultatif.

## 5. Politique de confidentialité (URL obligatoire)

- [ ] Compléter [politique-de-confidentialite.md](politique-de-confidentialite.md) : nom de l'éditeur et e-mail de contact.
- [ ] La publier à une **adresse publique** : par exemple GitHub Pages, ou une page de ton site.
- [ ] Coller l'URL dans la Play Console (*Règles et programmes > Contenu de l'application > Règles de confidentialité*).
- [ ] Mettre la même URL dans `pepin-sprint/js/config.js` → `app.privacyUrl`. Elle est affichée dans les réglages et au premier lancement.

## 6. Contenu de l'application (Play Console > Règles et programmes)

- [ ] **Public cible et contenu** : cocher les tranches d'âge **6-8**, **9-12** et **13-15** (et 16-17 si tu veux). Comme le jeu vise des moins de 13 ans, il est soumis aux **règles du programme Familles**.
  - Le jeu ne doit pas « attirer involontairement » d'autres publics : la fiche doit rester honnête.
  - Tous les SDK publicitaires doivent être **certifiés Familles**. Google AdMob l'est, à condition d'être configuré pour les enfants, ce qui est déjà fait dans le code.
  - Aucune collecte de l'identifiant publicitaire (AAID) : la permission `AD_ID` est déjà **retirée** dans le manifeste.
- [ ] **Annonces** : répondre **Oui, l'application contient des annonces**. Seulement des annonces récompensées, choisies par le joueur.
- [ ] **Classification du contenu** (questionnaire IARC) : pas de violence réaliste, pas de langage grossier, pas de jeu d'argent.
  - Déclarer les **achats intégrés**.
  - Déclarer qu'il n'y a **pas** d'échange entre utilisateurs.
  - Résultat attendu : PEGI 3 ou équivalent.
- [ ] **Sécurité des données** : voir le tableau ci-dessous.
- [ ] **Accès à l'application** : aucune connexion n'est nécessaire.
- [ ] **Application gouvernementale, financière, santé** : non.

### Réponses suggérées pour « Sécurité des données »

À **vérifier** avec la documentation à jour de chaque SDK au moment de remplir le formulaire.

| Question | Réponse suggérée |
|---|---|
| Collectez-vous ou partagez-vous des données ? | Oui, via des SDK tiers (AdMob, RevenueCat) |
| Données chiffrées en transit ? | Oui |
| Les utilisateurs peuvent-ils demander la suppression ? | Oui (désinstaller supprime la progression ; demande par e-mail pour les données des SDK) |
| Identifiants de l'appareil | AdMob : identifiants techniques pour diffuser la pub et lutter contre la fraude, **pas** d'identifiant publicitaire |
| Historique d'achats | RevenueCat : pour valider et restaurer les achats |
| Diagnostics | Selon les SDK (rapports de plantage AdMob) |
| Position, contacts, photos, messages | Non |

## 7. Produits intégrés

- [ ] Créer `no_ads`, `pack_cosmique` et `pack_royal` (voir compiler-android.md, étape 4) et les **activer**.
- [ ] Les importer dans RevenueCat.
- [ ] Ajouter ton compte Google comme **testeur de licence** (Paramètres > Tests de licence), pour acheter sans être débité pendant les tests.

## 8. Test fermé avant la production

- [ ] *Tests > Test fermé* : créer une piste et inviter des testeurs (famille, amis) par e-mail ou via un Google Groupe.
- [ ] Envoyer l'AAB, puis attendre la validation de Google (de quelques heures à quelques jours).
- [ ] Faire jouer les testeurs **pendant la durée demandée** par Google (affichée dans la Play Console pour les comptes personnels récents) et recueillir leurs retours.
- [ ] Vérifier en conditions réelles :
  - la pub de test ;
  - un achat de test, puis la **restauration** après réinstallation ;
  - le mode avion ;
  - la pause pendant un appel.

## 9. Production

- [ ] *Production > Créer une version*, envoyer l'AAB testé, rédiger les notes de version (« Première version ! »).
- [ ] Choisir les pays (France, Belgique, Suisse, Canada… selon la langue).
- [ ] Envoyer pour examen. La première revue d'une application pour enfants peut prendre plusieurs jours.

## 10. Après la sortie

- [ ] Surveiller *Qualité > Android vitals* (plantages, ANR, lenteurs).
- [ ] Répondre aux avis.
- [ ] Pour chaque mise à jour : `versionCode` +1, nouveau test fermé si le changement est important.

---

## App Store (iOS) : plus tard, sur demande

À prévoir quand tu voudras publier sur iPhone :

- un Mac avec Xcode ;
- un compte Apple Developer (99 $/an) ;
- `npx cap add ios`.

Point d'attention : la **catégorie Enfants** d'Apple est plus stricte. La publicité et les services tiers y sont très encadrés, et une porte parentale est exigée avant tout lien sortant ou achat. Il faudra revoir la pub AdMob pour cette catégorie.

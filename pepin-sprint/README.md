# Pépin Sprint

Runner infini en HTML/JavaScript, sans dépendance ni étape de compilation.

## Jouer

Ouvre `index.html` dans un navigateur, par un simple double-clic.

- Espace, flèche du haut, W ou toucher l'écran : sauter. On peut faire un double saut. Garder appuyé fait sauter plus haut.
- Flèche du bas, S ou glisser le doigt vers le bas : glissade (en l'air : plongeon puis glissade).
- P ou Échap : pause. Le jeu se met aussi en pause tout seul quand la page passe en arrière-plan.

## Régler le jeu

Tous les réglages sont dans `js/config.js` : saut, vitesse, aides au saut, tremblements, caméra, particules et son.

Pour régler en direct avec des curseurs, ouvre `index.html#reglages`. Les changements ne sont pas sauvegardés : recopie les valeurs qui te plaisent dans `config.js`.

## Organisation

Les scripts sont chargés dans cet ordre par `index.html` :

| Fichier | Rôle |
|---|---|
| `js/config.js` | Tous les réglages |
| `js/util.js` | Petits outils (DOM, hasard, formatage) |
| `js/catalog.js` | Cosmétiques et palettes des décors |
| `js/save.js` | Sauvegarde locale |
| `js/audio.js` | Sons synthétisés (provisoires) |
| `js/scene.js` | Dessin du décor |
| `js/character.js` | Dessin du personnage et des chapeaux |
| `js/particles.js` | Particules et traînées |
| `js/feel.js` | Tremblement, micro-pause, caméra, ressort d'étirement |
| `js/patterns.js` | Séquences d'obstacles conçues à la main (placées dans le temps, en secondes) |
| `js/difficulty.js` | Alternance zones calmes / intenses, choix de la séquence suivante |
| `js/powerups.js` | Aimant, bouclier, turbo |
| `js/combo.js` | Combo, multiplicateur, « Frôlé ! », « Série ! » |
| `js/biomes.js` | Zones traversées pendant la course (changement tous les 600 m) |
| `js/game.js` | Boucle de jeu, saut, glissade, collisions, rendu, HUD |
| `js/ui.js` | Écrans d'accueil, de pause et de fin |
| `js/input.js` | Clavier, souris, écran tactile |
| `js/shop.js` | Boutique |
| `js/debug.js` | Panneau `#reglages` |
| `js/main.js` | Démarrage |

## Fichier unique

`python3 tools/bundle.py` regroupe tout dans `dist/pepin-sprint.html`, un fichier autonome facile à partager.

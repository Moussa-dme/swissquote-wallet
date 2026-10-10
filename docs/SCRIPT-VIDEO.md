# Script de la vidéo de démo

> Durée visée : **≈ 4 min 30** (version courte de 3 min en section 6). Le brief demande que « la démo raconte une histoire claire » et que **les parties simulées soient étiquetées** : le script le respecte. Les textes dits sont en français, à traduire si la vidéo doit être en anglais.

**Fil rouge :** un client Swissquote crée son wallet, **perd son téléphone**, le **récupère**, et pendant ce temps **un attaquant est refusé**. Chaque écran sert à montrer l'un des 6 sujets du brief.

---

## 1. Avant d'enregistrer : la préparation (≈ 20 min)

### L'environnement
- [ ] Les **deux serveurs tournent** (voir `DEMARRAGE.md`, étape 4) : l'app (port 3000) et le faux serveur Swissquote (port 4000).
- [ ] **Navigation propre** : crée un **nouveau profil Chrome** (icône de profil → « Ajouter ») et utilise **Safari en fenêtre privée** pour l'autre rôle. Cela évite de filmer tes onglets personnels, tes favoris et les passkeys d'autres comptes.
- [ ] **Ne jamais filmer** : `.env.local`, le tableau de bord ZeroDev, un token GitHub.
- [ ] **Ne pas déranger** activé (ne pas être interrompu par une notification), batterie branchée.
- [ ] Texte lisible : zoom du navigateur à **125 %**, fenêtres côte à côte (Safari à gauche, Chrome à droite) ou plein écran selon la scène.
- [ ] Outil d'enregistrement : **⌘ + Maj + 5** (enregistrer tout l'écran) ou QuickTime. Enregistre **par scènes**, tu les assembleras après (iMovie).

### Les données de départ (à préparer HORS caméra)
Choisis **un nom neuf** pour la vidéo, par exemple **`Léa`**. Fais **hors caméra** :
1. Safari : **Créer mon wallet** (nom `Léa`).
2. Chrome `/guardian` : enregistrer l'**appareil de secours** ; Chrome privé `/guardian` : enregistrer le **contact**.
3. Safari, **Mode avancé** : installer la récupération avec un **délai de 20 secondes** (pour ne pas attendre à l'écran).
4. Envoyer des **USDC de test** au wallet depuis `faucet.circle.com` (Ethereum Sepolia, USDC), attendre qu'ils arrivent (≈ 20).
5. Tout vérifier une fois : un petit paiement de 1 USDC passe.

> Si un état se salit pendant les essais, recommence avec un **nouveau nom** (`Léa2`…) : c'est plus rapide que de réparer.

### Les scènes qu'on filmera en direct vs. celles déjà prêtes
| Scène | État nécessaire | À filmer |
|---|---|---|
| Création du wallet | Aucun | En direct, **avec un autre nom** que `Léa` (ex. `Mia`) pour montrer le vrai geste |
| Protection, paiements, compte Swissquote | Wallet `Léa` prêt | En direct |
| Perte et récupération | Wallet `Léa` prêt, récupération installée | En direct (c'est le moment fort) |
| Applications (dApps), frais | Wallet `Léa` récupéré ou connecté | En direct, court |

---

## 2. Le déroulé

| Temps | Écran | Action | Ce qu'on dit |
|---|---|---|---|
| **0:00 → 0:20** | Slide ou page d'accueil | Titre : « Swissquote Wallet. Leurs clés, leur contrôle, à un pas de leur compte Swissquote. » | « Aujourd'hui, un client Swissquote qui veut garder lui-même ses cryptos doit les retirer vers un wallet externe, et quitter la banque. Notre wallet lui permet de garder ses clés *et* de rester client. » |
| **0:20 → 0:50** | Accueil (Safari) | Écrire `Mia`, **Créer mon wallet**, Touch ID. L'écran passe en « Bonjour Mia », « 🔒 Protégé par Touch ID », adresse. | « Pas de phrase secrète : Touch ID. La clé est générée dans la puce de l'appareil et n'en sort jamais. Swissquote ne la voit pas, et ne peut pas déplacer les fonds. » |
| **0:50 → 1:20** | Changer pour le wallet `Léa` ; **Mode avancé → Récupération** | Montrer « Récupération activée ✅ », les 3 gardiens : appareil de secours, contact, **Swissquote (MOCK)**. | « Pour ne pas perdre l'accès, le client désigne trois gardiens. **Deux sur trois** suffisent à retrouver le wallet. Swissquote en fait partie, mais **seule, elle ne peut rien** : elle n'a qu'une voix. C'est la blockchain qui l'impose, pas nous. » |
| **1:20 → 1:55** | **Envoyer des USDC** (Léa) | 1) `1` USDC, **Vérifier** : lire le résumé, **Envoyer (Touch ID)**. 2) `8` USDC, **Vérifier** : « GROS montant », **Demander la confirmation** ; en split écran, Chrome `/guardian` (appareil de secours) : **Confirmer** ; Touch ID. | « Les frais sont payés par Swissquote : le client n'a pas besoin d'ETH. Petit montant : Touch ID seul. Gros montant : Touch ID **et** la confirmation d'un second appareil. Avant de signer, un résumé en langage clair et une simulation. » |
| **1:55 → 2:10** | Même écran | Coller l'**adresse signalée** (bouton « adresse signalée (MOCK) »), **Vérifier** : avertissement rouge. | « Si l'adresse est signalée, Swissquote **avertit mais ne bloque pas** : le client reste maître de ses fonds. » |
| **2:10 → 2:30** | **Mode avancé → Compte Swissquote** | Se connecter `CH-1001` / `demo1234`, **Vers mon wallet** (refusé), **Prouver que ce wallet m'appartient (Touch ID)**, **Vers mon wallet** (autorisé). | « Travel Rule : la banque n'envoie vers un wallet externe qu'après avoir vérifié qui le possède. Le wallet signe un message ; Swissquote vérifie la signature sur la blockchain, sans jamais voir de clé. » |
| **2:30 → 2:45** | Écran de Safari (wallet de Léa) | Faire un geste : « je perds mon téléphone ». Basculer sur Chrome. | « Maintenant, le client perd son téléphone. » |
| **2:45 → 3:25** | Chrome `/recover` | Nom `Léa`, **Créer un nouveau passkey et demander la récupération** (Touch ID). En split écran, Safari : l'encadré rouge **« Une récupération est en cours »** avec le compte à rebours et le bouton **Annuler**. | « Sur son nouvel appareil, il crée un nouveau passkey. Sur l'ancien, le propriétaire est **alerté** et peut annuler pendant le délai : 48 heures en production, 20 secondes ici. » |
| **3:25 → 3:50** | Chrome `/recover` → carte Swissquote ; `/desk` | **Simuler un attaquant (SMS / e-mail volés)** : refus rouge. Puis `/desk` : **Pièce d'identité contrôlée, client présent**, retour, **Obtenir l'approbation**. | « Un attaquant qui aurait volé le numéro et l'e-mail ? **Refusé** : un SMS ou un e-mail ne suffit jamais. Swissquote exige une vérification **en personne**. Ici, l'agent est simulé. » |
| **3:50 → 4:15** | Chrome privé `/guardian` (contact) | **Approuver**, attendre la fin du délai, **Finaliser**. | « Le contact approuve : deux gardiens sur trois. Remarque : même sans Swissquote, appareil de secours et contact auraient suffi. » |
| **4:15 → 4:35** | Chrome `/recover` | « 🎉 Récupération terminée » → **Me connecter avec mon nouveau passkey** → interface du wallet : même adresse, même solde ; un petit paiement. Retour sur Safari : **Envoyer une transaction de test** : **refusé**. | « Même adresse, mêmes fonds, nouvelle clé. Et l'ancien appareil est maintenant **bloqué par la blockchain**. » |
| **4:35 → 4:55** | Mode avancé → **Applications** ; guichet `/desk` | Vérifier la « Démo NFT » (tout vert). Sur `/desk` : **Simuler une mise à jour du contrat**, revérifier : **« Appel bloqué »**. | « Bonus : avant d'appeler une application, le wallet vérifie qu'elle est approuvée **et que son code n'a pas changé** : une même adresse ne garantit pas le même code. » |
| **4:55 → 5:20** | Slide de clôture ou `PROJET.md` / schéma d'architecture | Montrer le schéma (`architecture.html`) : vert = réel, orange = simulé. | « Ce qui est réel : le wallet, les passkeys, la récupération imposée par la blockchain, les transactions. Ce qui est simulé et étiqueté MOCK : la banque, l'agence, les comptes. Limites assumées : le délai est appliqué hors chaîne ; en production, il le serait sur la blockchain. » |
| **5:20 → 5:35** | Slide | Business en une phrase | « Pour Swissquote : garder les clients qui partaient, un service de récupération payant, et un risque faible puisque la banque n'a aucune clé. Le code a été écrit avec Claude Code, ce qui est déclaré dans le dossier. » |

> Total ≈ **5 min 30**. Si c'est trop long, passe à la **version courte** (section 6).

---

## 3. Mise en scène : trois conseils
1. **Écran partagé** : pour les scènes à deux appareils (annulation, récupération), place Safari et Chrome **côte à côte** : le spectateur voit ce qui se passe sur chacun en même temps.
2. **Pointe avec la souris** ce dont tu parles (le « 🔒 Protégé par Touch ID », le « MOCK », la ligne rouge d'avertissement).
3. **Ne dis jamais « ça marche tout seul »** : dis ce qui est réel et ce qui est simulé. Le brief le demande.

## 4. Plan B : si quelque chose plante en filmant
| Problème | Solution |
|---|---|
| Touch ID refuse ou plante | Recommence la scène (la vidéo se monte par scènes), garde la meilleure prise. |
| Erreur « Signature invalide » sur le nouvel appareil | Mauvais passkey choisi : choisis celui qui s'appelle `<nom>-recovered-…`. |
| « Serveur Swissquote injoignable » | Relance le terminal 2 (`DEMARRAGE.md`). |
| Un état est « salli » | Utilise un nom neuf (`Léa2`). |
| Le délai est trop long à l'écran | Coupe au montage, ou mets le délai à 10 secondes. |
| Le faucet n'a pas livré d'USDC | Fais la scène de paiement sur un wallet déjà financé (hors caméra). |

## 5. Après l'enregistrement
- [ ] Revois la vidéo **en entier** une fois, en vérifiant qu'on ne voit **aucun secret** (adresses ZeroDev, `.env.local`, tokens) ni onglet personnel.
- [ ] Ajoute des **sous-titres ou un titre par scène** (« 1. Créer », « 2. Protéger », « 3. Récupérer ») si le temps le permet : c'est ce qui rend l'histoire lisible.
- [ ] Exporte en **MP4** (1080p) ; garde aussi une copie d'**un extrait court** (30 secondes) pour la page du projet.

## 6. Version courte (≈ 3 min)
Garde, dans cet ordre : **0:00-0:20** (problème) → **0:20-0:50** (création) → **0:50-1:20** (3 gardiens) → **1:20-1:55** (petit et gros paiement) → **2:45-3:25** (perte et alerte) → **3:25-3:50** (attaquant refusé) → **3:50-4:35** (récupération et ancien appareil bloqué) → **4:55-5:20** (réel et simulé).
Coupe : l'adresse signalée, la liaison de compte, les dApps. Ces éléments restent visibles dans le dossier écrit et dans le tutoriel.

## 7. Pitch en direct (si demandé) : l'ossature en 5 phrases
1. **Le problème** : « Pour garder ses cryptos soi-même, un client doit quitter la banque. »
2. **Notre idée** : « Leurs clés, leur contrôle, à un pas de leur compte Swissquote. »
3. **La preuve** : « Création, paiement, perte du téléphone, récupération : tout marche de bout en bout, sur une vraie blockchain de test. »
4. **Le point fort** : « Swissquote seule ne peut rien : une voix sur trois, imposée par la blockchain, et un attaquant avec le numéro et l'e-mail est refusé. »
5. **L'honnêteté** : « Ce qui est simulé est étiqueté, et nos limites sont écrites. »

# Projet : Swissquote Self-Custody Wallet — Hackathon BSA EPFL 2026

## Le challenge (track Swissquote Wallet)
Construire le wallet self-custody que Swissquote pourrait réellement lancer pour ses clients : le client garde le contrôle de ses cryptos et de ses clés, tout en gardant la sécurité, la simplicité, la conformité et l'UX d'une banque suisse. Aujourd'hui, un client qui veut le self-custody doit sortir ses actifs vers un wallet externe et quitter l'écosystème Swissquote. Objectif : « leurs clés, leur contrôle, tout en restant à un pas de leur compte Swissquote ».

Exigences :
- Démontrer le cycle de vie complet : création du wallet → authentification → signature de transaction → perte d'accès → récupération.
- Définir et défendre : un modèle de garde (custody model), un modèle de menace (threat model), l'architecture, où vivent les clés / parts de clés, comment l'utilisateur s'authentifie avant de signer.
- La récupération doit protéger l'utilisateur légitime SANS ouvrir une voie facile aux attaquants NI donner à Swissquote un contrôle non voulu sur les fonds.
- MINIMUM : la démo doit signer et envoyer une VRAIE transaction sur une blockchain (testnet accepté).
- Utiliser des librairies/SDK cryptographiques établis, ne PAS implémenter notre propre crypto.
- Ce qui ne peut pas être construit (infra bancaire, KYC, serveurs de parts de clés) peut être simulé (mock), à condition que ce soit clairement documenté et que l'architecture reste crédible.

Bonus :
- Transactions sans gas (envoyer de l'USDC sans posséder d'ETH).
- Interaction dApp conforme : liste de dApps approuvées, screening sanctions, simulation de transaction, contrôles supplémentaires pour les gros montants.
- Récupération qui distingue l'utilisateur légitime d'un attaquant ayant compromis son téléphone ou son email.
- Business case solide pour Swissquote (revenus, rétention, nouveaux clients, coûts).
- Considérations réglementaires suisses (garde, vérification de propriété du wallet) de façon techniquement crédible.

Notation : implémentation technique 35, sécurité & design de garde 20, faisabilité légale 15, business case 15, UX & pitch 15. Jusqu'à +20 bonus (gasless + dApp conforme) SEULEMENT si le parcours create → sign → recover marche de bout en bout.

## Nos choix techniques
- Wallet = smart account ERC-4337 (Kernel de ZeroDev), propriétaire = passkey (WebAuthn, Face ID / Touch ID). La clé privée reste dans la puce sécurisée de l'appareil, elle n'en sort jamais.
- Base de code : template ZeroDev `passkey-tutorial` (Next.js). Réseau : Sepolia (à confirmer avec les mentors).
- Gasless : paymaster ZeroDev (Swissquote sponsorise le gas).
- Récupération : gardiens 2-sur-3 (appareil de secours de l'utilisateur, Swissquote après re-vérification KYC simulée, contact de confiance) + délai annulable (48 h en production, réglable à ~2 min en mode démo) pendant lequel le propriétaire peut annuler. Swissquote seule ne peut ni bouger les fonds ni changer la clé. Vérifier d'abord ce que ZeroDev propose nativement pour la récupération avant de coder un module maison.
- Couche Swissquote : liaison au compte Swissquote (simulée), preuve de propriété du wallet par signature de message (EIP-1271), liste blanche de dApps, confirmation renforcée au-delà d'un seuil, simulation de transaction avant signature.
- Le Scaffold-ETH dans `bsa-hack/` sert de bac à sable si on a besoin d'un contrat Foundry maison.

## Équipe
- Moi (débutant, sur Mac) : partie technique avec Claude.
- Mon binôme : produit, modèle de menace, légal, business case, slides, pitch.

## Planning révisé (sam. 10 oct 17h → dim. 11 oct 10h, heure de Zurich)
Principe : le bonus ne compte que si créer → signer → récupérer marche de bout en bout. Ordre : récupération d'abord, extras ensuite.
- 17h00–17h45 : recherche ZeroDev (récupération/gardiens, branche `feat/example_guardian_recovery`), choix du design minimal, plan validé avec l'utilisateur. Binôme : modèle de garde + menace + business case (brouillons).
- 17h45–20h00 : JALON 2a = récupération on-chain minimale (gardiens, nouvelle clé sur un 2e appareil/navigateur).
- 20h00–20h45 : dîner/pause + point avec le binôme.
- 20h45–23h00 : JALON 2b = gardien « Swissquote » MOCK (processus séparé, stockage propre, contrôle fort simulé), délai d'annulation, scénario attaquant refusé, récupération sans Swissquote.
- **23h00 : POINT DE CONTRÔLE** : créer → signer → récupérer doit marcher. Sinon : on simplifie le design (décision à 21h30 si ça coince) et on ne touche à aucun bonus.
- 23h00–00h30 : gros vs petit montant (confirmation renforcée), liaison de compte MOCK, tableau MOCK du README. Commit + push.
- 00h30–05h00 : sommeil (l'utilisateur ; pas de travail non supervisé). 
- 05h00–06h00 : bonus seulement si le point de contrôle est vert (règles de gas fines / gas en USDC, liste blanche de dApps avec hash du code).
- **06h00 : GEL DES FONCTIONNALITÉS.**
- 06h00–08h30 : correction de bugs, README (architecture, MOCK, outils d'IA), schéma d'architecture, enregistrement de la vidéo de démo, répétition du pitch.
- 08h30–09h30 : description du projet (6 sujets + bonus + outils d'IA), push final, soumission. Marge 30 min avant la deadline de 10h00.
- Dim. ~9h : le mentor Swissquote est de retour, lui montrer la démo / poser les dernières questions.

## Règles de travail
- **Référence absolue : `swissquote-track.md` (consignes officielles du track). Ne jamais dévier de ces consignes ; si une idée ou une réponse de mentor semble s'en écarter, le signaler à l'utilisateur avant d'agir. Relire ce fichier au début de chaque session et avant chaque grande décision.**
- Parler français, expliquer simplement (utilisateur débutant). Demander avant toute commande qui installe, supprime ou modifie quelque chose hors du projet.
- Priorité absolue : create → sign → recover de bout en bout avant tout bonus.
- Faire un commit Git après chaque étape qui marche, avec un message clair.
- Jamais de secrets dans Git : clés API dans `.env.local`, vérifier que `.env*` est dans `.gitignore`.
- Testnet uniquement, jamais de vraie clé ni de vraie phrase secrète.
- Tout ce qui est simulé doit être marqué « MOCK » dans le code et listé dans le README.
- Avancer par petites étapes testables ; dire quoi tester dans le navigateur après chaque changement.
- Mettre à jour le « Journal de progression » ci-dessous après chaque étape importante.

## Structure du dossier (`~/Documents/hackathonBSA`)
- `bsa-hack/` : Scaffold-ETH 2 (Next.js + Foundry), a son propre `.git` et AGENTS.md/CLAUDE.md. Bac à sable pour contrats maison. **Exclu du dépôt GitHub** (voir `.gitignore`).
- `passkey-tutorial/` : template ZeroDev (à cloner, voir journal).

## Exigences du brief officiel (PDF) à ne pas oublier
(Texte intégral dans `swissquote-track.md` ; ce qui suit n'est qu'un rappel.)
- Histoire de bout en bout : créer → se connecter et signer → perdre le wallet/les clés → récupérer.
- 6 sujets obligatoires : (1) modèle de garde + threat model (qui peut voler, qui peut verrouiller le client, Swissquote seule ou avec un partenaire peut-elle bouger les fonds ?), (2) diagramme d'architecture avec parties MOCK marquées, (3) création du wallet (où sont générées/stockées les clés, lien avec l'identité Swissquote), (4) authentification (montant élevé vs petit), (5) récupération, (6) business case.
- **Récupération : montrer aussi comment le client récupère ses fonds si les services Swissquote disparaissent définitivement.** Bonus si la démo refuse un attaquant qui a volé téléphone ET e-mail.
- **Un détenteur de part/gardien mocké doit tourner comme un processus séparé, avec son propre stockage ; l'app cliente ne doit jamais détenir sa part.** (Pour nous : le « gardien Swissquote » = petit serveur à part avec sa propre base.)
- Livrable : description du projet couvrant modèle de garde, menace, diagramme, Travel Rule (preuve de propriété d'un wallet externe, FINMA), business, bonus traités, **et quels outils d'IA ont été utilisés pour quoi** (à tenir à jour : Claude Code = aide à l'écriture/débogage du code, recherche doc, rédaction du journal).
- Limite à défendre : ERC-4337 = EVM seulement (le MPC marche aussi pour Bitcoin).
- Légal : si Swissquote ne peut pas bouger les fonds seule, on est plus proche d'un logiciel que d'une garde ; Swissquote + partenaire ensemble = zone grise à argumenter.

## Retours des mentors Swissquote (sam. 10 oct, après-midi)
- **Swissquote ne doit jamais avoir la clé ni aucun pouvoir sur les fonds** (point le plus important). Faux modèle : « le client s'authentifie chez Swissquote et récupère sa clé » = Swissquote devient dépositaire de clés, refusé.
- 3 gardiens, 2 sur 3, Swissquote pouvant en être un, **validé**. Démo : montrer les DEUX scénarios (récupération + attaquant bloqué, ex. SIM swap).
- **Authentification Swissquote = hors périmètre** (une simple base avec mot de passe suffit). En revanche la sécurité du backup est critique : numéro de téléphone/e-mail seuls ne suffisent JAMAIS ; il faut au moins un 2e facteur fort, idéalement physique (objet gardé en lieu sûr). Pire cas acceptable : se présenter au bureau avec pièce d'identité et signature. Défendre contre tous les scénarios (SIM swap, e-mail piraté...).
- Blocage/gel par Swissquote : les clients n'aimeraient pas. Piste du mentor : pas de droit de blocage, mais **procédure d'urgence déclenchée par le client (« runaway »)** : récupérer l'accès via le système de récupération puis transférer les fonds vite, avant le pirate. À défendre dans le pitch (pourquoi on retient ou non le blocage).
- Téléphone volé : biométrie minimum ; comment la clé est stockée sur le téléphone est important (pas un fichier texte) -> notre passkey dans la puce sécurisée répond à ça. Idée : alerte sur activité suspecte, client appelle la banque en premier.
- MPC (Swissquote cosigne toujours) = option à présenter avec avantages/inconvénients (client bloqué si Swissquote indisponible). À nous de choisir et défendre.
- Testnet : pas grave, on peut changer de plan ; transaction basique suffit. Que vérifier avant d'autoriser une opération : pas prioritaire.
- Travel Rule/destinataire : en self-custody Swissquote n'a pas besoin de connaître le destinataire (comparaison distributeur de billets). Bonus : alerte si adresse frauduleuse/sanctionnée (surveillance on-chain publique).
- **Priorité : 1) wallet fonctionnel, 2) vraie solution de récupération (point central), 3) ensuite les extras.** Expliquer d'abord wallet + backup, puis les fonctionnalités complémentaires.
- Bonus gas : payer le gas **en USDC** (paymaster ERC-20), facile et c'est un bonus. « Gas station » : Swissquote avance le gas et refacture sur le compte ; questions d'abus/contrôle/refacturation ; idée d'abonnement Gold (ex. 200 CHF/mois pour 100 tx). Pas obligatoire que Swissquote paie.
- Business : critère clé = **ratio bénéfice/risque** (une banque gère du risque). Faire un benchmark (ex. nb de 20-30 ans actifs en crypto en Suisse). Revenus possibles : % des Assets Under Custody (ex. 0,01 %), service de backup payant, abonnement gas station. Offre complémentaire (80-90 % des clients ne connaissent pas les wallets), pas un remplacement des banques ; on peut commencer avec 10 CHF. **Pas d'assurance** pour ce projet (récupération = obligation de moyens, best effort). **Facilité d'implémentation** = différenciateur (pas 600 jours de dev).
- UX : se mettre à la place de l'utilisateur ; 80 % des clients ne connaissent pas la crypto -> un clic, un téléchargement, mode basique (envoyer à un ami) + bouton « Advanced ».
- Notation bonus : 100 % + 10 % + 10 % ; **prix « Wow Effect »** pour une idée inédite et commercialisable (facultatif, ne pas se mettre la pression).
- Le mentor revient dimanche vers 9h ; un document détaillé du challenge est partagé sur le canal de discussion.

## Décisions de conception issues de ces retours (à confirmer)
- Gardiens 2/3 : (1) appareil de secours/clé physique du client, (2) contact de confiance ou clé papier, (3) « Swissquote » MOCK = serveur séparé avec sa propre base, qui ne signe qu'après un contrôle fort simulé (identité + présence en agence), jamais sur simple SMS/e-mail.
- La récupération doit marcher SANS Swissquote (2 autres gardiens) -> à démontrer.
- Pas de gel de compte par Swissquote ; à la place : procédure d'urgence initiée par le client.
- Tension à trancher : délai d'annulation (protège contre une récupération malveillante) vs rapidité (téléphone volé = l'ancienne clé reste valide pendant le délai). Mentor suggère la logique « runaway ».

## Commandes pour lancer la démo
(Tutoriel complet pour le binôme : `docs/DEMARRAGE.md`.) (2 processus + navigateurs)
- App : `cd passkey-tutorial && npm run dev` -> http://localhost:3000 (pages : `/` propriétaire, `/guardian` appareil de secours / contact, `/recover` nouvel appareil, `/desk` guichet Swissquote MOCK).
- Faux serveur Swissquote (MOCK, processus séparé, port 4000, stockage `mock-swissquote/data.json`) : `cd mock-swissquote && node --env-file=../passkey-tutorial/.env.local server.mjs`.
- Test headless de la récupération : `cd spike && node --env-file=../passkey-tutorial/.env.local flow-test.mjs` (serveur MOCK lancé).
- Coordinateur de récupération (MOCK) = routes `passkey-tutorial/app/api/recovery/[...path]/route.ts`, stockage `passkey-tutorial/.data/coordinator.json` (gitignoré).

## Journal de progression
(à mettre à jour au fil du hackathon)

- **Sam. 10 oct, ~10h** — Exploration : `bsa-hack/` présent (SE-2, node_modules installés, Git OK). `passkey-tutorial/` absent. Node v26.11.1, yarn 1.22.22, npm 11. Foundry (`forge`) non installé (inutile tant qu'on n'écrit pas de contrat). AGENTS.md + CLAUDE.md créés à la racine.
  - Fait : `passkey-tutorial` cloné (Next.js 14, @zerodev/sdk 5.5, passkey-validator 5.6, viem, Sepolia, npm).
  - Constat : le template met BUNDLER_URL / PAYMASTER_URL / PASSKEY_SERVER_URL en dur dans `app/page.tsx` (l. 20-22). Décision proposée : les lire depuis `.env.local` (ignoré par Git).
  - Fait : `npm install` OK ; `app/page.tsx` lit `NEXT_PUBLIC_BUNDLER_URL`, `NEXT_PUBLIC_PAYMASTER_URL`, `NEXT_PUBLIC_PASSKEY_SERVER_URL` depuis `.env.local` ; `.env.example` créé (`.env.local` vide créé, ignoré par Git).
  - En cours : l'utilisateur crée le projet Sepolia sur dashboard.zerodev.app et remplit `.env.local` (les URLs se copient depuis le dashboard, la doc ne donne pas de format) ; ensuite `npm run dev`.
  - Décisions : fichiers de contexte à la racine `hackathonBSA` (le dossier ne s'appelle pas `hackathon`).
  - Problème : le template `main` est un squelette (`// add code here...`), donc « Send UserOp » ne faisait rien. Décision : reprendre `app/page.tsx` de la branche `origin/completed` (package.json identique), URLs en `.env.local`, lien jiffyscan corrigé (sepolia), try/catch + alertes d'erreur ajoutés. `tsc` OK.
  - Utile pour Jalon 2 : branche `origin/feat/example_guardian_recovery` dans `passkey-tutorial` (exemple de récupération par gardiens) ; autres : `multichain/completed`, `deployed`.
  - À tester : Register (Touch ID) → Send UserOp (mint gasless Sepolia). Pas encore confirmé.
  - Git : dépôt unique à la racine `hackathonBSA/`, remote `https://github.com/Moussa-dme/swissquote-wallet.git` (privé, README initial déjà sur GitHub). `.git` hérité de ZeroDev supprimé dans `passkey-tutorial/`. `.env.local` jamais commité. Le binôme doit être ajouté en collaborateur (Settings → Collaborators).
  - Fait : premier push GitHub réussi (sam. ~11h55). Auth = Personal Access Token classique (scope `repo`) ; ne jamais le mettre dans le chat ni dans Git. Ensuite, pour envoyer : `git add -A && git commit -m "..." && git push`.
  - Bloquant Jalon 1 : « Send UserOp » → alerte « HTTP request failed ». Bundler testé OK avec curl (eth_chainId, EntryPoint 0.7, CORS OK). Alerte détaillée ajoutée (`describeError` dans page.tsx) ; en attente du texte complet de l'alerte. Pistes : paymaster / Gas Policy du dashboard, ou requête bloquée côté navigateur.
  - **JALON 1 ATTEINT (sam. ~12h)** : Register (passkey/Touch ID) → Send UserOp = mint NFT gasless sur Sepolia, confirmé on-chain (balanceOf = 1, wallet déployé, solde ETH = 0 donc gas bien sponsorisé). Wallet de test : 0xC3c8ccb5143Ce3E3B188495e552436990b1E8301 (Sepolia, testnet seulement).
  - Cause du blocage précédent : aucune Gas Policy → « userOp did not match any gas sponsoring policies ». Solution actuelle : « Sponsor all transactions » activé dans le dashboard ZeroDev (Gas Policies, Sepolia). **À remplacer** par des règles fines (Contract Policies = liste blanche de dApps, plafonds, webhook = screening simulé) pendant la couche Swissquote.
  - Note : jiffyscan est lent ; utiliser https://sepolia.etherscan.io/address/<adresse> pour vérifier.
  - Prochaine étape : Jalon 2 = récupération (regarder d'abord la branche `feat/example_guardian_recovery` du dépôt zerodevapp/passkey-tutorial et la doc ZeroDev sur le recovery).
  - **Mentors Swissquote consultés (sam. après-midi)** : retours résumés dans la section « Retours des mentors » ci-dessus ; nouvelles exigences du brief (récupération sans Swissquote, gardien mocké en processus séparé, liste des outils d'IA). Priorité confirmée : récupération avant tout extra.
  - **Recherche récupération (sam. ~17h30)** :
    - ZeroDev a un mécanisme natif : action `doRecovery(address _validator, bytes _data)` (executor `0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E`) + hook (`0x2f6B23f3c2Fd7D91AF316c93076a00CAd42189a2`), tous deux **déployés sur Sepolia** (vérifié avec eth_getCode). Exemple complet dans la branche `origin/feat/example_guardian_recovery` de zerodevapp/passkey-tutorial (copie locale en scratchpad : un gardien = un compte Kernel à passkey qui envoie `doRecovery` avec le nouveau validateur passkey ; l'adresse du compte ne change pas, il faut passer `address` à `createKernelAccount`).
    - Limite : l'installation prend `address[] guardians` mais **un seul gardien suffit** (pas de 2/3), et **aucun délai** dans ce mécanisme. Code du hook non vérifié sur Sourcify : comportement exact à confirmer par test.
    - `@zerodev/weighted-validator` (5.5.1) : multisig à poids/seuil, signataires ECDSA et passkey mélangeables, signature en 2 temps (`approveUserOperation` par chacun puis `sendUserOperationWithSignatures`).
    - Timelock on-chain : `TimelockPolicy.sol` existe dans zerodevapp/kernel-7579-plugins (proposition → délai → exécution, annulation par le compte ou un gardien « annulation seulement »), mais **pas d'aide dans `@zerodev/permissions` 5.6.3** et adresse déployée inconnue → hors de portée ce soir sauf déploiement maison.
  - **Design retenu (proposé)** : gardien unique du hook = compte Kernel « guardian » dont le validateur est un WeightedValidator 2-sur-3 (appareil de secours/passkey, contact de confiance, « Swissquote » MOCK = processus séparé avec sa clé). Délai annulable appliqué par un coordinateur de récupération (hors chaîne, MOCK/limite documentée ; version production = TimelockPolicy on-chain).
  - **ÉTUDE DE FAISABILITÉ RÉCUPÉRATION (sam. ~17h20) : CONCLUANTE** (script `spike/spike.mjs`, comptes de test jetables sur Sepolia, clés dans `spike/.keys*.json` ignorées par Git ; lancer : `cd spike && node --env-file=../passkey-tutorial/.env.local spike.mjs setup|recover|verify`, variables `TAG`, `DELAY`, `SIGNERS`).
    - ✅ Un compte Kernel + action de récupération ZeroDev (hook + executor) avec UN gardien = compte Kernel dont le validateur est un `WeightedValidator` 2-sur-3 (poids 50/50/50, seuil 100) : avec 2 signatures (`approveUserOperation` puis `sendUserOperationWithSignatures` avec `callData`, pas `calls`) la récupération s'exécute ; le NOUVEAU propriétaire est accepté, l'ANCIEN est refusé (« Signature invalide »).
    - ✅ Avec UNE seule signature (un seul gardien) : refusé -> « Swissquote seule ne peut rien » est démontré on-chain.
    - ❌ Le champ `delay` du WeightedValidator (config.delay=60) n'a PAS retardé la récupération dans ce flux (appliquée en ~17 s). Ne pas compter dessus. Délai annulable = coordinateur hors chaîne (limite à documenter), ou piste on-chain `TimelockPolicy` (sans aide SDK) si le temps le permet.
    - Piège : il faut `tslib` en dépendance explicite ; le SDK (5.5.10) et le weighted-validator (5.5.1) sont compatibles.
    - Non testé dans le spike : propriétaire à passkey (navigateur) remplacé par un nouveau passkey, et signataires passkey dans le multisig ; l'exemple ZeroDev prouve déjà le remplacement par un passkey avec un gardien simple. À tester dans l'app.
  - Prochaine étape : intégrer dans l'app (Jalon 2a) : bouton « Installer la récupération », « Perdre l'appareil », « Récupérer sur un nouvel appareil » avec 2 gardiens sur 3 (appareil de secours, contact, Swissquote MOCK = serveur séparé).
  - **INTÉGRATION RÉCUPÉRATION DANS L'APP (sam. ~19h)** : code écrit, types/lint OK, coordinateur et serveur MOCK testés en script ; **parcours navigateur avec passkeys pas encore testé** (à faire avec l'utilisateur).
    - `lib/recovery.ts` (briques ZeroDev : gardien multisig 2/3, install, approbation, finalisation, nouveau passkey), `lib/store.ts`, API coordinateur (délai annulable appliqué hors chaîne : signatures retenues avant `readyAt`, jamais remises si annulé ; annulation prouvée par signature passkey ERC-1271), pages `/guardian` `/recover` `/desk`, panneau `OwnerRecoveryPanel` sur `/`, serveur `mock-swissquote/`.
    - Gardiens v1 : appareil de secours et contact = clés ECDSA stockées dans le navigateur (MOCK, à remplacer par un passkey si le temps le permet) ; Swissquote = serveur séparé qui exige un dossier « vérifié en personne » (SMS/e-mail refusés) et reconstruit lui-même l'opération avant de signer.
    - Le dernier gardien qui finalise doit être un gardien réel (le SDK ajoute sa signature en dernier) : pages `/guardian`, bouton « Finaliser ».
    - `next.config.mjs` : `output: 'export'` retiré (routes serveur nécessaires).
    - Limite à documenter : approbations rejouables tant que le nonce du compte gardien ne change pas (même après annulation) ; délai hors chaîne ; clés de gardiens dans le navigateur (MOCK).
  - **JALON 2 ATTEINT (sam. ~18h30)** : parcours réel dans le navigateur avec passkeys validé pour « Bob » : Register (Safari, passkey propriétaire) -> gardiens appareil de secours + contact enregistrés (Chrome) -> récupération installée (Touch ID) -> demande depuis un nouvel appareil (nouveau passkey, Chrome) -> approbations backup + contact (2/3, **sans Swissquote**) -> délai 60 s -> finalisation -> ancien passkey REFUSÉ (AA24), nouveau passkey ACCEPTÉ, transaction gasless signée depuis la même adresse. Le point de contrôle de 23h est donc déjà passé pour ce parcours.
  - Piège rencontré : à la connexion, Chrome propose plusieurs passkeys pour localhost ; choisir celui du nouvel appareil. Correctif : l'app mémorise le validateur sérialisé (`getSerializedData`) et utilise `deserializePasskeyValidator` (identifiant de credential exact). **Pas encore re-testé** (test prévu avec le nom « Carl »).
  - Reste à valider dans le navigateur : voie Swissquote (SMS refusé, validation au guichet `/desk`, approbation), annulation par le propriétaire (Touch ID, preuve ERC-1271), connexion avec le passkey mémorisé.
  - Reste à construire (ordre) : gros vs petit montant (confirmation renforcée), liaison de compte Swissquote MOCK + preuve de propriété du wallet (signature de message), procédure d'urgence « runaway », README (tableau MOCK, architecture, limites), puis bonus (règles de gas fines / gas en USDC, liste blanche de dApps avec hash du code).
  - **Petit vs gros montant (sam. ~19h)** : `lib/policy.ts` (USDC de test Circle `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, 6 décimales, vérifié ; seuil démo 5 USDC), `app/components/PaymentPanel.tsx` (résumé en langage clair, simulation `simulateContract`, contrôle d'adresse), routes `payments/*` du coordinateur (la signature de l'APPAREIL DE SECOURS enregistré, portant sur CE paiement précis, est vérifiée ; rejeu refusé ; testé par `spike/payment-test.mjs`), carte « Confirmation des gros paiements » sur `/guardian` (rôle backup), `GET /screen/:address` dans le faux serveur Swissquote (adresses signalées MOCK ; **avertit sans bloquer**, conforme au mentor). Panneau disponible sur `/` et sur `/recover` (wallet récupéré).
  - Limite à documenter : règle appliquée par l'app + coordinateur (pas on-chain). Production : plafond on-chain / co-signature.
  - À tester dans le navigateur : obtenir des USDC (faucet.circle.com, Ethereum Sepolia), petit paiement (Touch ID seul), gros paiement (confirmation de l'appareil de secours puis Touch ID), adresse signalée.
  - **Liaison compte Swissquote + preuve de propriété (sam. ~20h)** : faux serveur Swissquote : base clients MOCK (`CH-1001`/`demo1234`, `CH-1002`/`demo5678`, mots de passe hachés scrypt), `POST /auth/login`, `/wallet/challenge` (message unique, expire 5 min), `/wallet/link` (signature vérifiée ON-CHAIN via `publicClient.verifyMessage` = ERC-1271 ; défi à usage unique), `/wallet/links`, `/withdraw` (MOCK Travel Rule : retrait autorisé seulement vers un wallet dont la propriété est prouvée). Panneau `SwissquoteLinkPanel` sur `/` et `/recover`. Testé en script (`spike/link-test.mjs`, 10 vérifications OK, y compris compte Kernel) ; **parcours passkey navigateur pas encore testé**. La liaison survit à la récupération (adresse inchangée).
  - **Décisions en attente** : poids des gardiens (option stricte 60/40/40 non appliquée : design actuel 50/50/50 conservé tant que l'utilisateur n'a pas dit « ok strict »). Le mentor est parti sans avoir pu répondre aux questions : choix à documenter comme assumés.
  - **Tous les sujets obligatoires du brief ont désormais du code** (création/liaison, authentification petit/gros, récupération, mocks). Reste : revue complète avec l'utilisateur, texte (garde, menace, légal, business : binôme), README/schéma, bonus.


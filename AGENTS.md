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

## Planning (heure de Zurich)
- 10h15–11h : setup ZeroDev, lancer le template.
- 11h–14h : JALON 1 = créer le wallet avec passkey + envoyer une vraie transaction gasless sur testnet. Si pas fait à 14h → on simplifie.
- 14h–18h30 : JALON 2 = récupération (gardiens + délai + annulation).
- 19h30–23h : couche Swissquote (liaison compte simulée, preuve de propriété, liste blanche, contrôle gros montants).
- 23h–6h : finitions + sommeil en alternance.
- Dimanche 6h : GEL DES FONCTIONNALITÉS. 6h–9h : bugs, README (architecture + ce qui est simulé), vidéo de démo.
- 9h–9h30 : soumettre (deadline 10h00). Jugement 10h30–13h.

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


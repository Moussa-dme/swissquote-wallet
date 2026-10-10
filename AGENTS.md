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


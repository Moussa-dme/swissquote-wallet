# Texte de soumission (prêt à coller)

> À adapter aux champs du formulaire DoraHacks (longueurs maximales à vérifier). Écrit en français ; version anglaise à faire si la plateforme l'exige. Les **[crochets]** sont à compléter.

## Nom du projet
**Swissquote Self-Custody Wallet**

## Accroche (≈ 100 caractères)
Leurs clés, leur contrôle, à un pas de leur compte Swissquote.

## Description courte (≈ 300 caractères)
Un wallet crypto où le client garde ses clés (passkey, Touch ID), avec une récupération par gardiens 2 sur 3 où Swissquote seule ne peut rien faire. Création, signature, perte de l'appareil et récupération fonctionnent de bout en bout sur Sepolia, avec frais sponsorisés et contrôles de conformité.

## Description complète

### Le problème
Un client Swissquote qui veut garder lui-même ses cryptos doit aujourd'hui les retirer vers un wallet externe et quitter l'écosystème de la banque.

### Notre solution
Un wallet **self-custody** que Swissquote pourrait lancer : le client garde le contrôle de ses clés, tout en gardant la sécurité, la simplicité et la conformité d'une banque suisse.
- **Compte intelligent** (Kernel de ZeroDev, ERC-4337) dont le propriétaire est un **passkey** : la clé reste dans la puce de l'appareil, protégée par Touch ID. Aucune phrase secrète.
- **Récupération par 3 gardiens, 2 sur 3** : appareil de secours, contact de confiance, Swissquote. Les gardiens peuvent **remplacer la clé**, **jamais déplacer les fonds**. **Swissquote seule ne peut rien** (testé : une seule voix est refusée par la blockchain).
- **Swissquote ne vote qu'après une vérification d'identité en personne** : un code SMS ou e-mail ne suffit jamais. Un attaquant qui a volé le téléphone **et** l'e-mail est refusé.
- **Délai de sécurité annulable** : le propriétaire est alerté et peut annuler une récupération suspecte.
- **Le client récupère sans Swissquote** : appareil de secours + contact suffisent (démontré).
- **Petit ou gros montant** : Touch ID seul pour un petit paiement ; Touch ID **et** confirmation d'un second appareil pour un gros paiement, après un résumé en langage clair et une simulation.
- **Travel Rule** : le wallet prouve sa propriété par une signature de message **vérifiée sur la blockchain** ; la banque n'autorise un retrait que vers un wallet vérifié.

### Démo de bout en bout
Créer un wallet → payer → perdre l'appareil → récupérer sur un nouvel appareil (avec attaquant refusé et ancien appareil bloqué) → retrouver le même wallet, mêmes fonds, nouvelle clé. Réseau : **Sepolia** (test, aucun argent réel).

### Bonus
- **Gasless** : les frais sont payés par un paymaster (le client n'a besoin d'aucun ETH) ; **une « gas station » évite l'abus** (quota par wallet, plafond global, plafond de gaz) ; au-delà du quota, le client peut **payer ses frais en USDC** (aucun coût pour la banque).
- **Interaction conforme avec les dApps** : liste d'applications approuvées avec **empreinte du code vérifiée par le wallet sur la blockchain** (une même adresse ne garantit pas le même code), simulation et résumé en langage clair, contrôle d'adresses (avertissement sans blocage), contrôles renforcés pour les applications inconnues et les gros montants.

### Ce qui est simulé (MOCK), clairement étiqueté
Le gardien Swissquote (processus séparé, stockage propre), l'agence et le KYC, les comptes clients, le registre de dApps, la gas station et les clés de l'appareil de secours et du contact. **La sécurité de la clé du client n'en dépend pas.** Tableau complet dans `docs/PROJET.md`.

### Limites assumées
Le délai de sécurité est appliqué hors chaîne (production : délai sur la blockchain) ; la règle petit / gros montant est appliquée par l'application (production : imposée par le wallet) ; zone grise « Swissquote + un autre gardien » reconnue et atténuée ; passkeys éventuellement synchronisés par Apple / Google. Détail : `docs/MENACE.md`.

### Business case (résumé)
Garder les clients qui partaient, un service de récupération payant, un abonnement « gas station » ; risque faible car la banque n'a aucune clé du client et ne peut rien déplacer seule ; aucune assurance engagée ; développement léger (aucune cryptographie ni contrat maison). Détail et hypothèses : `docs/BUSINESS.md`.

### Outils d'IA utilisés
**Claude Code** (Claude Sonnet 5.5) : lecture de la documentation et des SDK, conception et études de faisabilité par scripts, écriture du code, débogage, brouillons de documentation. **[Autres outils du binôme à ajouter.]** Les décisions de conception, les tests avec de vrais passkeys et la validation des cas d'attaque ont été faits par l'équipe.

## Liens
- **Code** : <https://github.com/Moussa-dme/swissquote-wallet> *(dépôt à passer en public avant de soumettre, voir la liste en bas)*
- **Vidéo de démo** : [lien]
- **Documentation** : `README.md`, `docs/PROJET.md`, `docs/ARCHITECTURE.md`, `docs/MENACE.md`, `docs/LEGAL.md`, `docs/BUSINESS.md`, `docs/DEMARRAGE.md`

## Technologies (aucune cryptographie maison)
ZeroDev Kernel (ERC-4337), passkeys (WebAuthn), multisig pondéré ZeroDev, paymaster ZeroDev, viem, Next.js, Node.js, Sepolia.

## À décider avant de soumettre
- [ ] **Accès au dépôt** : le dépôt est **privé** (un visiteur non connecté voit une erreur 404). Le passer en **public** (Settings → General → Change visibility) ou ajouter les organisateurs en collaborateurs.
- [ ] **Durée et format de la vidéo** (voir le formulaire).
- [ ] **Langue** : français ou anglais.
- [ ] Relire une dernière fois que **aucun document** ne contient quelque chose à ne pas publier.
- [ ] Après l'avoir passé en public, **ouvrir le lien dans une fenêtre privée** pour vérifier qu'il s'affiche.

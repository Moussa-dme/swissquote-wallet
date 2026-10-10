# Swissquote Self-Custody Wallet : description du projet

> **Brouillon à relire.** Rédigé à partir de ce qui est réellement construit et testé. Les sections **8 (business)** et **7 (juridique)** renvoient aux squelettes que le binôme complète. Tout ce qui est simulé est marqué **MOCK**. *(À traduire en anglais si le dépôt de la soumission l'exige.)*

**En une phrase.** Un wallet crypto où **le client garde ses clés**, protégé par Touch ID, avec une **récupération par gardiens 2 sur 3** dans laquelle **Swissquote seule ne peut rien faire**, et un lien avec le compte Swissquote qui rend la vérification de propriété (Travel Rule) automatique. *« Leurs clés, leur contrôle, à un pas de leur compte Swissquote. »*

## Démo : l'histoire de bout en bout
1. **Créer** un wallet avec un passkey (Touch ID) sur Sepolia, transaction sans frais pour le client.
2. **Se connecter et signer** un paiement : Touch ID seul pour un petit montant, Touch ID + second appareil pour un gros montant.
3. **Perdre l'appareil.**
4. **Récupérer** sur un nouvel appareil avec 2 gardiens sur 3, **sans que Swissquote soit nécessaire**, puis constater que l'**ancien appareil est refusé** et que le nouveau signe depuis la **même adresse**.
5. Montrer l'**attaquant refusé** (code SMS / e-mail volés) et l'**annulation** par le propriétaire pendant le délai.

Mode d'emploi pas à pas : [`DEMARRAGE.md`](DEMARRAGE.md).

## 1. Modèle de garde (décision et justification)
**Choix : compte intelligent ERC-4337 (Kernel de ZeroDev), propriétaire = passkey, récupération par gardiens 2 sur 3.** Nous combinons deux modèles du brief : *smart-contract account (ERC-4337)* et une logique de *backup partagé en trois*, sans reconstituer une clé nulle part.

| Modèle du brief | Pourquoi nous ne l'avons pas pris seul |
|---|---|
| Compte custodial | Swissquote détient les clés : c'est de la garde, et le mentor l'a exclu (« Swissquote ne doit jamais avoir la clé »). |
| Phrase secrète (12 ou 24 mots) | Un client Swissquote typique ne conservera pas la phrase en sécurité (80 à 90 % des clients ne connaissent pas la crypto). |
| MPC / signatures à seuil | Swissquote cosignerait chaque transaction : si elle est indisponible, le client est bloqué (inconvénient cité par le mentor). Avantage : fonctionne aussi pour Bitcoin. |
| Split backup (Shamir) | Il faut reconstituer la phrase quelque part : un point de compromission. |
| **ERC-4337 + passkey + gardiens (notre choix)** | Pas de phrase à garder ; la clé reste dans la puce de l'appareil ; la récupération est une **règle imposée par la blockchain**, sans point où la clé est reconstituée. **Limite : EVM seulement.** |

**Avantages** : la banque ne détient aucune clé ; une seule voix de la banque ne suffit pas ; la récupération marche sans la banque ; briques existantes (aucune cryptographie maison) ; simple pour le client (Touch ID).
**Inconvénients** : EVM seulement ; dépendance à un fournisseur de comptes intelligents ; zone grise si Swissquote et un autre gardien s'allient (voir `MENACE.md` 3.1).

**Choix assumé : tous les gardiens pèsent pareil (2 voix sur 3).** Un client qui a tout perdu peut ainsi récupérer avec son contact et Swissquote après vérification en personne (le « pire cas » décrit par le mentor). Le prix est la zone grise « Swissquote + un autre gardien », atténuée par la vérification en personne, le délai, l'alerte et l'annulation. Un mode « haute sécurité » où Swissquote ne peut aider **qu'avec l'appareil du client** est décrit comme variante configurable (non implémentée).

## 2. Modèle de menace
Résumé : un voleur de téléphone est limité aux petits montants ; un attaquant qui a le numéro et l'e-mail est **refusé** par Swissquote (vérification en personne) ; Swissquote seule ne peut ni payer ni changer la clé. Les trois questions du brief (qui peut voler, qui peut verrouiller, Swissquote seule ou avec un partenaire) sont traitées dans [`MENACE.md`](MENACE.md), **avec les limites assumées**.

## 3. Architecture
Schémas (parties réelles en vert, MOCK en orange) dans [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 4. Création du wallet
- Le client crée un **passkey** (Touch ID / Face ID) : la clé privée est générée dans la puce de son appareil et **n'en sort jamais**.
- L'adresse du wallet est un **compte intelligent** dont le propriétaire est ce passkey.
- **Lien avec l'identité Swissquote** : le client se connecte à son compte Swissquote (**MOCK**), puis **prouve** que le wallet est à lui : le wallet signe un message unique, Swissquote vérifie la signature **sur la blockchain** (ERC-1271), sans voir de clé. La liaison **survit à une récupération** (l'adresse ne change pas).

## 5. Authentification : petit contre gros montant
| | Petit montant (≤ seuil, 5 USDC en démo) | Gros montant (> seuil) |
|---|---|---|
| Facteurs | Passkey (Touch ID) | Passkey **+** confirmation d'un **second appareil** (l'appareil de secours), qui signe **ce paiement précis** |
| Avant de signer | Résumé en langage clair, simulation de la transaction, contrôle de l'adresse | Idem |

Un voleur qui a le téléphone et sa biométrie n'a pas le second appareil. **Limite** : règle appliquée par l'application, pas par la blockchain (production : plafond imposé par le compte lui-même).

## 6. Récupération
- **Qui** : 3 gardiens (appareil de secours du client, contact de confiance, Swissquote), **2 sur 3** requis, imposé par un multisig sur la blockchain.
- **Ce qu'ils peuvent faire** : **remplacer la clé** du propriétaire. **Jamais** déplacer les fonds. L'adresse et les fonds ne bougent pas.
- **Swissquote** : une voix seulement, donnée **après vérification d'identité en personne** (un SMS ou un e-mail ne suffit jamais). Seule, elle est refusée par la blockchain.
- **Combien de temps** : un **délai de sécurité** (60 s en démo, 48 h en production) pendant lequel le propriétaire est alerté et peut **annuler** avec son passkey.
- **Si Swissquote disparaît** : appareil de secours + contact suffisent (testé).
- **Ce qui empêche un attaquant** : il faudrait 2 gardiens ; un code SMS / e-mail est refusé ; le propriétaire peut annuler ; l'ancienne clé est révoquée après coup.
- **Limites** : délai appliqué hors chaîne (production : `TimelockPolicy` sur la blockchain) ; clés des deux gardiens du client dans le navigateur (production : passkey ou clé physique).

## 7. Garde et Travel Rule
Détail et sources : [`LEGAL.md`](LEGAL.md).
- **Garde** : selon la pratique de la FINMA rapportée par des cabinets d'avocats, un wallet est non-custodial si le prestataire n'a aucun pouvoir de disposition sur les clés ni sur les actifs et n'influence pas les transactions. Chez nous : **aucune clé** côté Swissquote, **1 voix sur 3 seulement** dans la récupération, **aucun pouvoir de blocage** (elle avertit), et le client peut récupérer **sans elle**. Le wallet est donc plus proche d'un **logiciel** que d'une garde. La **zone grise** (Swissquote + un autre gardien) est reconnue, atténuée, et supprimable par une variante stricte.
- **Travel Rule** : la guidance FINMA 02/2019 exige de vérifier la propriété d'un wallet externe par des « moyens techniques appropriés ». Notre wallet le fait **automatiquement** : signature d'un message unique, **vérifiée sur la blockchain** (ERC-1271), avant tout retrait de la banque. Quand le client paie un tiers depuis son wallet, la banque n'intervient pas (comparaison du distributeur de billets, donnée par le mentor).
- *Rappel : ce n'est pas un avis juridique ; les points signalés sont à vérifier sur les textes officiels.*

## 8. Business case
Détail, sources et modèle d'hypothèses : [`BUSINESS.md`](BUSINESS.md).

Swissquote perd aujourd'hui les clients qui veulent le self-custody. Notre wallet leur permet de **garder leurs clés tout en restant clients**. Le marché existe (23 % des Suisses possèdent des cryptos selon Bitpanda / YouGov 2024), mais 80 à 90 % des clients de la banque ne connaissent pas les wallets : c'est une **option complémentaire**. Les revenus viennent de la **rétention**, d'un **service de récupération payant** et d'un **abonnement « gas station »** ; un pourcentage des actifs seul est négligeable (à 0,01 %, 500 CHF par an pour 1 000 clients à 5 000 CHF, selon nos hypothèses). Les coûts sont maîtrisés : **pas d'assurance**, gas plafonné, développement léger car **aucune cryptographie ni contrat maison**. **Risque faible** : la banque n'a aucune clé et ne peut rien déplacer seule.

## 9. Bonus traités
| Bonus | Ce qui est fait |
|---|---|
| **Gasless** | Les frais sont payés par un **paymaster** (Swissquote) : le client n'a besoin d'aucun ETH (vérifié : wallet à 0 ETH qui envoie des USDC). **Qui paie** : Swissquote. **Comment l'abus est évité** : une « **gas station** » entre l'app et le paymaster applique un **quota quotidien par wallet** (40 en démo), un **plafond global quotidien** (500), un **plafond de gaz par opération** (5 millions) et refuse toute autre requête que « sponsoriser » ; testé (la 41ᵉ demande d'un wallet est refusée). **Limite** : service de l'app (MOCK) ; en production, abonnement par client (idée du mentor : 100 opérations par mois), wallets liés à un client KYC, politique appliquée chez ZeroDev. |
| **Interaction conforme avec les dApps** | **Liste de dApps approuvées** par Swissquote avec l'**empreinte du code** de chaque contrat, que le wallet **recalcule sur la blockchain** (même adresse ne veut pas dire même code, idée saluée par le mentor) ; détection des contrats modifiables (proxy) ; **simulation** de la transaction avec **résumé en langage clair** ; **contrôle d'adresse** (avertissement) ; **contrôles renforcés** : application inconnue → case à cocher + confirmation du second appareil, code changé → appel bloqué, gros paiement → second appareil. |

## 10. Ce qui est simulé (MOCK)
| Élément | Réel ou simulé |
|---|---|
| Wallet, passkey, signatures, transactions sur Sepolia | **Réel** |
| Frais payés par un paymaster | **Réel** |
| Récupération 2 sur 3 imposée par la blockchain | **Réel** |
| Vérification de la signature du wallet (preuve de propriété) | **Réel** (sur la blockchain) |
| USDC de test | **Réel** (jeton de test Circle, sans valeur) |
| Gardien « Swissquote » | **MOCK** : petit serveur séparé, sa propre clé et son propre stockage |
| Vérification d'identité en agence (KYC) | **MOCK** : la page `/desk` joue l'agent |
| Compte Swissquote (numéro de client, mot de passe) | **MOCK** : base inventée (hors périmètre selon le mentor) |
| Retrait depuis la banque (Travel Rule) | **MOCK** : aucun fonds réel ne bouge |
| Liste d'adresses signalées | **MOCK** : deux adresses inventées |
| Clés de l'appareil de secours et du contact | **MOCK** : stockées dans le navigateur |
| Délai de sécurité annulable | **Hors chaîne** (coordinateur) ; **60 s** en démo, 48 h en production |
| Règle petit / gros montant | **Appliquée par l'app** ; production : on-chain |
| Registre des dApps approuvées | **MOCK** (une dApp de démonstration) ; la vérification de l'empreinte du code par le wallet est **réelle** |
| Gas station (quotas de frais) | **MOCK** (service de l'app) ; le paymaster est réel |

## 11. Outils d'IA utilisés
| Outil | Usage |
|---|---|
| **Claude Code** (Claude Sonnet 5.5, application de bureau Claude) | Lecture de la documentation et du code des SDK ZeroDev ; **conception et étude de faisabilité** de la récupération (tests sur Sepolia par scripts) ; **écriture du code** (pages de l'application, faux serveur Swissquote, scripts de test) ; **débogage** (messages d'erreur, causes) ; **rédaction** des brouillons de documentation et du tutoriel. |
| *[à compléter par le binôme]* | *Autres outils éventuellement utilisés (recherche, rédaction, slides...)* |

**Ce qui n'a pas été délégué à l'IA** : les décisions de conception, les tests avec de vrais passkeys dans des navigateurs, la validation de chaque comportement de sécurité, et la discussion avec les mentors Swissquote. Le code a été testé par des scripts (cas d'attaque inclus) et par des essais humains.

## 12. Limites connues
Voir `MENACE.md` section 3. Principales : délai hors chaîne ; règle « petit / gros » appliquée par l'app ; passkeys éventuellement synchronisés par Apple / Google ; zone grise Swissquote + un autre gardien ; EVM seulement.

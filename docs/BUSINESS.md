# Business case

> **Squelette à compléter par le binôme.** Il rassemble les **faits donnés par les mentors Swissquote** et ce qu'on a construit, et laisse des cases pour les chiffres. **Je n'ai inventé aucun chiffre** : tout ce qui est entre crochets est à sourcer ou à estimer par l'équipe. Le brief demande « un paragraphe, mais concret » ; le mentor a dit que le critère clé est le **ratio bénéfice / risque** (« une banque gère du risque »).

## 1. La proposition en une phrase
Un wallet self-custody **complémentaire** à l'offre existante : les clients gardent leurs clés, mais **restent dans l'écosystème Swissquote** (compte lié, récupération assistée, conformité), au lieu de retirer leurs cryptos vers un wallet externe et de partir.

## 2. Pour qui
- Les mentors estiment que **80 à 90 % des clients** n'ont jamais entendu parler d'un wallet : ils resteront sur la plateforme classique. L'offre vise les clients **déjà à l'aise avec la crypto** qui veulent le self-custody.
- Le mentor a insisté : **ne pas remplacer les banques**, mais proposer une option supplémentaire (« on ne va pas se remplacer nous-mêmes »). Un client peut **commencer avec 10 CHF** et augmenter progressivement.
- **[À COMPLÉTER : benchmark]** Le mentor a suggéré de chiffrer le marché : nombre de personnes de **20 à 30 ans en Suisse actives dans les cryptomonnaies**. Source à trouver : [...]. Estimation de la part intéressée par un wallet self-custody : [...].

## 3. Ce que Swissquote gagne
| Source | Mécanisme | Chiffrage |
|---|---|---|
| **Rétention** | Les clients qui voulaient sortir leurs actifs restent dans l'écosystème. Pas de départ vers un wallet externe. | [nb de clients retenus × actifs moyens × marge] |
| **Frais sur les actifs sous garde (AUC)** | Idée du mentor : un petit pourcentage des actifs dans le wallet pour certains services (exemple donné : **0,01 %**). | [AUC estimé × 0,01 %] |
| **Service de récupération payant** | Le mentor a cité le backup comme fonctionnalité pour laquelle les clients paieraient. | [prix par an × nb d'abonnés] |
| **Abonnement « gas station »** (bonus) | Idée du mentor : un abonnement premium (exemple : **200 CHF par mois** pour **100 transactions** sponsorisées). | [nb d'abonnés × prix − coût du gas] |
| **Nouveaux clients** | Des personnes attirées par un wallet self-custody **adossé à une banque suisse**. | [...] |
| **Trading** | Les clients qui restent continuent d'acheter et de vendre via la plateforme. | [...] |

## 4. Ce que ça coûte
| Poste | Détail | Chiffrage |
|---|---|---|
| **Gas sponsorisé** | Chaque transaction sponsorisée coûte des frais réseau. Maîtrisé par des plafonds par client et des contrats autorisés (politique de frais, bonus gasless). | [coût moyen par transaction × transactions par client] |
| **Support de la récupération** | Contrôle d'identité en agence, suivi des demandes. Atténué par la récupération **sans** Swissquote (appareil de secours + contact). | [coût par récupération × taux de récupération] |
| **Conformité** | Vérification de propriété et contrôle d'adresses (fournisseur de listes de sanctions). | [...] |
| **Infrastructure** | Serveur de gardien, coordinateur, fournisseur de comptes intelligents. | [...] |
| **Assurance** | **Aucune** dans ce projet (précisé par le mentor) : la récupération est une **obligation de moyens**, pas de résultat. | 0 |

## 5. Risques (ratio bénéfice / risque)
- **Risque de perte de fonds par un client** : le client assume la responsabilité de ses clés ; la banque n'est pas dépositaire. Récupération en « best effort ».
- **Risque réglementaire** : voir `LEGAL.md` (qualification de garde, Travel Rule).
- **Risque d'usage frauduleux du gas sponsorisé** : plafonds et liste de contrats.
- **Dépendance à un fournisseur** (ZeroDev) : voir `MENACE.md`.
- **Conclusion à formuler** : le risque est jugé **faible** parce que (1) la banque ne détient ni clé ni pouvoir seule de déplacer les fonds, (2) la récupération est à 2 voix sur 3 avec vérification en personne, (3) pas d'engagement d'assurance. **[À CHIFFRER]** le bénéfice attendu face à ce risque.

## 6. Facilité d'implémentation (critère de différenciation cité par le mentor)
Le mentor a dit que si une solution demande « 600 jours de développement », c'est un problème, et qu'une solution aussi sûre mais plus simple peut être préférable. Notre atout :
- **Aucune cryptographie ni aucun contrat maison** : on assemble des briques existantes (compte intelligent Kernel, passkeys, multisig pondéré, paymaster).
- **Prototype complet construit en une nuit de hackathon** : création, signature, récupération, contrôles, liaison de compte.
- **Reste à industrialiser** (liste honnête) : délai de récupération sur la blockchain, vrai KYC et vraie agence, clé physique pour l'appareil de secours, politique de frais, audit de sécurité. **[À ESTIMER : jours de développement.]**

## 7. Positionnement pour le pitch (idée)
« Leurs clés, leur contrôle, à un pas de leur compte Swissquote. » Mode **basique** (envoyer à un ami, un clic) et mode **avancé** (comme le mentor l'a recommandé), pour les 80 % de clients qui ne connaissent pas la crypto.

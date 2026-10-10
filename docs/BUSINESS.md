# Business case

> Le brief demande « un paragraphe, mais concret » ; le mentor a dit que le critère clé est le **ratio bénéfice / risque**. Les **chiffres de marché** viennent de sources citées. Les **chiffres du modèle** sont des **hypothèses de travail**, clairement étiquetées, avec la formule pour que l'équipe les ajuste.

## Le paragraphe à rendre (version concrète)

**Swissquote aujourd'hui perd les clients qui veulent le self-custody** : ils retirent leurs cryptos vers un wallet externe et quittent l'écosystème. Notre wallet leur permet de **garder leurs clés tout en restant clients** : compte lié, récupération assistée, conformité automatique. Le marché existe : selon une enquête Bitpanda / YouGov de 2024, **23 % de la population suisse** possède des cryptos (32 % des 28 à 43 ans, 29 % des 18 à 27 ans), et une étude récente indique qu'environ **18 % des Suisses** en détiennent. Les mentors estiment néanmoins que **80 à 90 % des clients de la banque** ne connaissent pas les wallets : l'offre vise donc une **minorité déjà à l'aise**, comme **option complémentaire** (la banque ne se remplace pas elle-même). Les revenus viennent de **trois sources** : la **rétention** (les actifs et les commissions de trading restent chez Swissquote), un **service de récupération payant** et un **abonnement « gas station »** ; un pourcentage des actifs sous garde (0,01 %, ordre de grandeur donné par le mentor) ne suffit **pas** à lui seul. Les coûts sont maîtrisés : **aucune assurance** (la récupération est une obligation de moyens), gas plafonné par client, et un développement **léger** car le prototype n'utilise **aucune cryptographie ni aucun contrat maison**. Le **risque est faible** : la banque n'a **aucune clé**, **ne peut rien déplacer seule**, et la récupération exige 2 gardiens sur 3 après vérification en personne.

## Marché (chiffres sourcés)
| Donnée | Valeur | Source |
|---|---|---|
| Part de la population suisse qui possède des cryptos | **23 %** (2024) | Bitpanda / YouGov, via [Crowdfund Insider](https://www.crowdfundinsider.com/2024/08/228747-switzerland-ranked-among-most-crypto-friendly-nations-with-23-of-population-owning-virtual-currencies-bitpanda-survey/) |
| Par génération (Suisse) | Millennials (28 à 43 ans) **32 %**, Gen Z (18 à 27 ans) **29 %** | même enquête (tranches d'âge différentes de « 20 à 30 ans » : approximation) |
| Détenteurs récents | environ **18 %** des répondants de plus de 18 ans, contre 11 % en 2024 | [swissinfo](https://www.swissinfo.ch/eng/various/almost-a-fifth-of-all-swiss-people-hold-crypto-assets/91667885) (étude de la HSLU) **[À VÉRIFIER]** |
| Intérêt par génération | Gen Z et Gen Y les plus intéressées | [PostFinance](https://www.postfinance.ch/content/dam/pfch/doc/a_d/crypto_investments_switzerland_en.pdf) |

> **Pas de donnée trouvée** pour la tranche exacte « 20 à 30 ans » demandée par le mentor : on cite les tranches disponibles et on le dit.

## Sources de revenus
| Source | Mécanisme | Donnée du mentor |
|---|---|---|
| **Rétention** | Les clients qui voulaient sortir leurs actifs restent : actifs et commissions de trading conservés. | Offre complémentaire, pas un remplacement. |
| **Frais sur les actifs sous garde** | Pourcentage des actifs dans le wallet pour certains services. | Exemple : **0,01 %**. |
| **Service de récupération payant** | Abonnement annuel pour l'assistance. | Cité par le mentor comme un service pour lequel les clients paieraient. |
| **Abonnement « gas station »** | Frais de transaction avancés par la banque, abonnement premium. | Exemple : **200 CHF par mois** pour **100 transactions**. |
| **Nouveaux clients** | Attirés par un wallet self-custody adossé à une banque suisse. | — |

## Modèle chiffré (hypothèses de travail, à ajuster)
*Pour **1 000 clients** qui adoptent le wallet. Toutes les valeurs d'entrée sont des hypothèses non sourcées, sauf le taux de 0,01 % (mentor).*

| Ligne | Formule | Hypothèse | Résultat annuel |
|---|---|---|---|
| Actifs moyens dans le wallet | — | **5 000 CHF** par client (hypothèse ; « commencer avec 10 CHF », dit le mentor) | 5 000 000 CHF |
| Revenu : % des actifs | actifs × 0,01 % | 0,01 % (mentor) | **500 CHF** |
| Revenu : récupération payante | clients × prix | **50 CHF** par an (hypothèse) | **50 000 CHF** |
| Coût : gas sponsorisé | clients × transactions × coût | **20** transactions par an × **0,05 CHF** (hypothèse) | **1 000 CHF** |
| Coût : support de récupération | clients × taux × coût | **2 %** × **200 CHF** (hypothèse) | **4 000 CHF** |
| Coût : assurance | — | **aucune** (mentor) | 0 |
| **Marge directe** | revenus − coûts | | **≈ 45 500 CHF** |

**Ce que le modèle montre** : le **pourcentage des actifs** (500 CHF) est **négligeable** ; la valeur vient du **service payant** et surtout de la **rétention** (les actifs et le trading qui **ne partent pas**), qu'il faut valoriser avec les données de la banque : *rétention = clients retenus × actifs × marge de la banque sur ces actifs*. **[À CHIFFRER avec des données internes ou une hypothèse assumée.]**

## Risques (ratio bénéfice / risque)
| Risque | Atténuation |
|---|---|
| Perte de fonds par un client | Le client assume ses clés ; récupération en « best effort ». |
| Qualification réglementaire | Voir `LEGAL.md` (aucune clé, aucune disposition seule, aucun blocage). |
| Abus du gas sponsorisé | Plafonds par client, liste de contrats, abonnement. |
| Dépendance à un fournisseur | Voir `MENACE.md` 3.8. |
| **Conclusion** | **Risque faible** : la banque n'a aucune clé et ne peut rien déplacer seule, la récupération est à 2 voix sur 3 avec vérification en personne, aucune assurance engagée. |

## Facilité d'implémentation (différenciateur cité par le mentor)
Le mentor a dit qu'une solution demandant « 600 jours de développement » est un problème. Notre atout : **aucune cryptographie ni aucun contrat maison**, des **briques existantes** (compte intelligent, passkeys, multisig, paymaster), et un **prototype complet construit en une nuit**. **Reste à industrialiser** : délai de récupération sur la blockchain, vrai KYC et vraie agence, clé physique pour l'appareil de secours, politique de frais, audit de sécurité. **[À ESTIMER en jours de développement.]**

## Positionnement (pour le pitch)
*« Leurs clés, leur contrôle, à un pas de leur compte Swissquote. »* Mode **basique** (envoyer à un ami, un clic) et mode **avancé**, pour les 80 % de clients qui ne connaissent pas la crypto.

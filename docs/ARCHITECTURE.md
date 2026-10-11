# Architecture

> Brouillon factuel. **Vert = réel** (code ou service qui fonctionne vraiment, sur la blockchain de test Sepolia). **Orange = MOCK** (simulation, clairement étiquetée dans le code et l'interface). Les schémas s'affichent directement sur GitHub (format Mermaid) ; pour les slides, on peut les exporter en image avec <https://mermaid.live> (coller le code, « PNG »).

## 0. Version pour la présentation (7 boîtes)

**En une phrase :** le client signe avec Touch ID, et s'il perd son appareil, deux gardiens sur trois (dont Swissquote seulement après une vérification en personne) font remplacer sa clé par la blockchain.

> **À mettre sur les slides.** Vert = réel, orange = simulé (MOCK), bleu = service externe. La vue détaillée est en section 1.

```mermaid
flowchart LR
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    classDef ext fill:#bfdbfe,stroke:#1d4ed8,color:#172554

    CLIENT["Le client<br/>passkey (Touch ID)<br/>sur son appareil"]:::real
    APP["Application du wallet"]:::real
    COORD["Coordinateur de récupération<br/>délai annulable"]:::mock
    GARD["Appareil de secours<br/>et contact de confiance"]:::mock
    SQ["Swissquote<br/>gardien n°3 (1 voix sur 3)<br/>agence, comptes, contrôles"]:::mock
    ZD["ZeroDev<br/>passkeys, frais payés"]:::ext
    CHAIN["Blockchain (Sepolia)<br/>wallet du client<br/>gardien 2 sur 3 · récupération"]:::real

    CLIENT -->|"signe avec Touch ID"| APP
    APP -->|"transactions"| ZD
    ZD --> CHAIN
    APP <--> COORD
    GARD -->|"approuvent"| COORD
    SQ -->|"approuve après vérification en personne"| COORD
    COORD -->|"2 gardiens sur 3 finalisent"| CHAIN
```

### Le brief de chaque boîte (pour les slides)
| Boîte | À quoi elle sert | Elle parle à |
|---|---|---|
| **Le client** | Il possède la **clé** (un passkey) dans la puce de son appareil, protégée par Touch ID. La clé n'en sort jamais. | L'application (il signe) |
| **Application du wallet** | L'écran du client : wallet, paiements, récupération, mode avancé. Elle prépare les opérations et les fait signer. | Le client, ZeroDev, le coordinateur, Swissquote |
| **Coordinateur de récupération** *(MOCK)* | Il **relaie** les demandes et les approbations entre les gardiens et **retient les signatures pendant le délai** de sécurité (le propriétaire peut annuler). Il **n'a aucune clé** et ne peut pas signer. | L'application, les gardiens, Swissquote, la blockchain |
| **Appareil de secours + contact de confiance** *(MOCK)* | Les **gardiens du client** : ils approuvent une récupération, et l'appareil de secours confirme les **gros paiements**. Clés dans le navigateur (production : passkey ou clé matérielle). | Le coordinateur |
| **Swissquote** *(MOCK, processus séparé)* | **Gardien n°3 : une voix sur trois**, donnée seulement après vérification d'identité **en personne**. Côté banque aussi : comptes clients, contrôle d'adresses, registre de dApps, preuve de propriété (Travel Rule). | Le coordinateur, l'application |
| **ZeroDev** *(service externe)* | La **technologie** du compte intelligent : serveur de passkeys, envoi des transactions, **paiement des frais** (paymaster). Il **ne peut pas signer** à la place du client. | L'application, la blockchain |
| **Blockchain (Sepolia)** | Là où vivent les **règles** : le wallet (propriétaire = passkey), le **gardien 2 sur 3**, le module de récupération, l'USDC. C'est elle qui **impose** le 2 sur 3 et refuse l'ancienne clé après récupération. | Tous, via ZeroDev |

**Comment le lire (20 secondes) :** le client signe avec Touch ID. S'il perd son appareil, **deux gardiens sur trois** (son appareil de secours, son contact, ou Swissquote après vérification en personne) approuvent, et la **blockchain** remplace sa clé. **Swissquote seule ne peut rien.**

## 1. Vue détaillée : qui parle à qui

**En une phrase :** la carte complète de tous les composants (pages, services simulés, ZeroDev, contrats) et de qui parle à qui, à garder pour répondre aux questions précises.

```mermaid
flowchart LR
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    classDef ext fill:#bfdbfe,stroke:#1d4ed8,color:#172554

    subgraph DEV["Appareils et navigateurs (une app web Next.js)"]
        OWNER["Appareil du client<br/>page d'accueil<br/>clé = passkey (Touch ID)"]:::real
        NEWDEV["Nouvel appareil<br/>/recover<br/>nouveau passkey"]:::real
        BACKUP["Appareil de secours<br/>/guardian<br/>clé stockée dans le navigateur"]:::mock
        CONTACT["Contact de confiance<br/>/guardian<br/>clé stockée dans le navigateur"]:::mock
        DESK["Guichet d'agence<br/>/desk<br/>agent simulé"]:::mock
    end

    GAS["Gas station<br/>routes /api/gas<br/>quotas anti-abus avant le paymaster"]:::mock

    COORD["Coordinateur de récupération<br/>routes /api/recovery<br/>relaie les approbations<br/>applique le délai annulable"]:::mock

    subgraph SQ["Faux serveur Swissquote — processus séparé, port 4000, stockage propre"]
        SQG["Gardien n°3 : 1 voix sur 3<br/>signe après vérification en personne"]:::mock
        SQB["Comptes clients, KYC en agence,<br/>contrôle d'adresses, registre de dApps approuvées,<br/>liaison wallet, retraits (Travel Rule)"]:::mock
    end

    ZD["ZeroDev (cloud)<br/>serveur de passkeys<br/>bundler · paymaster (frais payés)"]:::ext

    subgraph CHAIN["Blockchain de test Sepolia"]
        ACCOUNT["Wallet du client<br/>compte intelligent Kernel (ERC-4337)<br/>propriétaire = passkey"]:::real
        GUARD["Compte gardien<br/>multisig 2 sur 3<br/>(appareil de secours, contact, Swissquote)"]:::real
        RECOV["Action de récupération + hook<br/>(contrats ZeroDev)"]:::real
        USDC["USDC de test (Circle)"]:::real
    end

    OWNER -->|"frais à sponsoriser"| GAS
    GAS -->|"si quota respecté"| ZD
    OWNER -->|"passkey, transactions"| ZD
    NEWDEV -->|"nouveau passkey"| ZD
    ZD -->|"opérations utilisateur"| ACCOUNT
    OWNER <-->|"état, gros paiements, annulation"| COORD
    NEWDEV <-->|"demande de récupération"| COORD
    BACKUP <-->|"approbations, confirmation des gros paiements"| COORD
    CONTACT <-->|"approbations"| COORD
    NEWDEV <-->|"dossier, approbation"| SQG
    DESK -->|"identité vérifiée en personne"| SQB
    OWNER <-->|"liaison, preuve de propriété, contrôle d'adresse"| SQB
    SQB -.- SQG
    GUARD -->|"remplace la clé du propriétaire"| RECOV
    RECOV -->|"nouveau propriétaire"| ACCOUNT
    ACCOUNT -->|"envoie / reçoit"| USDC
    SQB -.->|"vérifie la signature du wallet (ERC-1271)"| ACCOUNT
```

**Où vivent les clés**
| Clé | Où elle est | Qui peut s'en servir |
|---|---|---|
| Clé du propriétaire (passkey) | Dans la puce sécurisée de l'appareil du client (peut être synchronisée par Apple / Google, voir `MENACE.md`) | Le client, avec Touch ID |
| Clé de l'appareil de secours | MOCK : dans le navigateur du second appareil | Le client |
| Clé du contact de confiance | MOCK : dans le navigateur du contact | Le contact |
| Clé de Swissquote (gardien) | Dans le stockage du faux serveur Swissquote (processus séparé) | Le serveur, **1 voix sur 3 seulement** |
| Clé du coordinateur | **Il n'en a aucune** | Personne : il relaie, ne signe jamais |

**Ce que Swissquote ne voit jamais** : la clé du client, ses fonds, ses paiements (sauf l'adresse destinataire pour l'avertissement). Elle ne peut rien faire seule.

## 2. Le wallet : qui contrôle quoi

**En une phrase :** le client signe les paiements avec son passkey, tandis que les gardiens, à deux sur trois, peuvent seulement remplacer sa clé, jamais déplacer ses fonds.

```mermaid
flowchart TB
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    PK["Passkey du client<br/>Touch ID"]:::real -->|"signe les opérations"| W["Wallet (compte Kernel)<br/>mêmes adresse et fonds<br/>quelle que soit la clé"]:::real
    G["Compte gardien<br/>2 voix sur 3 requises"]:::real -->|"peut REMPLACER la clé<br/>(jamais déplacer les fonds)"| W
    B["Appareil de secours"]:::mock --> G
    C["Contact de confiance"]:::mock --> G
    S["Swissquote (MOCK)<br/>après vérification en personne"]:::mock --> G
```

La récupération **change la clé qui contrôle le wallet**. L'adresse du wallet et les fonds ne bougent pas.

## 3. Récupération (séquence)

**En une phrase :** après la perte d'un appareil, le client demande une récupération, le propriétaire est alerté et peut annuler pendant le délai, puis deux gardiens approuvent et la blockchain installe la nouvelle clé en refusant l'ancienne.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (nouvel appareil)
    participant Coord as Coordinateur (MOCK)
    participant SQ as Swissquote (MOCK)
    participant Autre as Appareil de secours / contact
    participant Proprio as Ancien appareil (propriétaire)
    participant Chain as Blockchain (Sepolia)

    Client->>Client: crée un nouveau passkey (Touch ID)
    Client->>Coord: demande de récupération (nouvelle clé)
    Coord-->>Proprio: alerte + compte à rebours
    Note over Coord,Proprio: Délai de sécurité (60 s en démo, 48 h en production)<br/>le propriétaire peut ANNULER (Touch ID)
    alt Voie Swissquote
        Client->>SQ: ouvre un dossier
        Note over SQ: un SMS ou un e-mail ne suffit JAMAIS<br/>vérification d'identité en personne (agence)
        SQ-->>Client: signature de Swissquote (1 voix)
        Client->>Coord: dépose la signature
    end
    Autre->>Coord: approuve (1 voix)
    Note over Coord: les signatures ne sont remises qu'après le délai,<br/>jamais si la demande est annulée
    Autre->>Chain: finalise (signe en dernier, envoie)
    Chain-->>Chain: le compte gardien (2 voix sur 3) remplace le propriétaire
    Client->>Chain: signe avec le NOUVEAU passkey ✅ (l'ancien est refusé)
```

## 4. Paiement : petit ou gros montant

**En une phrase :** chaque paiement passe par un résumé clair, une simulation et un contrôle d'adresse, puis Touch ID seul pour un petit montant, ou Touch ID plus la confirmation d'un second appareil pour un gros montant.

```mermaid
flowchart TB
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    START["Le client saisit un paiement en USDC"]:::real --> SIM["Résumé en langage clair<br/>+ simulation (la transaction réussirait ?)<br/>+ solde après + frais = 0"]:::real
    SIM --> SCREEN["Contrôle de l'adresse par Swissquote (MOCK)<br/>avertit, ne bloque jamais"]:::mock
    SCREEN --> CHECK{"Montant<br/>supérieur au seuil ?"}
    CHECK -->|"non (petit)"| TOUCH["Touch ID seul"]:::real
    CHECK -->|"oui (gros)"| SECOND["Confirmation de l'appareil de secours<br/>(signature portant sur CE paiement)"]:::real
    SECOND --> TOUCH
    TOUCH --> SEND["Transaction signée et envoyée<br/>frais payés par le paymaster"]:::real
```

## 5. Liaison au compte Swissquote et Travel Rule

**En une phrase :** le wallet signe un message unique que Swissquote fait vérifier sur la blockchain, ce qui prouve que le wallet appartient au client sans montrer de clé et autorise les retraits de la banque vers ce wallet.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant W as Wallet du client
    participant SQ as Swissquote (MOCK)
    participant Chain as Blockchain
    Client->>SQ: se connecte (numéro de client + mot de passe, MOCK)
    Client->>SQ: demande de lier son wallet
    SQ-->>Client: message unique à signer (expire en 5 min, usage unique)
    Client->>W: signe le message (Touch ID)
    Client->>SQ: envoie la signature
    SQ->>Chain: vérifie la signature (ERC-1271) — aucune clé n'est communiquée
    SQ-->>Client: wallet lié et propriété prouvée
    Note over SQ: un retrait depuis le compte Swissquote<br/>n'est autorisé QUE vers un wallet dont la propriété est prouvée
```

## 6. Interaction avec une dApp (bonus)

**En une phrase :** avant d'appeler une application, le wallet vérifie qu'elle est approuvée par Swissquote et que son code n'a pas changé, puis bloque, freine ou laisse passer selon le résultat.

```mermaid
flowchart TB
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    classDef bad fill:#fecaca,stroke:#b91c1c,color:#450a0a
    A["Le client veut appeler une application"]:::real --> R["Registre des dApps approuvées<br/>adresse + empreinte du code (Swissquote, MOCK)"]:::mock
    A --> H["Le wallet recalcule l'empreinte du code<br/>directement sur la blockchain"]:::real
    R --> C{"Approuvée ET code identique ?"}
    H --> C
    C -->|"oui"| T["Simulation + résumé en langage clair<br/>puis Touch ID seul"]:::real
    C -->|"application inconnue"| W["Case à cocher + confirmation<br/>de l'appareil de secours"]:::real
    C -->|"même adresse, code changé"| X["Appel bloqué par le wallet"]:::bad
```

## 7. Frais sponsorisés : la « gas station »

**En une phrase :** une petite barrière limite les frais offerts par Swissquote (quota par wallet, plafond global, plafond de gaz), et au-delà le client peut payer ses frais en USDC sans coût pour la banque.

```mermaid
flowchart LR
    classDef real fill:#bbf7d0,stroke:#15803d,color:#052e16
    classDef mock fill:#fde68a,stroke:#b45309,color:#451a03
    classDef ext fill:#bfdbfe,stroke:#1d4ed8,color:#172554
    APP["App du client"]:::real -->|"demande de sponsoring"| G["Gas station (MOCK)<br/>1. quota par wallet et par jour<br/>2. plafond global quotidien<br/>3. plafond de gaz par opération<br/>4. seule méthode autorisée : sponsoriser"]:::mock
    G -->|"accepté"| P["Paymaster ZeroDev<br/>(Swissquote paie)"]:::ext
    G -->|"quota épuisé ou choix du client"| U["Option : le client paie ses frais en USDC<br/>(l'USDC est le seul jeton accepté, aucun coût pour Swissquote)"]:::real
    U --> P
    G -->|"plafond de gaz ou plafond global dépassé"| N["Refusé : réessayer plus tard"]:::real
```

## 8. Ce qui est réel, ce qui est simulé

**En une phrase :** le tableau de ce qui est vraiment construit et de ce qui est simulé et étiqueté MOCK, pour que le jury sache exactement ce qui est démontré.

Voir le tableau complet dans `PROJET.md` (section « Ce qui est simulé »).

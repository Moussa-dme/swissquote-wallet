# Architecture

> Brouillon factuel. **Vert = réel** (code ou service qui fonctionne vraiment, sur la blockchain de test Sepolia). **Orange = MOCK** (simulation, clairement étiquetée dans le code et l'interface). Les schémas s'affichent directement sur GitHub (format Mermaid) ; pour les slides, on peut les exporter en image avec <https://mermaid.live> (coller le code, « PNG »).

## 1. Vue d'ensemble : qui parle à qui

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

    COORD["Coordinateur de récupération<br/>routes /api/recovery<br/>relaie les approbations<br/>applique le délai annulable"]:::mock

    subgraph SQ["Faux serveur Swissquote — processus séparé, port 4000, stockage propre"]
        SQG["Gardien n°3 : 1 voix sur 3<br/>signe après vérification en personne"]:::mock
        SQB["Comptes clients, KYC en agence,<br/>contrôle d'adresses, liaison wallet,<br/>retraits (Travel Rule)"]:::mock
    end

    ZD["ZeroDev (cloud)<br/>serveur de passkeys<br/>bundler · paymaster (frais payés)"]:::ext

    subgraph CHAIN["Blockchain de test Sepolia"]
        ACCOUNT["Wallet du client<br/>compte intelligent Kernel (ERC-4337)<br/>propriétaire = passkey"]:::real
        GUARD["Compte gardien<br/>multisig 2 sur 3<br/>(appareil de secours, contact, Swissquote)"]:::real
        RECOV["Action de récupération + hook<br/>(contrats ZeroDev)"]:::real
        USDC["USDC de test (Circle)"]:::real
    end

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

## 6. Ce qui est réel, ce qui est simulé

Voir le tableau complet dans `PROJET.md` (section « Ce qui est simulé »).

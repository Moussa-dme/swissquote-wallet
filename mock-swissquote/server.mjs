// MOCK — Faux serveur Swissquote : gardien n°3 de la récupération (2 gardiens sur 3).
//
// Ce que la vraie banque ferait : vérifier l'identité du client (KYC) EN PERSONNE à une agence
// (pièce d'identité + signature), puis seulement signer son approbation. Ici, l'agent est simulé
// par la page /desk de l'app. Tout est MOCK : pas de vraie banque, pas de vrai KYC.
//
// Règles de sécurité implémentées (retours des mentors Swissquote) :
//  - Un numéro de téléphone / un e-mail / un code SMS ne suffisent JAMAIS (voir /cases/:id/otp).
//  - Swissquote ne signe qu'après la vérification en personne d'un dossier précis.
//  - Swissquote n'a qu'UNE voix sur trois : seule, elle ne peut ni récupérer ni bouger les fonds.
//  - Ce serveur est un processus séparé avec son propre stockage (data.json) et sa propre clé :
//    l'app cliente n'y a jamais accès.
//
// Lancer : cd mock-swissquote && node --env-file=../passkey-tutorial/.env.local server.mjs
import http from "node:http"
import fs from "node:fs"
import crypto from "node:crypto"
import { createPublicClient, http as viemHttp, encodeFunctionData, parseAbi, isAddress, isAddressEqual, keccak256, toHex } from "viem"
import { sepolia } from "viem/chains"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createZeroDevPaymasterClient } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import {
    createWeightedValidator, toECDSASigner, createWeightedKernelAccountClient,
    approveUserOperation, WeightedValidatorContractVersion
} from "@zerodev/weighted-validator"

const PORT = Number(process.env.PORT ?? 4000)
const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL
if (!RPC) throw new Error("NEXT_PUBLIC_BUNDLER_URL manquant (lance avec --env-file=../passkey-tutorial/.env.local)")
const DATA_FILE = new URL("./data.json", import.meta.url) // stockage propre à Swissquote (gitignoré)
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_1
const WV = WeightedValidatorContractVersion.V0_0_2_PATCHED
const recoveryFn = "function doRecovery(address _validator, bytes calldata _data)"
const publicClient = createPublicClient({ chain: sepolia, transport: viemHttp(RPC) })

// --- stockage ---
const load = () => (fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) : { cases: {} })
const save = (d) => fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), { mode: 0o600 })
let db = load()
if (!db.key) { db.key = generatePrivateKey(); save(db) } // clé de TEST jetable de « Swissquote »

// MOCK : base de clients Swissquote avec mot de passe. Le mentor a indiqué que l'authentification
// Swissquote est hors périmètre (« une simple base avec mot de passe suffit »).
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString("hex")
if (!db.customers) {
    db.customers = {}
    for (const [id, name, pw] of [["CH-1001", "Client Démo 1", "demo1234"], ["CH-1002", "Client Démo 2", "demo5678"]]) {
        const salt = crypto.randomBytes(8).toString("hex")
        db.customers[id] = { id, name, salt, hash: hashPw(pw, salt) }
    }
    save(db)
}
db.links ??= {} // liaisons client -> wallets dont la propriété a été prouvée

// MOCK : registre des dApps approuvées par Swissquote. Pour chaque application : son adresse ET l'empreinte
// (keccak256) de son code au moment de l'approbation. Le wallet recalcule l'empreinte sur la blockchain avant
// de signer : si le code a changé depuis l'approbation, l'adresse seule ne suffit plus (idée d'un étudiant
// du hackathon, saluée par le mentor : un contrat modifiable garde la même adresse).
const DEMO_NFT = "0x34bE7f35132E97915633BC1fc020364EA5134863"
db.dapps ??= {}
if (!db.dapps["demo-nft"]) {
    const code = await publicClient.getCode({ address: DEMO_NFT })
    if (code) {
        const hash = keccak256(code)
        db.dapps["demo-nft"] = { id: "demo-nft", name: "Démo NFT (ZeroDev)", description: "Crée un jeton de test gratuit (fonction mint). Aucune valeur, aucun fonds ne quitte le wallet.", address: DEMO_NFT, codeHash: hash, originalHash: hash, approvedAt: Date.now() }
        save(db)
    }
}
const sessions = new Map() // jeton -> { customer, exp }
const challenges = new Map() // nonce -> { customer, address, message, exp }
const sessionOf = (token) => { const x = sessions.get(token); return x && x.exp > Date.now() ? x : null }
const swissquote = privateKeyToAccount(db.key)

// --- helpers ---
const safe = (e) => String(e?.shortMessage ?? e?.message ?? e).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<ID>").slice(0, 400)
const send = (res, status, body, origin) => {
    res.writeHead(status, {
        "content-type": "application/json",
        "access-control-allow-origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS"
    })
    res.end(JSON.stringify(body))
}
const readBody = (req) => new Promise((resolve, reject) => {
    let s = ""
    req.on("data", (c) => { s += c; if (s.length > 1e5) reject(new Error("corps trop gros")) })
    req.on("end", () => { try { resolve(s ? JSON.parse(s) : {}) } catch (e) { reject(e) } })
})
const publicCase = (c) => ({ id: c.id, username: c.username, account: c.account, status: c.status, createdAt: c.createdAt, otpAttempts: c.otpAttempts })

// Construit le compte « gardien » 2-sur-3 vu par Swissquote (signataire = la clé de Swissquote)
async function guardianFor(guardians) {
    const config = {
        threshold: 100, delay: 0,
        signers: [guardians.backup, guardians.contact, guardians.swissquote].map((a) => ({ publicKey: a, weight: 50 }))
    }
    const signer = await toECDSASigner({ signer: swissquote })
    const validator = await createWeightedValidator(publicClient, { entryPoint, signer, config, kernelVersion, validatorContractVersion: WV })
    const account = await createKernelAccount(publicClient, { entryPoint, kernelVersion, plugins: { sudo: validator } })
    const paymaster = { getPaymasterData: (userOperation) => createZeroDevPaymasterClient({ chain: sepolia, transport: viemHttp(RPC) }).sponsorUserOperation({ userOperation }) }
    const client = createWeightedKernelAccountClient({ account, chain: sepolia, bundlerTransport: viemHttp(RPC), paymaster })
    return { account, client }
}

// MOCK : liste d'adresses « signalées » (fraude / sanctions). En production : un fournisseur de conformité
// (screening de sanctions, listes d'arnaques) ; ici, deux adresses inventées pour la démo.
const FLAGGED = {
    "0x000000000000000000000000000000000000dead": "Adresse signalée comme frauduleuse (liste MOCK)",
    "0x1111111111111111111111111111111111111111": "Adresse apparaissant sur une liste de sanctions (liste MOCK)"
}

const routes = {
    // Adresse du gardien Swissquote (clé publique, sans secret)
    "GET /guardian": async () => [200, { address: swissquote.address, mock: true }],

    // Contrôle d'une adresse destinataire. Swissquote AVERTIT le client mais ne bloque jamais son paiement
    // (en self-custody la banque n'a aucun pouvoir sur les fonds ; décision défendue dans le pitch).
    "GET /screen/:address": async (_b, p) => {
        const reason = FLAGGED[String(p.address).toLowerCase()]
        return [200, { address: p.address, flagged: Boolean(reason), reason: reason ?? null, mock: true }]
    },

    // ----- Registre des dApps approuvées (bonus « interaction conforme ») -----
    "GET /dapps": async () => [200, { dapps: Object.values(db.dapps), mock: true }],
    // MOCK de l'agent : simule une mise à jour du contrat (on ne peut pas modifier un vrai contrat pour la démo)
    "POST /desk/dapps/:id/simulate-update": async (_b, p) => {
        const d = db.dapps[p.id]
        if (!d) return [404, { error: "dApp inconnue" }]
        d.codeHash = keccak256(toHex("mise à jour simulée " + Date.now())); save(db)
        return [200, d]
    },
    "POST /desk/dapps/:id/reset": async (_b, p) => {
        const d = db.dapps[p.id]
        if (!d) return [404, { error: "dApp inconnue" }]
        d.codeHash = d.originalHash; save(db)
        return [200, d]
    },

    // ----- Compte Swissquote et liaison avec le wallet (sujet 3 du brief + Travel Rule) -----
    // Connexion au compte Swissquote (MOCK : numéro de client + mot de passe)
    "POST /auth/login": async (b) => {
        const c = db.customers[String(b.customer ?? "").toUpperCase()]
        const ok = c && crypto.timingSafeEqual(Buffer.from(hashPw(String(b.password ?? ""), c.salt), "hex"), Buffer.from(c.hash, "hex"))
        if (!ok) return [401, { error: "Numéro de client ou mot de passe incorrect." }]
        const token = crypto.randomBytes(16).toString("hex")
        sessions.set(token, { customer: c.id, exp: Date.now() + 30 * 60 * 1000 })
        return [200, { token, customer: c.id, name: c.name }]
    },

    // Étape 1 de la preuve de propriété : un message à signer, unique, qui expire
    "POST /wallet/challenge": async (b) => {
        const sess = sessionOf(b.token)
        if (!sess) return [401, { error: "Connecte-toi d'abord à ton compte Swissquote." }]
        if (!isAddress(b.address)) return [400, { error: "adresse invalide" }]
        const nonce = crypto.randomBytes(8).toString("hex"), exp = Date.now() + 5 * 60 * 1000
        const message = `Swissquote — preuve de propriété du wallet\nJe contrôle le wallet ${b.address} et je le lie au client ${sess.customer}.\nNonce : ${nonce}`
        challenges.set(nonce, { customer: sess.customer, address: b.address, message, exp })
        return [200, { nonce, message, expiresAt: exp }]
    },

    // Étape 2 : le wallet signe le message ; Swissquote vérifie la signature ON-CHAIN (ERC-1271, car le wallet
    // est un compte intelligent), sans jamais voir la moindre clé.
    "POST /wallet/link": async (b) => {
        const sess = sessionOf(b.token)
        if (!sess) return [401, { error: "Connecte-toi d'abord à ton compte Swissquote." }]
        const ch = challenges.get(b.nonce)
        if (!ch || ch.exp < Date.now()) return [400, { error: "Défi expiré ou inconnu : recommence." }]
        if (ch.customer !== sess.customer || !isAddressEqual(ch.address, b.address) || ch.message !== b.message) return [403, { error: "Le message signé ne correspond pas au défi." }]
        challenges.delete(b.nonce) // usage unique : pas de rejeu
        let valid = false
        try { valid = await publicClient.verifyMessage({ address: b.address, message: ch.message, signature: b.signature }) } catch (e) { return [403, { error: "Vérification de la signature impossible : " + safe(e) }] }
        if (!valid) return [403, { error: "Signature invalide : ce wallet n'a pas signé le message." }]
        const list = (db.links[sess.customer] ??= [])
        if (!list.some((l) => isAddressEqual(l.address, b.address))) list.push({ address: b.address, verifiedAt: Date.now(), method: "signature de message vérifiée on-chain (ERC-1271)" })
        save(db)
        return [200, { linked: true, customer: sess.customer, address: b.address }]
    },
    "POST /wallet/links": async (b) => {
        const sess = sessionOf(b.token)
        return sess ? [200, { customer: sess.customer, links: db.links[sess.customer] ?? [] }] : [401, { error: "Connecte-toi d'abord." }]
    },

    // MOCK de la Travel Rule : un retrait du compte Swissquote vers un wallet externe n'est autorisé
    // QUE si le client a prouvé en être le propriétaire. (La banque ne voit ni clé ni fonds du wallet.)
    "POST /withdraw": async (b) => {
        const sess = sessionOf(b.token)
        if (!sess) return [401, { error: "Connecte-toi d'abord à ton compte Swissquote." }]
        if (!isAddress(b.to)) return [400, { error: "adresse invalide" }]
        const link = (db.links[sess.customer] ?? []).find((l) => isAddressEqual(l.address, b.to))
        if (!link) return [403, { allowed: false, reason: "Wallet externe non vérifié : prouve que tu en es le propriétaire (signature) avant tout retrait. C'est exigé par la Travel Rule appliquée par la FINMA." }]
        return [200, { allowed: true, mock: true, reason: `Propriété du wallet vérifiée le ${new Date(link.verifiedAt).toLocaleString("fr-CH")} (${link.method}). Retrait de ${b.amount ?? "?"} autorisé (simulation : aucun fonds réel n'est déplacé).` }]
    },

    // Le client démarre une demande de récupération (dossier KYC simulé)
    "POST /cases": async (b) => {
        if (!b.username || !b.account) return [400, { error: "username et account requis" }]
        const id = crypto.randomBytes(4).toString("hex")
        db.cases[id] = { id, username: b.username, account: b.account, status: "awaiting_in_person_check", createdAt: Date.now(), otpAttempts: 0 }
        save(db)
        return [200, publicCase(db.cases[id])]
    },
    "GET /cases/:id": async (_b, p) => (db.cases[p.id] ? [200, publicCase(db.cases[p.id])] : [404, { error: "dossier inconnu" }]),

    // Canal faible (SMS / e-mail) : ne débloque JAMAIS rien. Sert à montrer le refus d'un attaquant
    // qui aurait volé le téléphone ET l'e-mail du client.
    "POST /cases/:id/otp": async (_b, p) => {
        const c = db.cases[p.id]
        if (!c) return [404, { error: "dossier inconnu" }]
        c.otpAttempts += 1; save(db)
        return [403, { refused: true, reason: "Un code SMS ou e-mail ne suffit pas pour une récupération. Présentez-vous en agence avec une pièce d'identité.", otpAttempts: c.otpAttempts }]
    },

    // MOCK de l'agent au guichet : « identité vérifiée en personne » (pas d'authentification d'agent ici)
    "GET /desk/cases": async () => [200, { cases: Object.values(db.cases).map(publicCase).reverse() }],
    "POST /desk/cases/:id/verify": async (_b, p) => {
        const c = db.cases[p.id]
        if (!c) return [404, { error: "dossier inconnu" }]
        if (c.status === "awaiting_in_person_check") { c.status = "verified_in_person"; c.verifiedAt = Date.now(); save(db) }
        return [200, publicCase(c)]
    },
    "POST /desk/cases/:id/reject": async (_b, p) => {
        const c = db.cases[p.id]
        if (!c) return [404, { error: "dossier inconnu" }]
        c.status = "rejected"; save(db)
        return [200, publicCase(c)]
    },

    // Signature d'approbation (1 voix sur 3). Le serveur RECONSTRUIT lui-même l'opération à signer
    // à partir des paramètres (il ne signe pas un blob opaque) et exige un dossier vérifié en personne.
    "POST /approve": async (b) => {
        const c = db.cases[b.caseId]
        if (!c) return [404, { error: "dossier inconnu" }]
        if (c.status !== "verified_in_person") return [403, { refused: true, reason: `Dossier non vérifié en personne (statut : ${c.status}).` }]
        const { guardians, target, newValidator, enableData } = b
        if (!guardians || !isAddressEqual(guardians.swissquote, swissquote.address)) return [400, { error: "la configuration des gardiens ne contient pas Swissquote" }]
        if (!isAddressEqual(target, c.account)) return [403, { refused: true, reason: "Le compte à récupérer ne correspond pas au dossier vérifié." }]
        const { account, client } = await guardianFor(guardians)
        const calls = [{ to: target, data: encodeFunctionData({ abi: parseAbi([recoveryFn]), functionName: "doRecovery", args: [newValidator, enableData] }) }]
        const callData = await account.encodeCalls(calls)
        const signature = await approveUserOperation(client, { callData, validatorContractVersion: WV })
        c.status = "approved"; c.approvedAt = Date.now(); save(db)
        return [200, { signature, callData, guardianAccount: account.address }]
    }
}

http.createServer(async (req, res) => {
    const origin = req.headers.origin
    if (req.method === "OPTIONS") return send(res, 204, {}, origin)
    const path = new URL(req.url, "http://x").pathname
    for (const [key, handler] of Object.entries(routes)) {
        const [method, pattern] = key.split(" ")
        if (method !== req.method) continue
        const names = []
        const re = new RegExp("^" + pattern.replace(/:([a-z]+)/g, (_m, n) => (names.push(n), "([^/]+)")) + "$")
        const m = path.match(re)
        if (!m) continue
        const params = Object.fromEntries(names.map((n, i) => [n, m[i + 1]]))
        try {
            const body = req.method === "POST" ? await readBody(req) : {}
            const [status, out] = await handler(body, params)
            return send(res, status, out, origin)
        } catch (e) { return send(res, 500, { error: safe(e) }, origin) }
    }
    send(res, 404, { error: "route inconnue" }, origin)
}).listen(PORT, () => console.log(`MOCK Swissquote sur http://localhost:${PORT} — gardien : ${swissquote.address}`))

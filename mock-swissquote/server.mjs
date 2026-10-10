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
import { createPublicClient, http as viemHttp, encodeFunctionData, parseAbi, isAddressEqual } from "viem"
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

const routes = {
    // Adresse du gardien Swissquote (clé publique, sans secret)
    "GET /guardian": async () => [200, { address: swissquote.address, mock: true }],

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

// Test de la liaison compte Swissquote <-> wallet (preuve de propriété ERC-1271) et de la Travel Rule (MOCK).
// Utilise le wallet de test de flow-test.mjs (déjà déployé, contrôlé par la clé « newOwner »).
import fs from "node:fs"
import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"
import { createKernelAccount } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL, SQ = "http://localhost:4000"
const entryPoint = getEntryPoint("0.7"), kernelVersion = KERNEL_V3_1
const pc = createPublicClient({ chain: sepolia, transport: http(RPC) })
const post = async (p, b) => { const r = await fetch(SQ + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return [r.status, await r.json()] }
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const k = JSON.parse(fs.readFileSync(new URL("./.keys_flow.json", import.meta.url), "utf8"))
const walletAddress = "0x8F47217974267115fEb1ba7062826e1bE415bC9f" // wallet de test (adresse inchangée après récupération)
const mkAccount = async (pk) => createKernelAccount(pc, { entryPoint, kernelVersion, address: walletAddress, plugins: { sudo: await signerToEcdsaValidator(pc, { signer: privateKeyToAccount(pk), entryPoint, kernelVersion }) } })
try {
    let [s, r] = await post("/auth/login", { customer: "CH-1001", password: "mauvais" })
    ok("mauvais mot de passe refusé", s === 401)
    ;[s, r] = await post("/auth/login", { customer: "CH-1001", password: "demo1234" })
    ok("connexion au compte Swissquote (MOCK)", s === 200, "→ " + r.customer); const token = r.token

    // retrait AVANT preuve de propriété => refusé (Travel Rule)
    ;[s, r] = await post("/withdraw", { token, to: walletAddress, amount: "100 USDC" })
    ok("retrait vers un wallet non vérifié refusé (Travel Rule)", s === 403, "→ " + r.reason.slice(0, 40) + "…")

    // preuve de propriété par le BON propriétaire
    let ch; ;[s, ch] = await post("/wallet/challenge", { token, address: walletAddress })
    ok("défi de propriété reçu", s === 200)
    const owner = await mkAccount(k.newOwner)
    const signature = await owner.signMessage({ message: ch.message })
    ;[s, r] = await post("/wallet/link", { token, address: walletAddress, nonce: ch.nonce, message: ch.message, signature })
    ok("propriété prouvée par signature vérifiée on-chain (ERC-1271)", s === 200 && r.linked, s !== 200 ? "→ " + JSON.stringify(r) : "")

    // rejeu du même défi => refusé
    ;[s, r] = await post("/wallet/link", { token, address: walletAddress, nonce: ch.nonce, message: ch.message, signature })
    ok("rejeu du même défi refusé", s === 400)

    // mauvaise clé (ancien propriétaire) => refusé
    let ch2; ;[s, ch2] = await post("/wallet/challenge", { token, address: walletAddress })
    const bad = await (await mkAccount(k.owner)).signMessage({ message: ch2.message })
    ;[s, r] = await post("/wallet/link", { token, address: walletAddress, nonce: ch2.nonce, message: ch2.message, signature: bad })
    ok("signature de l'ancien propriétaire refusée", s === 403, "→ " + String(r.error).slice(0, 50))

    // retrait APRÈS preuve => autorisé ; vers une autre adresse => refusé
    ;[s, r] = await post("/withdraw", { token, to: walletAddress, amount: "100 USDC" })
    ok("retrait vers le wallet vérifié autorisé", s === 200 && r.allowed)
    ;[s, r] = await post("/withdraw", { token, to: "0x2222222222222222222222222222222222222222", amount: "100 USDC" })
    ok("retrait vers une adresse non vérifiée refusé", s === 403)
    // un autre client ne peut pas utiliser cette liaison
    const [, l2] = await post("/auth/login", { customer: "CH-1002", password: "demo5678" })
    ;[s, r] = await post("/withdraw", { token: l2.token, to: walletAddress })
    ok("un autre client ne profite pas de la liaison", s === 403)
} catch (e) { console.log("ÉCHEC :", String(e.shortMessage ?? e.message).slice(0, 300)); process.exitCode = 1 }

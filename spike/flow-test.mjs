// Test de bout en bout (sans navigateur) : propriétaire de TEST (clé ECDSA) + gardiens :
// backup = clé locale, contact = clé locale, Swissquote = le faux serveur (processus séparé).
// Lancer : node --env-file=../passkey-tutorial/.env.local flow-test.mjs   (serveur MOCK sur :4000)
import fs from "node:fs"
import { createPublicClient, http, parseAbi, encodeFunctionData, concat, toFunctionSelector, encodeAbiParameters, parseAbiParameters } from "viem"
import { sepolia } from "viem/chains"
import { generatePrivateKey, privateKeyToAccount, toAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, constants as zdConstants } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { createWeightedValidator, toECDSASigner, SIGNER_TYPE, createWeightedKernelAccountClient, approveUserOperation, sendUserOperationWithSignatures, WeightedValidatorContractVersion } from "@zerodev/weighted-validator"

const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL
const SQ = "http://localhost:4000"
const entryPoint = getEntryPoint("0.7"), kernelVersion = KERNEL_V3_1, WV = WeightedValidatorContractVersion.V0_0_2_PATCHED
const CALLER_HOOK = "0x2f6B23f3c2Fd7D91AF316c93076a00CAd42189a2", RECOVERY_ACTION = "0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E"
const recoveryFn = "function doRecovery(address _validator, bytes calldata _data)"
const installFn = "function installModule(uint256 _type, address _module, bytes calldata _initData)"
const safe = (e) => String(e?.shortMessage ?? e?.message ?? e).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<ID>").slice(0, 300)
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
const paymaster = { getPaymasterData: (userOperation) => createZeroDevPaymasterClient({ chain: sepolia, transport: http(RPC) }).sponsorUserOperation({ userOperation }) }
const post = async (p, b) => { const r = await fetch(SQ + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b ?? {}) }); return [r.status, await r.json()] }

const KF = new URL(`./.keys_flow${process.env.TAG ?? ""}.json`, import.meta.url)
const k = fs.existsSync(KF) ? JSON.parse(fs.readFileSync(KF, "utf8")) : {}
for (const n of ["owner", "newOwner", "backup", "contact", "dummy"]) if (!k[n]) k[n] = generatePrivateKey()
fs.writeFileSync(KF, JSON.stringify(k, null, 2), { mode: 0o600 })
const A = (n) => privateKeyToAccount(k[n])
const sqAddr = (await (await fetch(SQ + "/guardian")).json()).address
const guardians = { backup: A("backup").address, contact: A("contact").address, swissquote: sqAddr }

// Signataire « public » : une adresse de la liste des gardiens, SANS clé. Sert à construire/envoyer
// l'opération avec des signatures déjà collectées (il ne signe jamais rien).
const publicSigner = (address) => ({
    type: SIGNER_TYPE.ECDSA,
    getPublicKey: () => address,
    getDummySignature: () => zdConstants.DUMMY_ECDSA_SIG,
    account: toAccount({ address, async signMessage() { throw new Error("signataire public") }, async signTransaction() { throw new Error("signataire public") }, async signTypedData() { throw new Error("signataire public") } })
})
async function guardianFor(signerPk) {
    const config = { threshold: 100, delay: 0, signers: [guardians.backup, guardians.contact, guardians.swissquote].map((a) => ({ publicKey: a, weight: 50 })) }
    const signer = signerPk.startsWith("0x") && signerPk.length === 42 ? publicSigner(signerPk) : await toECDSASigner({ signer: privateKeyToAccount(signerPk) })
    const validator = await createWeightedValidator(publicClient, { entryPoint, signer, config, kernelVersion, validatorContractVersion: WV })
    const account = await createKernelAccount(publicClient, { entryPoint, kernelVersion, plugins: { sudo: validator } })
    const client = createWeightedKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster })
    return { account, client }
}
const ecdsaV = (n) => signerToEcdsaValidator(publicClient, { signer: A(n), entryPoint, kernelVersion })
const ownerAcc = async (name, address) => createKernelAccount(publicClient, { entryPoint, kernelVersion, plugins: { sudo: await ecdsaV(name) }, ...(address ? { address } : {}) })
const clientOf = (account) => createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster })
const ok = (label, cond, extra = "") => { console.log(cond ? "✅" : "❌", label, extra); if (!cond) process.exitCode = 1 }

try {
    const owner = await ownerAcc("owner")
    const g = await guardianFor(k.contact)
    console.log("compte à protéger :", owner.address, "| gardien 2/3 :", g.account.address)

    // 1) installation (déploie le compte si besoin, puis installe le gardien)
    const oc = clientOf(owner)
    const code = await publicClient.getCode({ address: owner.address })
    if (!code) { const h = await oc.sendUserOperation({ callData: await owner.encodeCalls([{ to: owner.address, value: 0n, data: "0x" }]) }); await oc.waitForUserOperationReceipt({ hash: h }) }
    const initData = concat([toFunctionSelector(parseAbi([recoveryFn])[0]), CALLER_HOOK, encodeAbiParameters(parseAbiParameters("bytes selectorData, bytes hookData"), ["0xff", concat(["0xff", encodeAbiParameters(parseAbiParameters("address[] guardians"), [[g.account.address]])])])])
    const h2 = await oc.sendUserOperation({ callData: encodeFunctionData({ abi: parseAbi([installFn]), functionName: "installModule", args: [3n, RECOVERY_ACTION, initData] }) })
    await oc.waitForUserOperationReceipt({ hash: h2 })
    console.log("• récupération installée")

    // 2) nouvelle clé (nouvel appareil) + demande
    const nv = await ecdsaV("newOwner")
    const enableData = await nv.getEnableData()
    const calls = [{ to: owner.address, data: encodeFunctionData({ abi: parseAbi([recoveryFn]), functionName: "doRecovery", args: [nv.address, enableData] }) }]
    const callData = await g.account.encodeCalls(calls)

    // 3) Swissquote : refus avant vérification en personne
    const [, kase] = await post("/cases", { username: "alice", account: owner.address })
    let [st, r] = await post(`/cases/${kase.id}/otp`, { code: "123456" })
    ok("code SMS/e-mail refusé (attaquant)", st === 403, "→ " + r.reason?.slice(0, 60))
    ;[st, r] = await post("/approve", { caseId: kase.id, guardians, target: owner.address, newValidator: nv.address, enableData })
    ok("signature refusée sans vérification en personne", st === 403, "→ " + r.reason)
    // 4) l'agent vérifie en personne
    await post(`/desk/cases/${kase.id}/verify`)
    ;[st, r] = await post("/approve", { caseId: kase.id, guardians, target: owner.address, newValidator: nv.address, enableData })
    ok("signature Swissquote après vérification en personne", st === 200)
    ok("le serveur a reconstruit le même callData", r.callData === callData)
    const sqSig = r.signature

    // 5) UN SEUL gardien (le contact, sans autre approbation) ne suffit pas
    try {
        const gx = await guardianFor(k.contact)
        await sendUserOperationWithSignatures(gx.client, { callData, signatures: [], callGasLimit: 1000000n })
        ok("un seul gardien refusé", false)
    } catch (e) { ok("un seul gardien refusé", true, "→ " + safe(e).slice(0, 70)) }

    // 6) le contact FINALISE avec l'approbation de Swissquote (2 voix : contact + Swissquote),
    //    SANS l'appareil de secours. Le dernier gardien signe lui-même et envoie.
    const gc = await guardianFor(k.contact)
    const hh = await sendUserOperationWithSignatures(gc.client, { callData, signatures: [sqSig], callGasLimit: 1000000n })
    const rc = await gc.client.waitForUserOperationReceipt({ hash: hh })
    ok("récupération exécutée avec contact + Swissquote (sans l'appareil de secours)", rc.success)

    // 7) vérification du résultat
    const tryOwner = async (name) => { try { const a = await ownerAcc(name, owner.address); const c = clientOf(a); const h = await c.sendUserOperation({ callData: await a.encodeCalls([{ to: a.address, value: 0n, data: "0x" }]) }); await c.waitForUserOperationReceipt({ hash: h }); return true } catch { return false } }
    ok("nouveau propriétaire accepté", await tryOwner("newOwner"))
    ok("ancien propriétaire refusé", !(await tryOwner("owner")))
} catch (e) { console.log("ÉCHEC :", safe(e)); if (process.env.DEBUG) console.log(String(e.stack).split("\n").slice(0, 8).join("\n")); process.exitCode = 1 }

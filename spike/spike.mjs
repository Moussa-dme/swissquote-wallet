// SPIKE (étude de faisabilité) : récupération par un gardien multisig 2-sur-3 sur Sepolia.
// Toutes les clés sont des clés de TEST jetables, générées ici (testnet uniquement).
// Usage : node --env-file=../passkey-tutorial/.env.local spike.mjs <étape>
//   étapes : keys | setup | recover | verify | status
import fs from "node:fs"
import {
    createPublicClient, http, parseAbi, encodeFunctionData, concat,
    toFunctionSelector, encodeAbiParameters, parseAbiParameters
} from "viem"
import { sepolia } from "viem/chains"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
    createWeightedValidator, toECDSASigner, createWeightedKernelAccountClient,
    approveUserOperation, sendUserOperationWithSignatures, WeightedValidatorContractVersion
} from "@zerodev/weighted-validator"

const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL
if (!RPC) throw new Error("NEXT_PUBLIC_BUNDLER_URL manquant (lance avec --env-file)")
const DELAY = Number(process.env.DELAY ?? 0) // secondes, délai du gardien multisig
const KEYS_FILE = new URL(`./.keys${process.env.TAG ?? ""}.json`, import.meta.url)
const entryPoint = getEntryPoint("0.7")
const kernelVersion = KERNEL_V3_1
const WV = WeightedValidatorContractVersion.V0_0_2_PATCHED

// Contrats de récupération ZeroDev (déployés sur Sepolia, vérifié avec eth_getCode)
const CALLER_HOOK = "0x2f6B23f3c2Fd7D91AF316c93076a00CAd42189a2"
const RECOVERY_ACTION = "0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E"
const recoveryFn = "function doRecovery(address _validator, bytes calldata _data)"
const installFn = "function installModule(uint256 _type, address _module, bytes calldata _initData)"

const safe = (e) => String(e?.shortMessage ?? e?.message ?? e).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<ID>").slice(0, 900)
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) })
const paymaster = {
    getPaymasterData: async (userOperation) => {
        const pm = createZeroDevPaymasterClient({ chain: sepolia, transport: http(RPC) })
        return pm.sponsorUserOperation({ userOperation })
    }
}

const loadKeys = () => (fs.existsSync(KEYS_FILE) ? JSON.parse(fs.readFileSync(KEYS_FILE, "utf8")) : {})
const saveKeys = (k) => fs.writeFileSync(KEYS_FILE, JSON.stringify(k, null, 2), { mode: 0o600 })
const acc = (k) => privateKeyToAccount(k)

function ensureKeys() {
    const k = loadKeys()
    for (const n of ["owner", "newOwner", "g1", "g2", "g3"]) if (!k[n]) k[n] = generatePrivateKey()
    saveKeys(k)
    return k
}

async function ecdsaValidator(pk) {
    return signerToEcdsaValidator(publicClient, { signer: acc(pk), entryPoint, kernelVersion })
}

async function ownerAccount(k, { address, usingNewOwner } = {}) {
    const validator = await ecdsaValidator(usingNewOwner ? k.newOwner : k.owner)
    return createKernelAccount(publicClient, { entryPoint, kernelVersion, plugins: { sudo: validator }, ...(address ? { address } : {}) })
}
const clientFor = (account) => createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster })

// Compte « gardien » : un compte Kernel dont le validateur est un multisig pondéré 2-sur-3.
async function guardianFor(k, who) {
    const config = {
        threshold: 100,
        delay: DELAY,
        signers: ["g1", "g2", "g3"].map((n) => ({ publicKey: acc(k[n]).address, weight: 50 }))
    }
    const signer = await toECDSASigner({ signer: acc(k[who]) })
    const validator = await createWeightedValidator(publicClient, { entryPoint, signer, config, kernelVersion, validatorContractVersion: WV })
    const account = await createKernelAccount(publicClient, { entryPoint, kernelVersion, plugins: { sudo: validator } })
    const client = createWeightedKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster })
    return { account, client }
}

const step = process.argv[2] ?? "status"
const k = ensureKeys()
const owner = await ownerAccount(k)
const g1 = await guardianFor(k, "g1")
console.log("compte propriétaire :", owner.address)
console.log("compte gardien (2-sur-3, délai", DELAY, "s) :", g1.account.address)

async function codeLen(a) { const c = await publicClient.getCode({ address: a }); return c ? (c.length - 2) / 2 : 0 }

try {
    if (step === "setup") {
        // 1) déploie le compte propriétaire (opération vide)
        const oc = clientFor(owner)
        if (!(await codeLen(owner.address))) {
            const h = await oc.sendUserOperation({ callData: await owner.encodeCalls([{ to: owner.address, value: 0n, data: "0x" }]) })
            await oc.waitForUserOperationReceipt({ hash: h })
            console.log("✓ compte propriétaire déployé")
        } else console.log("• compte propriétaire déjà déployé")
        // 2) installe l'action de récupération avec UN gardien = le compte multisig
        const initData = concat([
            toFunctionSelector(parseAbi([recoveryFn])[0]),
            CALLER_HOOK,
            encodeAbiParameters(parseAbiParameters("bytes selectorData, bytes hookData"), [
                "0xff",
                concat(["0xff", encodeAbiParameters(parseAbiParameters("address[] guardians"), [[g1.account.address]])])
            ])
        ])
        const h2 = await oc.sendUserOperation({
            callData: encodeFunctionData({ abi: parseAbi([installFn]), functionName: "installModule", args: [3n, RECOVERY_ACTION, initData] })
        })
        await oc.waitForUserOperationReceipt({ hash: h2 })
        console.log("✓ action de récupération installée, gardien =", g1.account.address)
    }

    if (step === "recover") {
        // le gardien (2 signatures sur 3) remplace le propriétaire par newOwner
        const newValidator = await ecdsaValidator(k.newOwner)
        const calls = [{
            to: owner.address,
            data: encodeFunctionData({ abi: parseAbi([recoveryFn]), functionName: "doRecovery", args: [newValidator.address, await newValidator.getEnableData()] })
        }]
        const callData = await g1.account.encodeCalls(calls)
        const signers = (process.env.SIGNERS ?? "g1,g2").split(",")
        const sigs = []
        for (const w of signers) {
            const g = await guardianFor(k, w)
            sigs.push(await approveUserOperation(g.client, { callData, validatorContractVersion: WV }))
            console.log("  approbation de", w, "OK")
        }
        const h = await sendUserOperationWithSignatures(g1.client, { callData, signatures: sigs, callGasLimit: 1000000n })
        console.log("userOp envoyée :", h.slice(0, 14) + "…")
        const r = await g1.client.waitForUserOperationReceipt({ hash: h })
        console.log("✓ récupération exécutée, succès =", r.success)
    }

    if (step === "verify") {
        // le NOUVEAU propriétaire doit pouvoir agir ; l'ANCIEN ne doit plus pouvoir
        const tryOwner = async (label, usingNewOwner) => {
            try {
                const a = await ownerAccount(k, { address: owner.address, usingNewOwner })
                const c = clientFor(a)
                const h = await c.sendUserOperation({ callData: await a.encodeCalls([{ to: a.address, value: 0n, data: "0x" }]) })
                await c.waitForUserOperationReceipt({ hash: h })
                console.log(label, "→ ACCEPTÉ")
            } catch (e) { console.log(label, "→ REFUSÉ :", safe(e)) }
        }
        await tryOwner("nouveau propriétaire", true)
        await tryOwner("ancien propriétaire ", false)
    }
} catch (e) {
    console.log("ÉCHEC à l'étape", step, ":", safe(e))
    if (process.env.DEBUG) console.log(String(e?.stack).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<ID>").split("\n").slice(0, 14).join("\n"))
    process.exitCode = 1
}

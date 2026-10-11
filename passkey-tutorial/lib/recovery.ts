// Récupération par gardiens 2-sur-3 (briques ZeroDev uniquement, aucune crypto maison).
//
// Principe (validé par script sur Sepolia, voir spike/flow-test.mjs) :
//  - Le compte du client (Kernel, propriétaire = passkey) installe l'action de récupération ZeroDev
//    avec UN gardien : un compte Kernel dont le validateur est un multisig pondéré 2-sur-3.
//  - Les 3 signataires : « backup » (appareil de secours), « contact » (contact de confiance),
//    « swissquote » (gardien MOCK, serveur séparé). Poids 50 chacun, seuil 100 => 2 voix requises.
//  - La récupération remplace le propriétaire par un NOUVEAU passkey, l'adresse du wallet ne change pas.
//  - Les signatures sont collectées séparément ; le dernier gardien signe lui-même et envoie l'opération
//    (le SDK ajoute la signature de l'expéditeur en dernier).
import {
    Address, Hex, concat, createPublicClient, encodeAbiParameters, encodeFunctionData,
    http, parseAbi, parseAbiParameters, toFunctionSelector
} from "viem"
import { sepolia } from "viem/chains"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, getERC20PaymasterApproveCall } from "@zerodev/sdk"
import {
    PasskeyValidatorContractVersion, WebAuthnMode, deserializePasskeyValidator, toPasskeyValidator, toWebAuthnKey
} from "@zerodev/passkey-validator"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import {
    createWeightedValidator, toECDSASigner, createWeightedKernelAccountClient,
    approveUserOperation, sendUserOperationWithSignatures, WeightedValidatorContractVersion
} from "@zerodev/weighted-validator"

export const RPC_URL = process.env.NEXT_PUBLIC_BUNDLER_URL ?? ""
export const PASSKEY_SERVER_URL = process.env.NEXT_PUBLIC_PASSKEY_SERVER_URL ?? ""
export const SWISSQUOTE_URL = process.env.NEXT_PUBLIC_SWISSQUOTE_URL ?? "http://localhost:4000" // MOCK
export const CHAIN = sepolia
export const entryPoint = getEntryPoint("0.7")
export const kernelVersion = KERNEL_V3_1
const WV = WeightedValidatorContractVersion.V0_0_2_PATCHED

// Contrats de récupération ZeroDev (déployés sur Sepolia)
const CALLER_HOOK = "0x2f6B23f3c2Fd7D91AF316c93076a00CAd42189a2"
const RECOVERY_ACTION = "0xe884C2868CC82c16177eC73a93f7D9E6F3A5DC6E"
const ACTION_MODULE_TYPE = BigInt(3)
const recoveryFn = "function doRecovery(address _validator, bytes calldata _data)"
const installFn = "function installModule(uint256 _type, address _module, bytes calldata _initData)"

export type Role = "backup" | "contact" | "swissquote"
export const ROLES: Role[] = ["backup", "contact", "swissquote"] // l'ordre fait partie de la configuration
export type Guardians = Record<Role, Address>
export const ROLE_LABEL: Record<Role, string> = {
    backup: "Appareil de secours",
    contact: "Contact de confiance",
    swissquote: "Swissquote (MOCK)"
}

export const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })

// Le sponsoring des frais passe par la « gas station » (MOCK, app/api/gas) qui applique des quotas anti-abus
// avant d'appeler le paymaster ZeroDev (dont l'adresse reste côté serveur).
export const gasStationUrl = () => (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000") + "/api/gas"
const paymaster = {
    getPaymasterData: async (userOperation: any) => {
        const pm = createZeroDevPaymasterClient({ chain: CHAIN, transport: http(gasStationUrl()) })
        return pm.sponsorUserOperation({ userOperation })
    }
}

// Option « payer les frais en USDC » : le client paie lui-même, en USDC, au lieu du sponsoring de Swissquote.
// Le paymaster prélève le montant en USDC ; le wallet doit d'abord l'y autoriser (appel « approve » ajouté
// à la même opération). Utile surtout quand le quota gratuit du jour est épuisé.
export const GAS_TOKEN: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // USDC de test (même adresse que lib/policy.ts)
export function kernelClientPayingInUsdc(account: any) {
    const pm = createZeroDevPaymasterClient({ chain: CHAIN, transport: http(gasStationUrl()) })
    const paymasterUsdc = {
        getPaymasterData: async (userOperation: any) => pm.sponsorUserOperation({ userOperation, gasToken: GAS_TOKEN } as any)
    }
    const client = createKernelAccountClient({ account, chain: CHAIN, bundlerTransport: http(RPC_URL), paymaster: paymasterUsdc } as any) as any
    // autorisation donnée au paymaster de prélever jusqu'à 5 USDC de frais pour cette opération.
    // Mesuré sur Sepolia : une opération avec passkey coûte ≈ 1,5 USDC ; avec 1 USDC d'autorisation, le prélèvement échouait.
    const approveCall = async () => getERC20PaymasterApproveCall(pm as any, { gasToken: GAS_TOKEN, approveAmount: BigInt(5_000_000), entryPoint } as any)
    return { client, approveCall }
}

// L'ancien appareil d'un wallet récupéré : la blockchain refuse sa signature (AA24 / signature invalide).
export const isObsoleteSignerError = (e: any) =>
    /AA24|Signature provided for the User Operation is invalid/i.test([e?.details, e?.shortMessage, e?.message, e?.cause?.message].map((x) => String(x ?? "")).join(" "))
export const notifyObsolete = () => { try { window.dispatchEvent(new Event("wallet-obsolete")) } catch {} }

// Message d'erreur lisible, sans fuite du Project ID
export const errText = (e: any) =>
    String(e?.details ?? e?.shortMessage ?? e?.message ?? e)
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<ID>")
        .slice(0, 400)

export const newGuardianKey = () => generatePrivateKey()
export const addressOf = (pk: Hex) => privateKeyToAccount(pk).address

// Compte « gardien » 2-sur-3 vu par le signataire dont la clé est `pk`
async function guardianFor(guardians: Guardians, pk: Hex) {
    const config = {
        threshold: 100,
        delay: 0, // le délai annulable est appliqué par le coordinateur (voir app/api/recovery), pas par ce champ
        signers: ROLES.map((r) => ({ publicKey: guardians[r], weight: 50 }))
    }
    const signer = await toECDSASigner({ signer: privateKeyToAccount(pk) })
    const validator = await createWeightedValidator(publicClient as any, {
        entryPoint, signer, config, kernelVersion, validatorContractVersion: WV
    } as any)
    const account = await createKernelAccount(publicClient as any, {
        entryPoint, kernelVersion, plugins: { sudo: validator }
    } as any)
    const client = createWeightedKernelAccountClient({
        account, chain: CHAIN, bundlerTransport: http(RPC_URL), paymaster
    } as any)
    return { account: account as any, client: client as any }
}

// L'adresse du compte gardien ne dépend que de la configuration (pas du signataire) : clé jetable.
export async function guardianAccountAddress(guardians: Guardians): Promise<Address> {
    return (await guardianFor(guardians, generatePrivateKey())).account.address
}

// callData à envoyer depuis le compte du client (signé par son passkey) pour installer la récupération
export function buildInstallCallData(guardianAccount: Address): Hex {
    const initData = concat([
        toFunctionSelector(parseAbi([recoveryFn])[0]),
        CALLER_HOOK as Hex,
        encodeAbiParameters(parseAbiParameters("bytes selectorData, bytes hookData"), [
            "0xff",
            concat(["0xff", encodeAbiParameters(parseAbiParameters("address[] guardians"), [[guardianAccount]])])
        ])
    ])
    return encodeFunctionData({
        abi: parseAbi([installFn]), functionName: "installModule",
        args: [ACTION_MODULE_TYPE, RECOVERY_ACTION, initData]
    })
}

// callData de l'opération de récupération (identique pour tous les gardiens)
export async function buildRecoveryCallData(
    guardians: Guardians, target: Address, newValidator: Address, enableData: Hex
): Promise<Hex> {
    const { account } = await guardianFor(guardians, generatePrivateKey())
    return account.encodeCalls([{
        to: target,
        data: encodeFunctionData({ abi: parseAbi([recoveryFn]), functionName: "doRecovery", args: [newValidator, enableData] })
    }])
}

// Un gardien signe son approbation (ne coûte rien, n'envoie rien sur la blockchain)
export async function approveRecovery(guardians: Guardians, pk: Hex, callData: Hex): Promise<Hex> {
    const { client } = await guardianFor(guardians, pk)
    return approveUserOperation(client, { callData, validatorContractVersion: WV } as any)
}

// Le dernier gardien finalise : il signe lui-même, ajoute les approbations des autres et envoie
export async function finalizeRecovery(
    guardians: Guardians, pk: Hex, callData: Hex, otherSignatures: Hex[]
): Promise<{ hash: Hex; success: boolean }> {
    const { client } = await guardianFor(guardians, pk)
    const hash = await sendUserOperationWithSignatures(client, {
        callData, signatures: otherSignatures, callGasLimit: BigInt(1000000)
    } as any)
    const receipt = await client.waitForUserOperationReceipt({ hash })
    return { hash, success: receipt.success }
}

export const fmtAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "")

// --- Passkey (nouvel appareil) et accès au wallet récupéré ---

// Crée (Register) ou retrouve (Login) un passkey et renvoie son validateur Kernel
export async function passkeyValidatorFor(passkeyName: string, mode: "register" | "login") {
    const webAuthnKey = await toWebAuthnKey({
        passkeyName,
        passkeyServerUrl: PASSKEY_SERVER_URL,
        mode: mode === "register" ? WebAuthnMode.Register : WebAuthnMode.Login,
        passkeyServerHeaders: {}
    })
    return toPasskeyValidator(publicClient as any, {
        webAuthnKey, entryPoint, kernelVersion,
        validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED
    } as any)
}

// Retrouve EXACTEMENT le passkey créé à la demande de récupération (identifiant de credential mémorisé),
// au lieu de laisser le navigateur proposer n'importe quel passkey du site (risque de choisir l'ancien).
export async function passkeyValidatorFromSerialized(serializedData: string) {
    return deserializePasskeyValidator(publicClient as any, { serializedData, entryPoint, kernelVersion } as any)
}

// Wallet existant (adresse inchangée) piloté par le NOUVEAU passkey, avec gas sponsorisé
export async function recoveredWallet(validator: any, address: Address) {
    const account = await createKernelAccount(publicClient as any, {
        entryPoint, kernelVersion, plugins: { sudo: validator }, address
    } as any)
    const client = createKernelAccountClient({ account, chain: CHAIN, bundlerTransport: http(RPC_URL), paymaster } as any)
    return { account: account as any, client: client as any }
}

// Petit client JSON pour le coordinateur (/api/recovery) et le faux serveur Swissquote
export async function api(url: string, body?: unknown) {
    const r = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    return { ok: r.ok, status: r.status, data: j as any }
}
export const coord = (path: string, body?: unknown) => api(`/api/recovery/${path}`, body)

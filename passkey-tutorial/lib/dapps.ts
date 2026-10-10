// Vérification d'une dApp AVANT de signer (bonus « interaction conforme »).
// Le registre des dApps approuvées vient de Swissquote (MOCK) ; l'empreinte du code est RECALCULÉE par le
// wallet directement sur la blockchain : Swissquote ne peut pas mentir sur le contenu d'un contrat.
import { Address, Hex, keccak256, parseAbi } from "viem"
import { SWISSQUOTE_URL, publicClient } from "./recovery"

export type DappEntry = { id: string; name: string; description: string; address: Address; codeHash: Hex; implementationHash?: Hex; approvedAt: number }
export type DappCheck = {
    status: "approved" | "unknown" | "changed"
    entry?: DappEntry
    onchainHash: Hex | null
    isProxy: boolean
    implementation?: Address
    reason: string
}
export const dappAbi = parseAbi(["function mint(address _to) public"])
const EIP1967_IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex

export async function loadRegistry(): Promise<DappEntry[]> {
    const r = await fetch(`${SWISSQUOTE_URL}/dapps`).then((x) => x.json())
    return r.dapps ?? []
}

export async function checkDapp(address: Address, registry: DappEntry[]): Promise<DappCheck> {
    const entry = registry.find((d) => d.address.toLowerCase() === address.toLowerCase())
    const code = await publicClient.getCode({ address })
    if (!code || code === "0x") return { status: "unknown", entry, onchainHash: null, isProxy: false, reason: "Aucun contrat à cette adresse : ce n'est pas une application." }
    const onchainHash = keccak256(code)
    // contrat modifiable (proxy EIP-1967) : le code réel est à une autre adresse et peut changer sans que celle-ci change
    const slot = await publicClient.getStorageAt({ address, slot: EIP1967_IMPL })
    const implementation = slot && BigInt(slot) !== BigInt(0) ? (`0x${slot.slice(-40)}` as Address) : undefined
    const isProxy = Boolean(implementation)
    if (!entry) return { status: "unknown", onchainHash, isProxy, implementation, reason: "Cette application n'est pas dans la liste approuvée par Swissquote." }
    if (onchainHash !== entry.codeHash) return { status: "changed", entry, onchainHash, isProxy, implementation, reason: "Le code de ce contrat a changé depuis son approbation : l'adresse est la même, mais ce n'est plus le contrat qui a été vérifié." }
    if (isProxy) {
        const implCode = await publicClient.getCode({ address: implementation! })
        const implHash = implCode ? keccak256(implCode) : null
        if (!entry.implementationHash || implHash !== entry.implementationHash)
            return { status: "changed", entry, onchainHash, isProxy, implementation, reason: "Contrat modifiable (proxy) dont le code réel n'est pas couvert par l'approbation, ou a changé." }
    }
    return { status: "approved", entry, onchainHash, isProxy, implementation, reason: "Application approuvée et code identique à celui qui a été vérifié." }
}

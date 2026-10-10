// Test de la vérification des dApps (même logique que passkey-tutorial/lib/dapps.ts).
import { createPublicClient, http, keccak256 } from "viem"
import { sepolia } from "viem/chains"
const pc = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL) })
const SQ = "http://localhost:4000"
const IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const post = (p) => fetch(SQ + p, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.json())
async function check(address) {
    const reg = (await (await fetch(SQ + "/dapps")).json()).dapps
    const entry = reg.find((d) => d.address.toLowerCase() === address.toLowerCase())
    const code = await pc.getCode({ address })
    if (!code || code === "0x") return "unknown(aucun contrat)"
    const h = keccak256(code)
    const slot = await pc.getStorageAt({ address, slot: IMPL })
    const isProxy = slot && BigInt(slot) !== 0n
    if (!entry) return "unknown"
    if (h !== entry.codeHash) return "changed"
    if (isProxy) return "changed(proxy non couvert)"
    return "approved"
}
const NFT = "0x34bE7f35132E97915633BC1fc020364EA5134863", USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
try {
    await post("/desk/dapps/demo-nft/reset")
    ok("dApp approuvée, code identique", (await check(NFT)) === "approved")
    const u = await check(USDC)
    ok("contrat absent du registre : inconnu", u.startsWith("unknown"), "→ " + u)
    ok("adresse sans contrat : refusée", (await check("0x2222222222222222222222222222222222222222")).startsWith("unknown"))
    await post("/desk/dapps/demo-nft/simulate-update")
    ok("même adresse, mais code changé : détecté", (await check(NFT)) === "changed")
    await post("/desk/dapps/demo-nft/reset")
    ok("rétablie : de nouveau approuvée", (await check(NFT)) === "approved")
} catch (e) { console.log("ÉCHEC :", String(e.shortMessage ?? e.message).slice(0, 200)); process.exitCode = 1 }

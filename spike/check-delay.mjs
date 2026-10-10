import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { getValidatorAddress, WeightedValidatorContractVersion } from "@zerodev/weighted-validator"
import { getEntryPoint } from "@zerodev/sdk/constants"
const abi = [{ type: "function", name: "weightedStorage", stateMutability: "view", inputs: [{ name: "kernel", type: "address" }], outputs: [{ name: "totalWeight", type: "uint24" }, { name: "threshold", type: "uint24" }, { name: "delay", type: "uint48" }, { name: "guardianLength", type: "uint32" }] }]
const c = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL) })
const v = getValidatorAddress(getEntryPoint("0.7").version, WeightedValidatorContractVersion.V0_0_2_PATCHED)
for (const [label, a] of [["délai 60 s", "0xDa2127AB49Cf81CEf62C1784388c245b8D253a4d"], ["délai 0", "0xB1C313b7A2a9173E366c0580073F88a50f151c27"]]) {
  try { const r = await c.readContract({ address: v, abi, functionName: "weightedStorage", args: [a] }); console.log(label, "→ poids total", r[0], "| seuil", r[1], "| délai stocké", r[2], "| nb gardiens", r[3]) }
  catch (e) { console.log(label, "→ erreur lecture", String(e.shortMessage ?? e).slice(0, 120)) }
}

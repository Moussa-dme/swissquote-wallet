import { createPublicClient, http, decodeAbiParameters } from "viem"
import { sepolia } from "viem/chains"
const c = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL) })
const st = await (await fetch("http://localhost:3000/api/recovery/state?username=Bob")).json()
const r = st.requests[0], acct = st.setup.account
const [xy, hash] = decodeAbiParameters([{ type: "tuple", components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }] }, { type: "bytes32" }], r.enableData)
console.log("clé publique de la demande (X) :", xy.x.toString(16).slice(0, 16) + "…", "| authenticatorIdHash :", hash.slice(0, 14) + "…")
for (const outs of [["uint256 pubKeyX", "uint256 pubKeyY", "bytes32 authenticatorIdHash"], ["uint256 pubKeyX", "uint256 pubKeyY"]]) {
  try {
    const abi = [{ type: "function", name: "webAuthnSignerStorage", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: outs.map((o) => ({ type: o.split(" ")[0], name: o.split(" ")[1] })) }]
    const v = await c.readContract({ address: r.newValidator, abi, functionName: "webAuthnSignerStorage", args: [acct] })
    console.log("clé enregistrée sur la blockchain (X) :", BigInt(v[0]).toString(16).slice(0, 16) + "…", "| hash :", String(v[2] ?? "").slice(0, 14))
    console.log("→ identique à la clé de la demande :", BigInt(v[0]) === xy.x && BigInt(v[1]) === xy.y)
    break
  } catch (e) { console.log("lecture", outs.length, "valeurs impossible :", String(e.shortMessage ?? e).slice(0, 90)) }
}

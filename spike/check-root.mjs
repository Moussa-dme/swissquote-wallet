import { createPublicClient, http, parseAbi } from "viem"
import { sepolia } from "viem/chains"
const c = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL) })
const st = await (await fetch("http://localhost:3000/api/recovery/state?username=Bob")).json()
const r = st.requests[0]
console.log("demande", r.id, "statut :", r.status, "| approuvé par", r.approvedBy.join(", "))
const acct = st.setup.account
const root = await c.readContract({ address: acct, abi: parseAbi(["function rootValidator() view returns (bytes21)"]), functionName: "rootValidator" })
console.log("validateur racine actuel du wallet :", root)
console.log("nouveau validateur de la demande   :", r.newValidator)
console.log("→ le wallet est contrôlé par le NOUVEAU validateur :", root.toLowerCase().includes(r.newValidator.slice(2).toLowerCase()))

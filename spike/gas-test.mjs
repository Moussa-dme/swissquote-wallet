// Test de la gas station : une vraie opération sponsorisée, méthode interdite, quota dépassé.
import fs from "node:fs"
import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL, GAS = "http://localhost:3000/api/gas"
const entryPoint = getEntryPoint("0.7"), kernelVersion = KERNEL_V3_1
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const usage = async (a) => (await fetch(`http://localhost:3000/api/gas/usage?address=${a}`)).json()
const rpc = async (b) => (await fetch(GAS, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...b }) })).json()
const k = JSON.parse(fs.readFileSync(new URL("./.keys_flow.json", import.meta.url), "utf8"))
const wallet = "0x8F47217974267115fEb1ba7062826e1bE415bC9f"
try {
    const pc = createPublicClient({ chain: sepolia, transport: http(RPC) })
    const account = await createKernelAccount(pc, { entryPoint, kernelVersion, address: wallet, plugins: { sudo: await signerToEcdsaValidator(pc, { signer: privateKeyToAccount(k.newOwner), entryPoint, kernelVersion }) } })
    const paymaster = { getPaymasterData: (userOperation) => createZeroDevPaymasterClient({ chain: sepolia, transport: http(GAS) }).sponsorUserOperation({ userOperation }) }
    const client = createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster })
    const before = await usage(wallet)
    const h = await client.sendUserOperation({ callData: await account.encodeCalls([{ to: wallet, value: 0n, data: "0x" }]) })
    const r = await client.waitForUserOperationReceipt({ hash: h })
    const after = await usage(wallet)
    ok("opération réellement sponsorisée à travers la gas station", r.success)
    ok("le quota du wallet est décompté", after.walletUsed > before.walletUsed, `→ ${after.walletUsed}/${after.walletQuota} aujourd'hui`)
    const bad = await rpc({ method: "eth_chainId", params: [] })
    ok("méthode autre que le sponsoring refusée", Boolean(bad.error), "→ " + bad.error?.message)
    const noSender = await rpc({ method: "zd_sponsorUserOperation", params: [{ userOp: {} }] })
    ok("opération sans expéditeur refusée", Boolean(noSender.error))
    // quota : un wallet factice fait des demandes jusqu'au refus
    const fake = "0x00000000000000000000000000000000000f4ce0"
    let refusedAt = 0
    for (let i = 1; i <= after.walletQuota + 2; i++) {
        const o = await rpc({ method: "zd_sponsorUserOperation", params: [{ chainId: 11155111, userOp: { sender: fake }, entryPointAddress: entryPoint.address }] })
        if (/Quota/.test(o.error?.message ?? "")) { refusedAt = i; console.log("   message :", o.error.message); break }
    }
    ok("dépassement du quota quotidien refusé", refusedAt === after.walletQuota + 1, `→ refusé à la demande n°${refusedAt}`)
    const u = await usage(fake)
    ok("le plafond global et les refus sont comptés", u.globalUsed > 0 && u.refusedToday > 0, `→ global ${u.globalUsed}/${u.globalQuota}, refus ${u.refusedToday}`)
} catch (e) { console.log("ÉCHEC :", String(e.shortMessage ?? e.message).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<ID>").slice(0, 300)); process.exitCode = 1 }

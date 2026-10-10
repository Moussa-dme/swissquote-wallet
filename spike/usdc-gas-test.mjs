// Test : payer les frais EN USDC (au lieu du sponsoring), à travers la gas station.
// Prérequis : le wallet de test 0x8F47… doit avoir des USDC de test (faucet.circle.com, Ethereum Sepolia).
import fs from "node:fs"
import { createPublicClient, http, parseAbi, encodeFunctionData } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, getERC20PaymasterApproveCall } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL, GAS = "http://localhost:3000/api/gas"
const entryPoint = getEntryPoint("0.7"), kernelVersion = KERNEL_V3_1
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", W = "0x8F47217974267115fEb1ba7062826e1bE415bC9f"
const erc20 = parseAbi(["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"])
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const usage = async () => (await fetch(`http://localhost:3000/api/gas/usage?address=${W}`)).json()
const rpc = async (b) => (await fetch(GAS, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...b }) })).json()
const k = JSON.parse(fs.readFileSync(new URL("./.keys_flow.json", import.meta.url), "utf8"))
try {
    const pc = createPublicClient({ chain: sepolia, transport: http(RPC) })
    const bal = async () => pc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [W] })
    const b0 = await bal()
    console.log("USDC du wallet avant :", Number(b0) / 1e6)
    if (b0 < 3_000_000n) throw new Error("Il faut au moins 3 USDC sur le wallet de test (faucet.circle.com).")
    // jeton refusé : autre que l'USDC
    const bad = await rpc({ method: "zd_sponsorUserOperation", params: [{ chainId: 11155111, userOp: { sender: W }, entryPointAddress: entryPoint.address, gasTokenData: { tokenAddress: "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B" } }] })
    ok("un autre jeton que l'USDC est refusé par la gas station", /seul l'USDC/.test(bad.error?.message ?? ""))

    const account = await createKernelAccount(pc, { entryPoint, kernelVersion, address: W, plugins: { sudo: await signerToEcdsaValidator(pc, { signer: privateKeyToAccount(k.newOwner), entryPoint, kernelVersion }) } })
    const pm = createZeroDevPaymasterClient({ chain: sepolia, transport: http(GAS) })
    const client = createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster: { getPaymasterData: (userOperation) => pm.sponsorUserOperation({ userOperation, gasToken: USDC }) } })
    const u0 = await usage()
    const approve = await getERC20PaymasterApproveCall(pm, { gasToken: USDC, approveAmount: 5_000_000n, entryPoint })
    const transfer = { to: USDC, value: 0n, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: ["0x2222222222222222222222222222222222222222", 1_000_000n] }) }
    const h = await client.sendUserOperation({ callData: await account.encodeCalls([approve, transfer]) })
    const r = await client.waitForUserOperationReceipt({ hash: h })
    ok("opération avec frais payés en USDC exécutée", r.success)
    const b1 = await bal(), spent = Number(b0 - b1) / 1e6
    ok("le wallet a payé le transfert (1 USDC) + des frais en USDC", spent > 1 && spent < 4, `→ dépensé ${spent} USDC dont ≈ ${(spent - 1).toFixed(4)} de frais`)
    const eth = await pc.getBalance({ address: W })
    ok("le wallet n'a toujours aucun ETH", eth === 0n)
    const u1 = await usage()
    ok("aucun quota gratuit consommé, opération comptée comme payée", u1.walletUsed === u0.walletUsed && u1.paidInUsdcToday > (u0.paidInUsdcToday ?? 0), `→ gratuits ${u1.walletUsed}, payées en USDC aujourd'hui ${u1.paidInUsdcToday}`)
} catch (e) {
    const clean = (x) => String(x ?? "").replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<ID>").slice(0, 500)
    console.log("ÉCHEC :", clean(e.shortMessage ?? e.message))
    console.log("  détails :", clean(e.details)); console.log("  cause :", clean(e.cause?.message ?? e.cause?.details))
    if (process.env.DEBUG) console.log(clean(e.stack))
    process.exitCode = 1
}

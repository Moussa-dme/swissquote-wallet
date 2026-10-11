// Reproduit le bug : wallet TOUT NEUF (pas encore déployé), frais payés en USDC dès la 1re opération.
import fs from "node:fs"
import { createPublicClient, http, parseAbi, encodeFunctionData } from "viem"
import { sepolia } from "viem/chains"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient, getERC20PaymasterApproveCall } from "@zerodev/sdk"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
const _fetch = globalThis.fetch
globalThis.fetch = async (u, o) => { const r = await _fetch(u, o); if (String(u).includes("/api/gas") && String(o?.body).includes("zd_sponsorUserOperation") && String(o?.body).includes("gasTokenData")) { console.log("   [gas station → réponse]", r.status, (await r.clone().text()).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<ID>").slice(0, 300)) } return r }
const RPC = process.env.NEXT_PUBLIC_BUNDLER_URL, GAS = "http://localhost:3000/api/gas"
const entryPoint = getEntryPoint("0.7"), kernelVersion = KERNEL_V3_1
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", FUNDER = "0x8F47217974267115fEb1ba7062826e1bE415bC9f"
const erc20 = parseAbi(["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"])
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const pc = createPublicClient({ chain: sepolia, transport: http(RPC) })
const kf = JSON.parse(fs.readFileSync(new URL("./.keys_flow.json", import.meta.url), "utf8"))
const mk = async (pk, address) => createKernelAccount(pc, { entryPoint, kernelVersion, ...(address ? { address } : {}), plugins: { sudo: await signerToEcdsaValidator(pc, { signer: privateKeyToAccount(pk), entryPoint, kernelVersion }) } })
const sponsoredClient = (account) => createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster: { getPaymasterData: (userOperation) => createZeroDevPaymasterClient({ chain: sepolia, transport: http(GAS) }).sponsorUserOperation({ userOperation }) } })
const usdcClient = (account) => { const pm = createZeroDevPaymasterClient({ chain: sepolia, transport: http(GAS) }); return { pm, client: createKernelAccountClient({ account, chain: sepolia, bundlerTransport: http(RPC), paymaster: { getPaymasterData: (userOperation) => pm.sponsorUserOperation({ userOperation, gasToken: USDC }) } }) } }
try {
    const fresh = await mk(generatePrivateKey())
    console.log("wallet neuf :", fresh.address, "| code déployé :", (await pc.getCode({ address: fresh.address })) ? "oui" : "NON (pas encore déployé)")
    // 1) on le finance depuis le wallet de test (opération sponsorisée)
    const funder = await mk(kf.newOwner, FUNDER), fc = sponsoredClient(funder)
    const h = await fc.sendUserOperation({ callData: await funder.encodeCalls([{ to: USDC, value: 0n, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: [fresh.address, 5_000_000n] }) }]) })
    await fc.waitForUserOperationReceipt({ hash: h })
    ok("wallet neuf financé (5 USDC)", (await pc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [fresh.address] })) >= 5_000_000n)
    // 2) 1re opération du wallet neuf, frais payés en USDC (déploie le wallet en même temps)
    const { pm, client } = usdcClient(fresh)
    const approve = await getERC20PaymasterApproveCall(pm, { gasToken: USDC, approveAmount: 5_000_000n, entryPoint })
    const transfer = { to: USDC, value: 0n, data: encodeFunctionData({ abi: erc20, functionName: "transfer", args: ["0x2222222222222222222222222222222222222222", 1_000_000n] }) }
    const hash = await client.sendUserOperation({ callData: await fresh.encodeCalls([approve, transfer]) })
    const r = await client.waitForUserOperationReceipt({ hash })
    ok("1re opération d'un wallet NEUF avec frais payés en USDC", r.success)
    const left = await pc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [fresh.address] })
    const spent = (5_000_000n - left); console.log("   dépensé au total :", Number(spent) / 1e6, "USDC, dont ≈", (Number(spent) / 1e6 - 1).toFixed(3), "de frais (déploiement du wallet inclus)")
} catch (e) {
    const clean = (x) => String(x ?? "").replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<ID>").slice(0, 400)
    console.log("❌ ÉCHEC :", clean(e.shortMessage ?? e.message)); console.log("   détails :", clean(e.details)); process.exitCode = 1
}

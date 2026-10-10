// Politique de paiement : PETIT vs GROS montant (sujet n°4 du brief : authentification).
//
//  - PETIT (≤ SMALL_LIMIT_USDC) : une seule authentification, le passkey (Touch ID / Face ID).
//  - GROS  (>  SMALL_LIMIT_USDC) : le passkey NE SUFFIT PLUS. Il faut en plus la confirmation d'un
//    SECOND APPAREIL du client (l'appareil de secours), après avoir lu un résumé du paiement en langage clair.
//    Un voleur qui aurait le téléphone et sa biométrie n'a pas le second appareil.
//
// LIMITE ASSUMÉE : cette règle est appliquée par l'app et le coordinateur (MOCK), pas par la blockchain.
// En production on la ferait respecter on-chain (module/politique de plafond du compte, ou co-signature
// MPC) ; ici elle démontre le raisonnement et le parcours utilisateur.
import { Address, parseAbi, parseUnits, formatUnits } from "viem"

export const USDC: Address = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // USDC de test (Circle) sur Sepolia
export const USDC_DECIMALS = 6
export const SMALL_LIMIT_USDC = 5 // démo ; production : seuil par client (ex. 1000 CHF), réglable
export const erc20Abi = parseAbi([
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
])

export const toUnits = (amount: string) => parseUnits(amount.replace(",", "."), USDC_DECIMALS)
export const fromUnits = (units: bigint | string) => formatUnits(BigInt(units), USDC_DECIMALS)
export const isLarge = (units: bigint) => units > parseUnits(String(SMALL_LIMIT_USDC), USDC_DECIMALS)

// Message signé par l'appareil de secours pour confirmer UN paiement précis
export const paymentMessage = (id: string, to: string, amountLabel: string) =>
    `Confirmer le paiement ${id} : ${amountLabel} USDC vers ${to}`

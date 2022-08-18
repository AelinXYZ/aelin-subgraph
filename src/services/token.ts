import { Address, BigInt } from "@graphprotocol/graph-ts"
import { ERC20 } from "../types/templates/AelinPool/ERC20"

export function getTokenSymbol(address: Address): string {
    const token = ERC20.bind(address)
    const symbol = token.try_symbol()
    if(symbol.reverted) {
        return ""
    }

    return symbol.value
}

// @ts-ignore
export function getTokenDecimals(address: Address): i32 {
    const token = ERC20.bind(address)
    const decimals = token.try_decimals()
    if(decimals.reverted) {
        return 0
    }

    return decimals.value
}

export function getTokenTotalSupply(address: Address): BigInt {
    const token = ERC20.bind(address)
    const totalSupply = token.try_totalSupply()
    if(totalSupply.reverted) {
        return BigInt.fromI32(0)
    }

    return totalSupply.value
}


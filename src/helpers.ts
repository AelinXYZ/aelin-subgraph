import { BigInt, Address } from '@graphprotocol/graph-ts'

export let ONE = BigInt.fromI32(1)

export let ZERO_ADDRESS = Address.fromHexString(
	'0x0000000000000000000000000000000000000000'
)

export let DEAL_WRAPPER_DECIMALS = BigInt.fromI32(18)

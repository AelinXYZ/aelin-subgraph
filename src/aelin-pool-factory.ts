import { BigInt } from '@graphprotocol/graph-ts'
import { PoolCreated, TotalPoolsCreated } from './types/schema'
import { CreatePool as CreatePoolEvent } from './types/AelinPoolFactory/AelinPoolFactory'
import { AelinPool } from './types/templates'
import { ERC20 } from './types/templates/AelinPool/ERC20'
import { ONE } from './helpers'
import { PoolStatus } from './enum'
import {
	createNotificationsForEvent,
} from './services/notifications'
import { getOrCreateUser } from './services/entities'

export function handleCreatePool(event: CreatePoolEvent): void {
	let totalPoolsCreatedEntity = TotalPoolsCreated.load('1')
	if (totalPoolsCreatedEntity == null) {
		totalPoolsCreatedEntity = new TotalPoolsCreated('1')
		totalPoolsCreatedEntity.count = ONE
	} else {
		totalPoolsCreatedEntity.count = totalPoolsCreatedEntity.count.plus(ONE)
	}
	totalPoolsCreatedEntity.save()

	let poolCreatedEntity = new PoolCreated(event.params.poolAddress.toHex())
	poolCreatedEntity.name = event.params.name
	poolCreatedEntity.symbol = event.params.symbol
	poolCreatedEntity.purchaseTokenCap = event.params.purchaseTokenCap
	poolCreatedEntity.purchaseToken = event.params.purchaseToken
	poolCreatedEntity.duration = event.params.duration
	poolCreatedEntity.sponsorFee = event.params.sponsorFee
	poolCreatedEntity.sponsor = event.params.sponsor
	poolCreatedEntity.purchaseDuration = event.params.purchaseDuration
	poolCreatedEntity.purchaseExpiry = event.params.purchaseDuration.plus(
		event.block.timestamp
	)
	poolCreatedEntity.timestamp = event.block.timestamp

	const purchaseToken = ERC20.bind(event.params.purchaseToken)
	poolCreatedEntity.purchaseTokenSymbol = purchaseToken.symbol()
	poolCreatedEntity.purchaseTokenDecimals = purchaseToken.decimals()

	poolCreatedEntity.hasAllowList = event.params.hasAllowList
	poolCreatedEntity.poolStatus = PoolStatus.PoolOpen
	poolCreatedEntity.contributions = BigInt.fromI32(0)

	poolCreatedEntity.totalAmountAccepted = BigInt.fromI32(0)
	poolCreatedEntity.totalAmountWithdrawn = BigInt.fromI32(0)
	poolCreatedEntity.totalAmountFunded = BigInt.fromI32(0)
	poolCreatedEntity.totalAmountEarnedBySponsor = BigInt.fromI32(0)
	poolCreatedEntity.dealsCreated = 0

	poolCreatedEntity.save()

	let userEntity = getOrCreateUser(event.params.sponsor.toHex())
	if (userEntity != null) {
		let poolsSponsored = userEntity.poolsSponsored
		poolsSponsored.push(poolCreatedEntity.id)
		userEntity.poolsSponsored = poolsSponsored
		userEntity.save()
	}

	// use templates to create a new pool to track events
	AelinPool.create(event.params.poolAddress)

	createNotificationsForEvent(event)
}

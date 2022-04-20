import { PoolStatus } from './enum'
import {
	Transfer as TransferEvent,
	SetHolder as SetHolderEvent,
	DealFullyFunded as DealFullyFundedEvent,
	DepositDealToken as DepositDealTokenEvent,
	WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
	ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent
} from './types/templates/AelinDeal/AelinDeal'
import {
	createEntity,
	Entity,
	getDeal,
	getDealDetails,
	getPoolCreated,
	getVestingDeal
} from './services/entities'

export function handleSetHolder(event: SetHolderEvent): void {
	createEntity(Entity.SetHolder, event)
}

export function handleDealTransfer(event: TransferEvent): void {
	createEntity(Entity.TransferDeal, event)
}

export function handleClaimedUnderlyingDealToken(
	event: ClaimedUnderlyingDealTokenEvent
): void {
	createEntity(Entity.ClaimedUnderlyingDealToken, event)

	/**
	 * Update VestingDeal entity
	 */

	let vestingDealEntity = getVestingDeal(
		event.params.recipient.toHex() + '-' + event.address.toHex()
	)
	if (vestingDealEntity != null) {
		vestingDealEntity.amountToVest = vestingDealEntity.amountToVest.minus(
			event.params.underlyingDealTokensClaimed
		)
		vestingDealEntity.totalVested = vestingDealEntity.totalVested.plus(
			event.params.underlyingDealTokensClaimed
		)
		vestingDealEntity.save()
	}

	createEntity(Entity.Vest, event)
}

export function handleWithdrawUnderlyingDealToken(
	event: WithdrawUnderlyingDealTokenEvent
): void {
	createEntity(Entity.WithdrawUnderlyingDealToken, event)
}

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
	createEntity(Entity.DealFullyFunded, event)
	createEntity(Entity.Deal, event)

	let poolCreatedEntity = getPoolCreated(event.params.poolAddress.toHex())
	let dealDetailEntity = getDealDetails(event.address.toHex())
	let dealEntity = getDeal(event.address.toHex())

	if (
		dealDetailEntity == null ||
		poolCreatedEntity == null ||
		dealEntity == null
	) {
		return
	}

	/**
	 * Update PoolCreated and DealDetail entity
	 */

	poolCreatedEntity.poolStatus = PoolStatus.DealOpen
	dealDetailEntity.proRataRedemptionPeriodStart = event.block.timestamp
	dealDetailEntity.isDealFunded = true

	dealEntity.proRataRedemptionPeriodStart = event.block.timestamp
	dealEntity.isDealFunded = true

	createEntity(Entity.DealFunded, event)

	poolCreatedEntity.save()
	dealDetailEntity.save()
	dealEntity.save()
}

export function handleDepositDealToken(event: DepositDealTokenEvent): void {
	createEntity(Entity.DepositDealToken, event)

	/**
	 * Update PoolCreated entity
	 */
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let poolCreatedEntity = getPoolCreated(
			dealEntity.poolAddress.toHex()
		)
		if (poolCreatedEntity != null) {
			poolCreatedEntity.totalAmountFunded = poolCreatedEntity.totalAmountFunded.plus(
				event.params.underlyingDealTokenAmount
			)
			poolCreatedEntity.save()
		}
	}
}

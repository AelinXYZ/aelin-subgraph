import {
	CreateDeal as CreateDealEvent,
	AcceptDeal as AcceptDealEvent,
	WithdrawFromPool as WithdrawFromPoolEvent
} from '../types/templates/AelinPool/AelinPool'
import {
	SetHolder as SetHolderEvent,
	DealFullyFunded as DealFullyFundedEvent,
	ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
	WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent
} from '../types/templates/AelinDeal/AelinDeal'
import { CreatePool as CreatePoolEvent } from '../types/AelinPoolFactory/AelinPoolFactory'

import { Notification } from '../types/schema'
import { getDeal, getPoolCreated, getVestingDeal } from './entities'
import { BigInt, store } from '@graphprotocol/graph-ts'
import { Notifications, NotificationTarget } from '../enum'
import { ZERO } from '../helpers'

const MAX_TIME_PERIOD = BigInt.fromI32(60 * 60 * 24 * 30) // 30 days

export enum NotificationType {
	InvestmentWindowAlert,
	InvestmentWindowEnded,
	DealProposed,
	HolderSet,
	SponsorFeesReady,
	VestingCliffBegun,
	WithdrawUnredeemed,
	DealTokensVestingBegun,
	AllDealTokensVested
}

/**
 * All Notification removal logic
 */

export function removeNotificationsForEvent<E>(event: E): void {
	if (event instanceof ClaimedUnderlyingDealTokenEvent) {
		// Remove VestingCliffBegun, DealTokensVestingBegun, AllDealTokensVested, DealProposed, SponsorFeesReady, WithdrawUnredeemed
		let dealEntity = getDeal(event.address.toHex())
		if (dealEntity != null) {
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun)
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.DealTokensVestingBegun)
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.SponsorFeesReady)
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed)

			// Remove AllDealTokensVested if ClaimedUnderlyingDealTokenEvent timestamp > AllDealTokensVested.triggerEnd
			removeNotificationTriggerEnd(dealEntity.poolAddress.toHex(), event.block.timestamp, Notifications.AllDealTokensVested)
			
			// Remove AllDealTokensVested if All tokens claimed
			let vestingDealEntity = getVestingDeal(event.params.recipient.toHex() + '-' + event.address.toHex())
			if(vestingDealEntity) {
				let remainingAmountToVest = vestingDealEntity.remainingAmountToVest
				if(remainingAmountToVest.equals(ZERO)) {
					store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.AllDealTokensVested)
				}
			}
		}
	} else if(event instanceof AcceptDealEvent) {
		store.remove('Notification', event.address.toHex() + '-' + Notifications.DealProposed)
	} else if (event instanceof CreateDealEvent) {
		// Remove InvestmentWindowAlert, InvestmentWindowEnded
		// If the sponsor does not create a deal or nobody invests, these notifications wont be removed
		store.remove('Notification', event.address.toHex() + '-' + Notifications.InvestmentWindowAlert)
		store.remove('Notification', event.address.toHex() + '-' + Notifications.InvestmentWindowEnded)
	} else if (event instanceof DealFullyFundedEvent) {
		// Remove HolderSet. HolderSet notification will never be removed if the Holder does not fund the deal and there are no withdraws
		let dealEntity = getDeal(event.address.toHex())
		if (dealEntity != null) {
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.HolderSet)
		}
	} else if (event instanceof WithdrawFromPoolEvent) {
		// This event will trigger all removals ONLY if triggerEnd < timestamp fo the Withdrawal event.
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.DealTokensVestingBegun)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.InvestmentWindowEnded)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.InvestmentWindowAlert)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.WithdrawUnredeemed)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.SponsorFeesReady)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.VestingCliffBegun)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.AllDealTokensVested)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.DealProposed)
		removeNotificationTriggerEnd(event.address.toHex(), event.block.timestamp, Notifications.HolderSet)
	} else if (event instanceof WithdrawUnderlyingDealTokenEvent) {
		let dealEntity = getDeal(event.address.toHex())
		if (dealEntity != null) {
			store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed)
		}
	}
}

// Will remove a NotificationEntity if triggerEnd < timestamp of the event
function removeNotificationTriggerEnd<N>(address: string, timestamp: BigInt, notification: N): void {
	let notificationEntity = Notification.load(address + '-' + notification)
	if (notificationEntity != null && notificationEntity.triggerEnd.lt(timestamp)) {
		store.remove('Notification', address + '-' + notification)
	}
}

/**
 * All Notification creation logic
 */

export function createNotificationsForEvent<E>(event: E): void {
	if (event instanceof DealFullyFundedEvent) {
		createVestingCliffBegun(event)
		creatWithdrawUnredeemed(event)
		createAllDealTokensVested(event)
		createDealProposed(event)
	} else if (event instanceof CreatePoolEvent) {
		createInvestmentWindowAlert(event)
		createInvestmentWindowEnded(event)
	} else if (event instanceof AcceptDealEvent) {
		createDealTokensVestingBegun(event)
		createSponsorFeesReady(event)
	} else if (event instanceof SetHolderEvent) {
		createHolderSet(event)
	}
}

function creatWithdrawUnredeemed(event: DealFullyFundedEvent): void {
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed)
		notificationEntity.type = Notifications.WithdrawUnredeemed
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
		notificationEntity.triggerEnd = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(MAX_TIME_PERIOD)
		notificationEntity.target = NotificationTarget.Holder
		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `Withdraw unredeemed tokens from the ${poolName} pool you funded.`
		}

		notificationEntity.save()
	}
}

function createHolderSet(event: SetHolderEvent): void {
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.HolderSet)
		notificationEntity.type = Notifications.HolderSet
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
		notificationEntity.triggerEnd = event.block.timestamp.plus(MAX_TIME_PERIOD)
		notificationEntity.target = NotificationTarget.Holder
		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `You've been added as the token holder for the ${poolName} pool. Please fund the deal.`
		}

		notificationEntity.save()
	}
}

function createSponsorFeesReady(event: AcceptDealEvent): void {
	let poolEntity = getPoolCreated(event.address.toHex())
	if (poolEntity != null) {
		let notificationEntity = new Notification(poolEntity.id + '-' + Notifications.SponsorFeesReady)
		notificationEntity.type = Notifications.SponsorFeesReady
		notificationEntity.pool = poolEntity.id
		notificationEntity.triggerStart = event.block.timestamp
		notificationEntity.triggerEnd = event.block.timestamp.plus(MAX_TIME_PERIOD)
		notificationEntity.target = NotificationTarget.Sponsor

		let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
		notificationEntity.message = `Fees are ready to claim in the ${poolName} pool that you sponsored.`

		notificationEntity.save()
	}
}

function createInvestmentWindowEnded(event: CreatePoolEvent): void {
	let poolEntity = getPoolCreated(event.params.poolAddress.toHex())
	if (poolEntity != null) {
		let notificationEntity = new Notification(poolEntity.id + '-' + Notifications.InvestmentWindowEnded)
		notificationEntity.type = Notifications.InvestmentWindowEnded
		notificationEntity.pool = poolEntity.id
		notificationEntity.triggerStart = poolEntity.purchaseExpiry
		notificationEntity.triggerEnd = poolEntity.purchaseExpiry.plus(poolEntity.duration)
		notificationEntity.target = NotificationTarget.Sponsor

		let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
		notificationEntity.message = `The investment window has concluded in the ${poolName} pool you sponsored. Present a deal now.`

		notificationEntity.save()
	}
}

function createInvestmentWindowAlert(event: CreatePoolEvent): void {
	let poolEntity = getPoolCreated(event.params.poolAddress.toHex())
	if (poolEntity != null) {
		let notificationEntity = new Notification(poolEntity.id + '-' + Notifications.InvestmentWindowAlert)
		notificationEntity.type = Notifications.InvestmentWindowAlert
		notificationEntity.pool = poolEntity.id
		// 75% of purchaseExpiry
		let alertTime = poolEntity.purchaseExpiry
			.minus(event.block.timestamp)
			.div(BigInt.fromI32(4))
			.times(BigInt.fromI32(3))
		notificationEntity.triggerStart = event.block.timestamp.plus(alertTime)
		notificationEntity.triggerEnd = poolEntity.purchaseExpiry
		notificationEntity.target = NotificationTarget.Sponsor

		let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
		notificationEntity.message = `The investment window is coming to an end in the ${poolName} pool you are sponsoring.`

		notificationEntity.save()
	}
}

function createDealProposed(event: DealFullyFundedEvent): void {
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.DealProposed)
		notificationEntity.type = Notifications.DealProposed
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
		notificationEntity.triggerEnd = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)

		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `A deal has been proposed in the ${poolName} pool. If you do not accept, it will be treated as declining the deal.`
		}

		notificationEntity.target = NotificationTarget.PoolInvestor

		notificationEntity.save()
	}
}

function createAllDealTokensVested(event: DealFullyFundedEvent): void {
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.AllDealTokensVested)
		notificationEntity.type = Notifications.AllDealTokensVested
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(dealEntity.vestingCliff)
			.plus(dealEntity.vestingPeriod)
		notificationEntity.triggerEnd = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(dealEntity.vestingCliff)
			.plus(dealEntity.vestingPeriod)
			.plus(MAX_TIME_PERIOD)
		notificationEntity.target = NotificationTarget.DealInvestor

		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `All of your deal tokens have vested in the ${poolName} pool.`
		}

		notificationEntity.save()
	}
}

function createDealTokensVestingBegun(event: AcceptDealEvent): void {
	let dealEntity = getDeal(event.params.dealAddress.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.DealTokensVestingBegun)
		notificationEntity.type = Notifications.DealTokensVestingBegun
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(dealEntity.vestingCliff)
		notificationEntity.triggerEnd = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(dealEntity.vestingCliff)
			.plus(dealEntity.vestingPeriod)
		notificationEntity.target = NotificationTarget.DealInvestor

		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `Your deal tokens have begun vesting in the ${poolName} pool.`
		}

		notificationEntity.save()
	}
}

function createVestingCliffBegun(event: DealFullyFundedEvent): void {
	let dealEntity = getDeal(event.address.toHex())
	if (dealEntity != null) {
		let notificationEntity = new Notification(dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun)
		notificationEntity.type = Notifications.VestingCliffBegun
		notificationEntity.pool = dealEntity.poolAddress.toHex()
		notificationEntity.triggerStart = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
		notificationEntity.triggerEnd = event.block.timestamp
			.plus(dealEntity.proRataRedemptionPeriod)
			.plus(dealEntity.openRedemptionPeriod)
			.plus(dealEntity.vestingCliff)
		notificationEntity.target = NotificationTarget.DealInvestor

		let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
		if (poolEntity != null) {
			let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
			notificationEntity.message = `The vesting cliff countdown has begun in the ${poolName} pool.`
		}

		notificationEntity.save()
	}
}

/**
 * INVESTOR
 * --------
 *
 * VestingCliffBegun
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod
 *  triggerEnd: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff
 *
 * DealTokensVestingBegun
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff
 *  triggerEnd: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff + MAX_TIME_PERIOD
 *
 * AllDealTokensVested
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent (amountToVest == 0)
 *  triggerStart: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff + vestingPeriod
 *  triggerEnd: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff + vestingPeriod + MAX_TIME_PERIOD
 *
 * DealProposed
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: block.timestamp
 *  triggerEnd: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod
 *
 *
 * SPONSOR
 * -------
 *
 * InvestmentWindowAlert
 *  Creation: CreatePoolEvent
 *  Removal: CreateDealEvent
 *  triggerStart: purchaseExpiry * ALERT_WINDOW
 *  triggerEnds: purchaseExpiry + _duration
 *
 * InvestmentWindowEnded
 *  Creation: CreatePoolEvent
 *  Removal: CreateDealEvent
 *  triggerStart: purchaseExpiry
 *  triggerEnds: purchaseExpiry + _duration
 *
 * SponsorFeesReady
 *  Creation: AcceptDealEvent
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: block.timestamp
 *  triggerEnd: block.timestamp + MAX_TIME_PERIOD
 *
 * TBD
 * // When the vesting period start, this notification will be sent to the sponsor with a summary of the investment
 * DealTokensVestingBegunSponsor
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff
 *  triggerEnd: event.block.timestamp + proRataRedemptionPeriod + openRedemptionPeriod + vestingCliff + MAX_TIME_PERIOD
 *
 *
 * HOLDER
 * ------
 *
 * HolderSet
 *  Creation: SetHolderEvent
 *  Removal: DealFullyFunded
 *  triggerStart: block.timestamp
 *  triggerEnds: proRataRedemptionPeriodStart + openRedemptionPeriod
 *
 * WithdrawUnredeemed
 *  Creation: DealFullyFunded
 *  Removal: ClaimedUnderlyingDealTokenEvent
 *  triggerStart: proRataRedemptionPeriodStart + openRedemptionPeriod
 *  triggerEnds: proRataRedemptionPeriodStart + openRedemptionPeriod + MAX_TIME_PERIOD
 *
 * TBD
 * DealFundingWindowAlert
 *  Creation:
 *  Removal:
 *  triggerStart:
 *  triggerEnds:
 *
 * DealFundingWindowEnded
 *  Creation:
 *  Removal:
 *  triggerStart:
 *  triggerEnds:
 *
 */

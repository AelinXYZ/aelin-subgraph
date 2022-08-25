import {
  CreateDeal as CreateDealEvent,
  AcceptDeal as AcceptDealEvent,
  WithdrawFromPool as WithdrawFromPoolEvent,
  DealDetail as DealDetailEvent,
} from '../types/templates/AelinPool/AelinPool'
import {
  SetHolder as SetHolderEvent,
  DealFullyFunded as DealFullyFundedEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
  WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
} from '../types/templates/AelinDeal/AelinDeal'
import { CreatePool as CreatePoolEvent } from '../types/AelinPoolFactory/AelinPoolFactory'

import { Notification } from '../types/schema'
import { getDeal, getPoolCreated } from './entities'
import { BigInt, store } from '@graphprotocol/graph-ts'
import { Notifications, NotificationTarget } from '../enum'

const MAX_TIME_PERIOD = BigInt.fromI32(60 * 60 * 24 * 10) // 10 days

export enum NotificationType {
  InvestmentWindowAlert,
  InvestmentWindowEnded,
  DealProposed,
  HolderSet,
  FundingWindowEnded,
  FundingWindowAlert,
  SponsorFeesReady,
  VestingCliffBegun,
  WithdrawUnredeemed,
  DealTokensVestingBegun,
  AllDealTokensVested,
  DealNotFunded,
}

/**
 * All Notification removal logic
 */

export function removeNotificationsForEvent<E>(event: E): void {
  if (event instanceof ClaimedUnderlyingDealTokenEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity != null) {
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.DealTokensVestingBegun,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.SponsorFeesReady,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.DealProposed,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed,
      )
      removeAllIfTriggerEnd(dealEntity.poolAddress.toHex(), event.block.timestamp)
    }
  } else if (event instanceof CreateDealEvent) {
    // !IMPORTANT - TO IMPROVE: If the sponsor does not create a deal or nobody invests, these notifications wont be removed
    store.remove('Notification', event.address.toHex() + '-' + Notifications.InvestmentWindowAlert)
    store.remove('Notification', event.address.toHex() + '-' + Notifications.InvestmentWindowEnded)
    removeAllIfTriggerEnd(event.address.toHex(), event.block.timestamp)
  } else if (event instanceof DealFullyFundedEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity != null) {
      store.remove('Notification', dealEntity.poolAddress.toHex() + '-' + Notifications.HolderSet)
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowAlert,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowEnded,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() +
          '-' +
          Notifications.DealNotFunded +
          '-' +
          NotificationTarget.Sponsor,
      )
      store.remove(
        'Notification',
        dealEntity.poolAddress.toHex() +
          '-' +
          Notifications.DealNotFunded +
          '-' +
          NotificationTarget.PoolInvestor,
      )
      removeAllIfTriggerEnd(dealEntity.poolAddress.toHex(), event.block.timestamp)
    }
  } else if (event instanceof WithdrawFromPoolEvent) {
    removeAllIfTriggerEnd(event.address.toHex(), event.block.timestamp)
  } else if (event instanceof AcceptDealEvent) {
    removeWithdrawUnredeemed(event)
    removeAllIfTriggerEnd(event.address.toHex(), event.block.timestamp)
  } else if (event instanceof WithdrawUnderlyingDealTokenEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity != null) {
      if (event.params.depositor.equals(dealEntity.holder)) {
        store.remove(
          'Notification',
          dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed,
        )
      }
      removeAllIfTriggerEnd(dealEntity.poolAddress.toHex(), event.block.timestamp)
    }
  }
}

// Delete any notification after the triggerEnd has passed.
function removeAllIfTriggerEnd(poolAddress: string, timestamp: BigInt): void {
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.DealTokensVestingBegun)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.InvestmentWindowEnded)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.InvestmentWindowAlert)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.WithdrawUnredeemed)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.SponsorFeesReady)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.VestingCliffBegun)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.AllDealTokensVested)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.DealProposed)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.HolderSet)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.FundingWindowEnded)
  removeNotificationTriggerEnd(poolAddress, timestamp, Notifications.FundingWindowAlert)
  removeNotificationTriggerEnd(
    poolAddress,
    timestamp,
    Notifications.DealNotFunded + '-' + NotificationTarget.Sponsor,
  )
  removeNotificationTriggerEnd(
    poolAddress,
    timestamp,
    Notifications.DealNotFunded + '-' + NotificationTarget.PoolInvestor,
  )
}

// Will remove a NotificationEntity if triggerEnd < timestamp of the event
function removeNotificationTriggerEnd<N>(
  address: string,
  timestamp: BigInt,
  notification: N,
): void {
  let notificationEntity = Notification.load(address + '-' + notification)
  if (notificationEntity != null && notificationEntity.triggerEnd.lt(timestamp)) {
    store.remove('Notification', address + '-' + notification)
  }
}

// If all tokens are Accepted, then there's nothing to redeem
function removeWithdrawUnredeemed(event: AcceptDealEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  if (poolEntity != null) {
    if (poolEntity.contributions.equals(poolEntity.totalAmountAccepted)) {
      store.remove('Notification', event.address.toHex() + '-' + Notifications.WithdrawUnredeemed)
    }
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
    createFundingWindowEnded(event)
    createFundingWindowAlert(event)
  } else if (event instanceof DealDetailEvent) {
    createDealNotFundedAlert(event)
  }
}

function createDealNotFundedAlert(event: DealDetailEvent): void {
  // This Alert is created as soon as the Deal is created, and it will be triggered on holderFundingExpiration
  // If the deal is FullyFunded then it will be removed
  // This notification is targeted to the PoolInvestors and Sponsor
  let dealEntity = getDeal(event.params.dealContract.toHex())
  if (dealEntity != null) {
    // Target PoolInvestor
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() +
        '-' +
        Notifications.DealNotFunded +
        '-' +
        NotificationTarget.PoolInvestor,
    )
    notificationEntity.type = Notifications.DealNotFunded
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = dealEntity.holderFundingExpiration
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.PoolInvestor
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity != null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The holder assigned to the pool ${poolName} has run out of time to fund the deal. You can now withdraw your tokens, or wait for the sponsor to create another deal.`
    }
    notificationEntity.save()

    // Target Sponsor
    notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() +
        '-' +
        Notifications.DealNotFunded +
        '-' +
        NotificationTarget.Sponsor,
    )
    notificationEntity.type = Notifications.DealNotFunded
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = dealEntity.holderFundingExpiration
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.Sponsor
    if (poolEntity != null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The holder you assigned to the pool ${poolName} has run out of time to fund the deal. All investors are now able to withdraw their tokens. As sponsor you can create another deal (max. 5).`
    }

    notificationEntity.save()
  }
}

function creatWithdrawUnredeemed(event: DealFullyFundedEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity != null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed,
    )
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
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.HolderSet,
    )
    notificationEntity.type = Notifications.HolderSet
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration
    notificationEntity.target = NotificationTarget.Holder
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity != null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `You've been added as the token holder for the ${poolName} pool. Please fund the deal.`
    }

    notificationEntity.save()
  }
}

function createFundingWindowEnded(event: SetHolderEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity != null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowEnded,
    )
    notificationEntity.type = Notifications.FundingWindowEnded
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = dealEntity.holderFundingExpiration
    notificationEntity.triggerEnd = event.block.timestamp.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.Holder
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity != null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The funding window has concluded in the ${poolName} pool you were set as Holder. If you still want to fund it, please contact your sponsor and create a new deal.`
    }

    notificationEntity.save()
  }
}

function createFundingWindowAlert(event: SetHolderEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity != null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowAlert,
    )
    notificationEntity.type = Notifications.FundingWindowAlert
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    // 75% of purchaseExpiry
    let alertTime = dealEntity.holderFundingExpiration
      .minus(event.block.timestamp)
      .div(BigInt.fromI32(4))
      .times(BigInt.fromI32(3))
    notificationEntity.triggerStart = event.block.timestamp.plus(alertTime)
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration
    notificationEntity.target = NotificationTarget.Holder
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity != null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The funding window is coming to an end in the ${poolName} pool you are set as Holder. Please fund the deal.`
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
    let notificationEntity = new Notification(
      poolEntity.id + '-' + Notifications.InvestmentWindowEnded,
    )
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
    let notificationEntity = new Notification(
      poolEntity.id + '-' + Notifications.InvestmentWindowAlert,
    )
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
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.DealProposed,
    )
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
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.AllDealTokensVested,
    )
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
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.DealTokensVestingBegun,
    )
    notificationEntity.type = Notifications.DealTokensVestingBegun
    notificationEntity.pool = dealEntity.poolAddress.toHex()

    let vestingCliffBegunNotification = Notification.load(
      dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun,
    )
    if (vestingCliffBegunNotification) {
      notificationEntity.triggerStart = vestingCliffBegunNotification.triggerEnd
      notificationEntity.triggerEnd = vestingCliffBegunNotification.triggerEnd.plus(
        dealEntity.vestingPeriod,
      )
    }

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
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun,
    )
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

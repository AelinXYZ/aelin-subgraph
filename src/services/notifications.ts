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
import {
  HolderAccepted as HolderAcceptedEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenERC721Event,
} from '../types/templates/AelinDeal_v1/AelinDeal_v1'
import { CreatePool as CreatePoolEvent } from '../types/AelinPoolFactory_v4/AelinPoolFactory'
import { CreateUpFrontDeal as CreateUpFrontDealEvent } from '../types/AelinUpfrontDealFactory_v1/AelinUpfrontDealFactory'
import {
  AcceptDeal as AcceptUpfrontDealEvent,
  DealFullyFunded as UpfrontDealFullyFundedEvent,
} from '../types/templates/AelinUpfrontDeal/AelinUpfrontDeal'
import { Notification } from '../types/schema'
import { getDeal, getPoolCreated, getUpfrontDeal } from './entities'
import { BigInt, store } from '@graphprotocol/graph-ts'
import { Notifications, NotificationTarget } from '../enum'
import { ZERO } from '../helpers'

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
  UpfrontDealFullyFunded,
  HolderClaimFunds,
  AcceptanceWindowAlert,
  AcceptanceWindowEnded,
}

/**
 * All Notification removal logic
 */

export function removeNotificationsForEvent<E>(event: E): void {
  if (
    event instanceof ClaimedUnderlyingDealTokenEvent ||
    event instanceof ClaimedUnderlyingDealTokenERC721Event
  ) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity !== null) {
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
    if (dealEntity !== null) {
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
    if (dealEntity !== null) {
      if (event.params.depositor.equals(dealEntity.holder!)) {
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

  if (notificationEntity !== null) {
    let shouldRemove = false

    if (notificationEntity.triggerEnd !== null) {
      shouldRemove = notificationEntity.triggerEnd!.lt(timestamp)
    }

    if (shouldRemove) {
      store.remove('Notification', address + '-' + notification)
    }
  }
}

// If all tokens are Accepted, then there's nothing to redeem
function removeWithdrawUnredeemed(event: AcceptDealEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  if (poolEntity !== null) {
    if (poolEntity.contributions.equals(poolEntity.totalAmountAccepted)) {
      store.remove('Notification', event.address.toHex() + '-' + Notifications.WithdrawUnredeemed)
    }
  }
}

/**
 * All Notification creation logic
 */

export function createNotificationsForEvent<E>(event: E): void {
  if (event instanceof AcceptUpfrontDealEvent) {
    createAcceptanceWindowAlert(event)
    createAcceptanceWindowEnded(event)
  }
  if (event instanceof UpfrontDealFullyFundedEvent) {
    createUpfrontDealFullyFunded(event)
    createHolderClaimFunds(event)
    createUpfrontDealSponsorFeesReady(event)
    createUpfrontDealVestingCliffBegun(event)
    createUpfrontDealTokensVestingBegun(event)
    createUpfrontDealAllDealTokensVested(event)
  }
  if (event instanceof CreateUpFrontDealEvent) {
    createHolderSet(event)
  }
  if (event instanceof DealFullyFundedEvent) {
    createVestingCliffBegun(event)
    createWithdrawUnredeemed(event)
    createAllDealTokensVested(event)
    createDealProposed(event)
  } else if (event instanceof CreatePoolEvent) {
    createInvestmentWindowAlert(event)
    createInvestmentWindowEnded(event)
  } else if (event instanceof AcceptDealEvent) {
    createDealTokensVestingBegun(event)
    createSponsorFeesReady(event)
  } else if (event instanceof SetHolderEvent || event instanceof HolderAcceptedEvent) {
    createHolderSet(event)
    createFundingWindowEnded(event)
    createFundingWindowAlert(event)
  } else if (event instanceof DealDetailEvent) {
    createDealNotFundedAlert(event)
  }
}

function createAcceptanceWindowAlert(event: AcceptUpfrontDealEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  if (poolEntity === null || poolEntity.purchaseExpiry === null) {
    return
  }

  let notificationEntitySponsor = new Notification(
    poolEntity.id + '-' + Notifications.InvestmentWindowAlert,
  )
  let notificationEntityInvestor = new Notification(
    poolEntity.id + '-' + Notifications.InvestmentWindowAlert + NotificationTarget.PoolInvestor,
  )

  notificationEntitySponsor.type = Notifications.AcceptanceWindowAlert
  notificationEntitySponsor.pool = poolEntity.id
  // 75% of purchaseExpiry
  let alertTime = poolEntity
    .purchaseExpiry!.minus(event.block.timestamp)
    .div(BigInt.fromI32(4))
    .times(BigInt.fromI32(3))
  notificationEntitySponsor.triggerStart = event.block.timestamp.plus(alertTime)
  notificationEntitySponsor.triggerEnd = poolEntity.purchaseExpiry
  notificationEntitySponsor.target = NotificationTarget.Sponsor

  let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
  notificationEntitySponsor.message = `The acceptance window is coming to an end in the ${poolName} pool you are sponsoring.`

  notificationEntityInvestor.type = Notifications.AcceptanceWindowAlert
  notificationEntityInvestor.pool = poolEntity.id
  notificationEntityInvestor.triggerStart = event.block.timestamp.plus(alertTime)
  notificationEntityInvestor.triggerEnd = poolEntity.purchaseExpiry
  notificationEntityInvestor.target = NotificationTarget.PoolInvestor
  notificationEntityInvestor.message = `The acceptance window is coming to an end in the ${poolName} pool you have invested.`

  notificationEntitySponsor.save()
  notificationEntityInvestor.save()
}

function createAcceptanceWindowEnded(event: AcceptUpfrontDealEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  let upfrontDeal = getUpfrontDeal(event.address.toHex())
  if (poolEntity === null || upfrontDeal === null || poolEntity.purchaseExpiry === null) {
    return
  }

  let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)

  let notificationEntityAcceptanceWindowEndedInvestor = new Notification(
    poolEntity.id + '-' + Notifications.AcceptanceWindowEnded,
  )

  notificationEntityAcceptanceWindowEndedInvestor.type = Notifications.AcceptanceWindowEnded
  notificationEntityAcceptanceWindowEndedInvestor.pool = poolEntity.id
  notificationEntityAcceptanceWindowEndedInvestor.triggerStart = poolEntity.purchaseExpiry
  notificationEntityAcceptanceWindowEndedInvestor.triggerEnd = poolEntity
    .purchaseExpiry!.plus(upfrontDeal.vestingPeriod!)
    .plus(upfrontDeal.vestingCliffPeriod!)
  notificationEntityAcceptanceWindowEndedInvestor.target = NotificationTarget.PoolInvestor
  notificationEntityAcceptanceWindowEndedInvestor.message = `The acceptance window has concluded in the ${poolName} pool you invested. Please claim you deal tokens now.`

  let notificationEntityAcceptanceWindowEndedSponsor = new Notification(
    poolEntity.id + '-' + Notifications.AcceptanceWindowEnded + NotificationTarget.Sponsor,
  )

  notificationEntityAcceptanceWindowEndedSponsor.type = Notifications.AcceptanceWindowEnded
  notificationEntityAcceptanceWindowEndedSponsor.pool = poolEntity.id
  notificationEntityAcceptanceWindowEndedSponsor.triggerStart = poolEntity.purchaseExpiry
  notificationEntityAcceptanceWindowEndedSponsor.triggerEnd = poolEntity
    .purchaseExpiry!.plus(upfrontDeal.vestingPeriod!)
    .plus(upfrontDeal.vestingCliffPeriod!)
  notificationEntityAcceptanceWindowEndedSponsor.target = NotificationTarget.Sponsor
  notificationEntityAcceptanceWindowEndedSponsor.message = `The acceptance window has concluded in the ${poolName} pool you are sponsoring.`

  notificationEntityAcceptanceWindowEndedInvestor.save()
  notificationEntityAcceptanceWindowEndedSponsor.save()
}

function createUpfrontDealFullyFunded(event: UpfrontDealFullyFundedEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  if (poolEntity === null) {
    return
  }

  let notificationEntity = new Notification(
    event.address.toHex() + '-' + Notifications.UpfrontDealFullyFunded,
  )
  notificationEntity.type = Notifications.UpfrontDealFullyFunded
  notificationEntity.pool = event.address.toHex()
  notificationEntity.triggerStart = event.block.timestamp
  notificationEntity.triggerEnd = event.block.timestamp.plus(poolEntity.purchaseDuration!)
  notificationEntity.target = NotificationTarget.Sponsor
  notificationEntity.message =
    'A pool you have sponsored has been fully funded. Acceptance period started.'

  notificationEntity.save()
}

function createHolderClaimFunds(event: UpfrontDealFullyFundedEvent): void {
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity === null) {
    return
  }
  let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
  let notificationEntityHolderClaimFunds = new Notification(
    event.address.toHex() + '-' + Notifications.HolderClaimFunds,
  )
  notificationEntityHolderClaimFunds.type = Notifications.HolderClaimFunds
  notificationEntityHolderClaimFunds.pool = event.address.toHex()
  notificationEntityHolderClaimFunds.triggerStart = poolCreatedEntity.purchaseExpiry!
  notificationEntityHolderClaimFunds.triggerEnd =
    poolCreatedEntity.purchaseExpiry!.plus(MAX_TIME_PERIOD)
  notificationEntityHolderClaimFunds.target = NotificationTarget.Holder
  notificationEntityHolderClaimFunds.message = `Funds raised are ready to claim in the ${poolName} pool that you are the holder.`

  notificationEntityHolderClaimFunds.save()
}

function createUpfrontDealSponsorFeesReady(event: UpfrontDealFullyFundedEvent): void {
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity === null) {
    return
  }
  let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
  if (poolCreatedEntity.sponsorFee.gt(ZERO)) {
    let notificationEntitySponsorFeesReady = new Notification(
      event.address.toHex() + '-' + Notifications.SponsorFeesReady,
    )
    notificationEntitySponsorFeesReady.type = Notifications.SponsorFeesReady
    notificationEntitySponsorFeesReady.pool = poolCreatedEntity.id
    notificationEntitySponsorFeesReady.triggerStart = poolCreatedEntity.purchaseExpiry
    notificationEntitySponsorFeesReady.triggerEnd =
      poolCreatedEntity.purchaseExpiry!.plus(MAX_TIME_PERIOD)
    notificationEntitySponsorFeesReady.target = NotificationTarget.Sponsor
    notificationEntitySponsorFeesReady.message = `Fees are ready to claim in the ${poolName} pool that you sponsored.`

    notificationEntitySponsorFeesReady.save()
  }
}

function createUpfrontDealVestingCliffBegun(event: UpfrontDealFullyFundedEvent): void {
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  let upfrontDeal = getUpfrontDeal(event.address.toHex())
  if (poolCreatedEntity === null || upfrontDeal === null) {
    return
  }
  let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
  if (upfrontDeal.vestingCliffPeriod!.gt(ZERO)) {
    let notificationEntityVestingCliff = new Notification(
      event.address.toHex() + '-' + Notifications.VestingCliffBegun,
    )
    notificationEntityVestingCliff.type = Notifications.VestingCliffBegun
    notificationEntityVestingCliff.pool = event.address.toHex()
    notificationEntityVestingCliff.triggerStart = poolCreatedEntity.purchaseExpiry
    notificationEntityVestingCliff.triggerEnd = poolCreatedEntity.purchaseExpiry!.plus(
      upfrontDeal.vestingCliffPeriod!,
    )
    notificationEntityVestingCliff.target = NotificationTarget.PoolInvestor
    notificationEntityVestingCliff.message = `The vesting cliff countdown has begun in the ${poolName} pool.`

    notificationEntityVestingCliff.save()
  }
}

function createUpfrontDealTokensVestingBegun(event: UpfrontDealFullyFundedEvent): void {
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  let upfrontDeal = getUpfrontDeal(event.address.toHex())
  if (poolCreatedEntity === null || upfrontDeal === null) {
    return
  }
  let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
  let notificationEntityVestingBegun = new Notification(
    event.address.toHex() + '-' + Notifications.DealTokensVestingBegun,
  )
  notificationEntityVestingBegun.type = Notifications.DealTokensVestingBegun
  notificationEntityVestingBegun.pool = event.address.toHex()

  notificationEntityVestingBegun.triggerStart = poolCreatedEntity.purchaseExpiry!.plus(
    upfrontDeal.vestingCliffPeriod!,
  )
  notificationEntityVestingBegun.triggerEnd = poolCreatedEntity
    .purchaseExpiry!.plus(upfrontDeal.vestingCliffPeriod!)
    .plus(upfrontDeal.vestingPeriod!)

  notificationEntityVestingBegun.target = NotificationTarget.PoolInvestor
  notificationEntityVestingBegun.message = `Your deal tokens have begun vesting in the ${poolName} pool.`

  notificationEntityVestingBegun.save()
}

function createUpfrontDealAllDealTokensVested(event: UpfrontDealFullyFundedEvent): void {
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  let upfrontDeal = getUpfrontDeal(event.address.toHex())
  if (poolCreatedEntity === null || upfrontDeal === null) {
    return
  }
  let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
  let notificationEntityAllTokensVested = new Notification(
    event.address.toHex() + '-' + Notifications.AllDealTokensVested,
  )
  notificationEntityAllTokensVested.type = Notifications.AllDealTokensVested
  notificationEntityAllTokensVested.pool = event.address.toHex()
  notificationEntityAllTokensVested.triggerStart = poolCreatedEntity
    .purchaseExpiry!.plus(upfrontDeal.vestingCliffPeriod!)
    .plus(upfrontDeal.vestingPeriod!)
  notificationEntityAllTokensVested.triggerEnd = poolCreatedEntity
    .purchaseExpiry!.plus(upfrontDeal.vestingCliffPeriod!)
    .plus(upfrontDeal.vestingPeriod!)
    .plus(MAX_TIME_PERIOD)
  notificationEntityAllTokensVested.target = NotificationTarget.PoolInvestor
  notificationEntityAllTokensVested.message = `All of your deal tokens have vested in the ${poolName} pool.`

  notificationEntityAllTokensVested.save()
}

function createDealNotFundedAlert(event: DealDetailEvent): void {
  // This Alert is created as soon as the Deal is created, and it will be triggered on holderFundingExpiration
  // If the deal is FullyFunded then it will be removed
  // This notification is targeted to the PoolInvestors and Sponsor
  let dealEntity = getDeal(event.params.dealContract.toHex())
  if (dealEntity !== null) {
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
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration!.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.PoolInvestor
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
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
    notificationEntity.triggerEnd = dealEntity.holderFundingExpiration!.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.Sponsor
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The holder you assigned to the pool ${poolName} has run out of time to fund the deal. All investors are now able to withdraw their tokens. As sponsor you can create another deal (max. 5).`
    }

    notificationEntity.save()
  }
}

function createWithdrawUnredeemed(event: DealFullyFundedEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity !== null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.WithdrawUnredeemed,
    )
    notificationEntity.type = Notifications.WithdrawUnredeemed
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
    notificationEntity.triggerEnd = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
      .plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.Holder
    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `Withdraw unredeemed tokens from the ${poolName} pool you funded.`
    }

    notificationEntity.save()
  }
}

function createHolderSet<T>(event: T): void {
  if (event instanceof SetHolderEvent || event instanceof HolderAcceptedEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity !== null) {
      let notificationEntity = new Notification(
        dealEntity.poolAddress.toHex() + '-' + Notifications.HolderSet,
      )
      notificationEntity.type = Notifications.HolderSet
      notificationEntity.pool = dealEntity.poolAddress.toHex()
      notificationEntity.triggerStart = event.block.timestamp
      notificationEntity.triggerEnd = dealEntity.holderFundingExpiration
      notificationEntity.target = NotificationTarget.Holder
      let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
      if (poolEntity !== null) {
        let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
        notificationEntity.message = `You've been added as the token holder for the ${poolName} pool. Please fund the deal.`
      }

      notificationEntity.save()
    }
  }
  if (event instanceof CreateUpFrontDealEvent) {
    let poolCreatedEntity = getPoolCreated(event.params.dealAddress.toHex())
    if (poolCreatedEntity === null) {
      return
    }

    let poolName = poolCreatedEntity.name.slice(poolCreatedEntity.name.indexOf('-') + 1)
    let notificationEntity = new Notification(
      event.params.dealAddress.toHex() + '-' + Notifications.HolderSet,
    )
    notificationEntity.type = Notifications.HolderSet
    notificationEntity.pool = event.params.dealAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
    notificationEntity.triggerEnd = event.block.timestamp.plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.Holder
    notificationEntity.message = `You've been added as the token holder for the ${poolName} pool. Please fund the deal.`

    notificationEntity.save()
  }
}

function createFundingWindowEnded<T>(event: T): void {
  if (event instanceof SetHolderEvent || event instanceof HolderAcceptedEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity !== null) {
      let notificationEntity = new Notification(
        dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowEnded,
      )
      notificationEntity.type = Notifications.FundingWindowEnded
      notificationEntity.pool = dealEntity.poolAddress.toHex()
      notificationEntity.triggerStart = dealEntity.holderFundingExpiration
      notificationEntity.triggerEnd = event.block.timestamp.plus(MAX_TIME_PERIOD)
      notificationEntity.target = NotificationTarget.Holder
      let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
      if (poolEntity !== null) {
        let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
        notificationEntity.message = `The funding window has concluded in the ${poolName} pool you were set as Holder. If you still want to fund it, please contact your sponsor and create a new deal.`
      }

      notificationEntity.save()
    }
  }
}

function createFundingWindowAlert<T>(event: T): void {
  if (event instanceof SetHolderEvent || event instanceof HolderAcceptedEvent) {
    let dealEntity = getDeal(event.address.toHex())
    if (dealEntity !== null) {
      let notificationEntity = new Notification(
        dealEntity.poolAddress.toHex() + '-' + Notifications.FundingWindowAlert,
      )
      notificationEntity.type = Notifications.FundingWindowAlert
      notificationEntity.pool = dealEntity.poolAddress.toHex()
      // 75% of purchaseExpiry
      let alertTime = dealEntity
        .holderFundingExpiration!.minus(event.block.timestamp)
        .div(BigInt.fromI32(4))
        .times(BigInt.fromI32(3))
      notificationEntity.triggerStart = event.block.timestamp.plus(alertTime)
      notificationEntity.triggerEnd = dealEntity.holderFundingExpiration
      notificationEntity.target = NotificationTarget.Holder
      let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
      if (poolEntity !== null) {
        let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
        notificationEntity.message = `The funding window is coming to an end in the ${poolName} pool you are set as Holder. Please fund the deal.`
      }

      notificationEntity.save()
    }
  }
}

function createSponsorFeesReady(event: AcceptDealEvent): void {
  let poolEntity = getPoolCreated(event.address.toHex())
  if (poolEntity !== null) {
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
  if (poolEntity !== null && poolEntity.purchaseExpiry) {
    let notificationEntity = new Notification(
      poolEntity.id + '-' + Notifications.InvestmentWindowEnded,
    )
    notificationEntity.type = Notifications.InvestmentWindowEnded
    notificationEntity.pool = poolEntity.id
    notificationEntity.triggerStart = poolEntity.purchaseExpiry
    notificationEntity.triggerEnd = poolEntity.purchaseExpiry!.plus(poolEntity.duration!)
    notificationEntity.target = NotificationTarget.Sponsor

    let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
    notificationEntity.message = `The investment window has concluded in the ${poolName} pool you sponsored. Present a deal now.`

    notificationEntity.save()
  }
}

function createInvestmentWindowAlert(event: CreatePoolEvent): void {
  let poolEntity = getPoolCreated(event.params.poolAddress.toHex())
  if (poolEntity !== null && poolEntity.purchaseExpiry) {
    let notificationEntity = new Notification(
      poolEntity.id + '-' + Notifications.InvestmentWindowAlert,
    )
    notificationEntity.type = Notifications.InvestmentWindowAlert
    notificationEntity.pool = poolEntity.id
    // 75% of purchaseExpiry
    let alertTime = poolEntity
      .purchaseExpiry!.minus(event.block.timestamp)
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
  if (dealEntity !== null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.DealProposed,
    )
    notificationEntity.type = Notifications.DealProposed
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
    notificationEntity.triggerEnd = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)

    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `A deal has been proposed in the ${poolName} pool. If you do not accept, it will be treated as declining the deal.`
    }

    notificationEntity.target = NotificationTarget.PoolInvestor

    notificationEntity.save()
  }
}

function createAllDealTokensVested(event: DealFullyFundedEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity !== null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.AllDealTokensVested,
    )
    notificationEntity.type = Notifications.AllDealTokensVested
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
      .plus(dealEntity.vestingCliff!)
      .plus(dealEntity.vestingPeriod!)
    notificationEntity.triggerEnd = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
      .plus(dealEntity.vestingCliff!)
      .plus(dealEntity.vestingPeriod!)
      .plus(MAX_TIME_PERIOD)
    notificationEntity.target = NotificationTarget.DealInvestor

    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `All of your deal tokens have vested in the ${poolName} pool.`
    }

    notificationEntity.save()
  }
}

function createDealTokensVestingBegun(event: AcceptDealEvent): void {
  let dealEntity = getDeal(event.params.dealAddress.toHex())
  if (dealEntity !== null) {
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
      notificationEntity.triggerEnd = vestingCliffBegunNotification.triggerEnd!.plus(
        dealEntity.vestingPeriod!,
      )
    }

    notificationEntity.target = NotificationTarget.DealInvestor

    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `Your deal tokens have begun vesting in the ${poolName} pool.`
    }

    notificationEntity.save()
  }
}

function createVestingCliffBegun(event: DealFullyFundedEvent): void {
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity !== null) {
    let notificationEntity = new Notification(
      dealEntity.poolAddress.toHex() + '-' + Notifications.VestingCliffBegun,
    )
    notificationEntity.type = Notifications.VestingCliffBegun
    notificationEntity.pool = dealEntity.poolAddress.toHex()
    notificationEntity.triggerStart = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
    notificationEntity.triggerEnd = event.block.timestamp
      .plus(dealEntity.proRataRedemptionPeriod!)
      .plus(dealEntity.openRedemptionPeriod!)
      .plus(dealEntity.vestingCliff!)
    notificationEntity.target = NotificationTarget.DealInvestor

    let poolEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolEntity !== null) {
      let poolName = poolEntity.name.slice(poolEntity.name.indexOf('-') + 1)
      notificationEntity.message = `The vesting cliff countdown has begun in the ${poolName} pool.`
    }

    notificationEntity.save()
  }
}

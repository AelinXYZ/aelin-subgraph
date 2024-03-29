import { PoolStatus } from './enum'
import {
  Transfer as TransferEvent,
  SetHolder as SetHolderEvent,
  DealFullyFunded as DealFullyFundedEvent,
  DepositDealToken as DepositDealTokenEvent,
  WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
} from './types/templates/AelinDeal/AelinDeal'
import {
  createEntity,
  Entity,
  getDeal,
  getDealDetails,
  getDealFunded,
  getPoolCreated,
  getVestingDeal,
} from './services/entities'
import { createNotificationsForEvent, removeNotificationsForEvent } from './services/notifications'

export function handleSetHolder(event: SetHolderEvent): void {
  createEntity(Entity.SetHolder, event)
  createNotificationsForEvent(event)
}

export function handleDealTransfer(event: TransferEvent): void {
  createEntity(Entity.TransferDeal, event)
}

export function handleClaimedUnderlyingDealToken(event: ClaimedUnderlyingDealTokenEvent): void {
  createEntity(Entity.ClaimedUnderlyingDealToken, event)

  /**
   * Update VestingDeal entity
   */

  let vestingDealEntity = getVestingDeal(
    event.params.recipient.toHex() + '-' + event.address.toHex(),
  )
  if (vestingDealEntity !== null) {
    vestingDealEntity.totalVested = vestingDealEntity.totalVested.plus(
      event.params.underlyingDealTokensClaimed,
    )
    vestingDealEntity.save()
  }

  createEntity(Entity.Vest, event)
  removeNotificationsForEvent(event)
}

export function handleWithdrawUnderlyingDealToken(event: WithdrawUnderlyingDealTokenEvent): void {
  createEntity(Entity.WithdrawUnderlyingDealToken, event)

  /**
   * Update DealFunded Entity
   */
  const dealFundedEntity = getDealFunded(
    event.address.toHex() + '-' + event.params.depositor.toHex(),
  )
  if (dealFundedEntity) {
    dealFundedEntity.amountFunded = dealFundedEntity.amountFunded.minus(
      event.params.underlyingDealTokenAmount,
    )
    dealFundedEntity.save()
  }

  /**
   * Update Deal entity
   */
  const dealEntity = getDeal(event.address.toHex())
  if (dealEntity === null) {
    return
  }

  dealEntity.totalAmountUnredeemed = dealEntity.totalAmountUnredeemed!.minus(
    event.params.underlyingDealTokenAmount,
  )

  dealEntity.save()

  removeNotificationsForEvent(event)
}

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
  createEntity(Entity.DealFullyFunded, event)
  createEntity(Entity.Deal, event)

  let poolCreatedEntity = getPoolCreated(event.params.poolAddress.toHex())
  let dealDetailEntity = getDealDetails(event.address.toHex())
  let dealEntity = getDeal(event.address.toHex())

  if (dealDetailEntity === null || poolCreatedEntity === null || dealEntity === null) {
    return
  }

  /**
   * Update PoolCreated and DealDetail entity
   */

  const vestingStarts = event.block.timestamp
    .plus(dealEntity.proRataRedemptionPeriod!)
    .plus(dealEntity.openRedemptionPeriod!)

  poolCreatedEntity.poolStatus = PoolStatus.DealOpen
  poolCreatedEntity.vestingStarts = vestingStarts
  poolCreatedEntity.vestingEnds = vestingStarts
    .plus(dealEntity.vestingCliff!)
    .plus(dealEntity.vestingPeriod!)

  dealDetailEntity.proRataRedemptionPeriodStart = event.block.timestamp
  dealDetailEntity.isDealFunded = true

  dealEntity.proRataRedemptionPeriodStart = event.block.timestamp
  dealEntity.isDealFunded = true
  dealEntity.dealFundedAt = event.block.timestamp
  dealEntity.totalAmountUnredeemed = dealEntity.underlyingDealTokenTotal

  createEntity(Entity.DealFunded, event)

  poolCreatedEntity.save()
  dealDetailEntity.save()
  dealEntity.save()

  createNotificationsForEvent(event)
  removeNotificationsForEvent(event)
}

export function handleDepositDealToken(event: DepositDealTokenEvent): void {
  createEntity(Entity.DepositDealToken, event)

  /**
   * Update PoolCreated entity
   */
  let dealEntity = getDeal(event.address.toHex())
  if (dealEntity !== null) {
    let poolCreatedEntity = getPoolCreated(dealEntity.poolAddress.toHex())
    if (poolCreatedEntity !== null) {
      poolCreatedEntity.totalAmountFunded = poolCreatedEntity.totalAmountFunded.plus(
        event.params.underlyingDealTokenAmount,
      )
      poolCreatedEntity.save()
    }
  }
}

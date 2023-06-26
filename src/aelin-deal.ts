import { PoolStatus } from './enum'
import {
  Transfer as TransferDealEvent,
  SetHolder as SetHolderEvent,
  DealFullyFunded as DealFullyFundedEvent,
  DepositDealToken as DepositDealTokenEvent,
  WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
} from './types/templates/AelinDeal/AelinDeal'

import {
  AelinDeal_v1 as AelinDealContract,
  Transfer as TransferDealERC721Event,
  VestingShareTransferred as VestingShareTransferredEvent,
  VestingTokenMinted as VestingTokenMintedEvent,
  HolderAccepted as HolderAcceptedEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenERC721Event,
} from './types/templates/AelinDeal_v1/AelinDeal_v1'

import {
  createEntity,
  Entity,
  getDeal,
  getDealDetails,
  getDealFunded,
  getOrCreateUser,
  getPoolCreated,
  getVestingDeal,
} from './services/entities'
import { createNotificationsForEvent, removeNotificationsForEvent } from './services/notifications'

import { VestingDeal, VestingToken } from './types/schema'
import { BigInt, store } from '@graphprotocol/graph-ts'
import { EIGHTEEN_DECIMALS, ZERO, ZERO_ADDRESS } from './helpers'

export function handleSetHolder(event: SetHolderEvent): void {
  if (event instanceof SetHolderEvent) {
    createEntity(Entity.SetHolder, event)
    createNotificationsForEvent(event)
  }
}

export function handleHolderAccepted(event: HolderAcceptedEvent): void {
  if (event instanceof HolderAcceptedEvent) {
    createEntity(Entity.SetHolder, event)
    createNotificationsForEvent(event)
  }
}

export function handleDealTransfer(event: TransferDealEvent): void {
  createEntity(Entity.TransferDeal, event)
}

export function handleDealERC721Transfer(event: TransferDealERC721Event): void {
  // Create a new TransferDeal entity
  createEntity(Entity.TransferDeal, event)

  // Load the vesting token for this event's address and token ID
  let vestingTokenEntity = VestingToken.load(
    event.address.toHex() + '-' + event.params.tokenId.toHex(),
  )

  // Proceed only if a vesting token exists for the given address and token ID
  if (vestingTokenEntity !== null) {
    // Update the owner of the vesting token
    vestingTokenEntity.owner = event.params.to

    // Load the VestingDeal entities for the sender and receiver
    let fromVestingDealEntity = getVestingDeal(
      event.params.from.toHex() + '-' + event.address.toHex(),
    )
    let toVestingDealEntity = getVestingDeal(event.params.to.toHex() + '-' + event.address.toHex())

    // Proceed only if the sender's VestingDeal entity exists and the transfer is not to/from the zero address
    if (
      fromVestingDealEntity !== null &&
      event.params.from.toHex() != ZERO_ADDRESS.toHex() &&
      event.params.to.toHex() != ZERO_ADDRESS.toHex()
    ) {
      // Fetch the details of the pool associated with the sender's deal
      let poolDetails = getPoolCreated(fromVestingDealEntity.poolAddress.toHex())

      // Abort if the pool does not exist
      if (poolDetails === null) {
        return
      }

      // Add the receiver to invested pools, if not already present
      let userToEntity = getOrCreateUser(event.params.to.toHex())
      let poolsInvested = userToEntity.poolsInvested
      if (!poolsInvested.includes(fromVestingDealEntity.poolAddress.toHex())) {
        poolsInvested.push(fromVestingDealEntity.poolAddress.toHex())
      }
      userToEntity.poolsInvested = poolsInvested
      userToEntity.save()

      // Remove the pool from the sender's invested pools
      let userFromEntity = getOrCreateUser(event.params.from.toHex())
      poolsInvested = userFromEntity.poolsInvested
      let poolInvestedIndex = poolsInvested.indexOf(fromVestingDealEntity.poolAddress.toHex())
      if (poolInvestedIndex >= 0) {
        poolsInvested.splice(poolInvestedIndex, 1)
        userFromEntity.poolsInvested = poolsInvested
      }
      userFromEntity.save()

      let aelinDealContract = AelinDealContract.bind(event.address)
      let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()

      let investorDealTotal = vestingTokenEntity.amount
        .times(underlyingPerDealExchangeRate)
        .div(BigInt.fromI32(10).pow(18))

      // If the receiver does not have a VestingDeal entity, create a new one
      if (toVestingDealEntity === null) {
        let newVestingDealEntity = new VestingDeal(
          event.params.to.toHex() + '-' + event.address.toHex(),
        )
        // Copy properties from the sender's VestingDeal entity
        newVestingDealEntity.merge([fromVestingDealEntity])

        // Override id
        newVestingDealEntity.id = event.params.to.toHex() + '-' + event.address.toHex()

        // Override user
        newVestingDealEntity.user = event.params.to.toHex()

        // Add total amount to vest
        newVestingDealEntity.investorDealTotal = investorDealTotal

        store.remove('VestingDeal', event.params.from.toHex() + '-' + event.address.toHex())

        newVestingDealEntity.save()
      } else {
        // If the receiver has a VestingDeal entity, update the deal totals
        toVestingDealEntity.investorDealTotal =
          toVestingDealEntity.investorDealTotal!.plus(investorDealTotal)

        toVestingDealEntity.totalVested = toVestingDealEntity.totalVested.plus(
          fromVestingDealEntity.totalVested,
        )

        toVestingDealEntity.remainingAmountToVest =
          toVestingDealEntity.remainingAmountToVest.plus(investorDealTotal)

        store.remove('VestingDeal', event.params.from.toHex() + '-' + event.address.toHex())

        toVestingDealEntity.save()
      }

      // Save the updated vesting token
      vestingTokenEntity.save()
    }
  }
}

export function handleClaimedUnderlyingDealToken(event: ClaimedUnderlyingDealTokenEvent): void {
  if (event instanceof ClaimedUnderlyingDealTokenEvent) {
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
}

export function handleClaimedUnderlyingDealTokenERC721(
  event: ClaimedUnderlyingDealTokenERC721Event,
): void {
  if (event instanceof ClaimedUnderlyingDealTokenERC721Event) {
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

export function handleVestingTokenMinted(event: VestingTokenMintedEvent): void {
  let dealEntity = getDeal(event.address.toHex())

  if (dealEntity !== null) {
    createEntity(Entity.VestingToken, event)
  }
}

export function handleVestingShareTransferred(event: VestingShareTransferredEvent): void {
  let dealEntity = getDeal(event.address.toHex())

  if (dealEntity !== null) {
    // Reduce vesting token amount by transferred amount
    let existingVestingTokenEntity = VestingToken.load(
      event.address.toHex() + '-' + event.params.tokenId.toHex(),
    )

    if (existingVestingTokenEntity !== null) {
      existingVestingTokenEntity.amount = existingVestingTokenEntity.amount.minus(
        event.params.amount,
      )

      let senderVestingDealEntity = getVestingDeal(
        event.params.from.toHex() + '-' + event.address.toHex(),
      )

      if (senderVestingDealEntity !== null) {
        // Update user's invested pools
        let userEntity = getOrCreateUser(event.params.to.toHex())
        let poolsInvested = userEntity.poolsInvested
        if (!poolsInvested.includes(senderVestingDealEntity.poolAddress.toHex())) {
          poolsInvested.push(senderVestingDealEntity.poolAddress.toHex())
        }
        userEntity.poolsInvested = poolsInvested
        userEntity.poolsInvestedAmt = userEntity.poolsInvested.length
        userEntity.save()

        // Get vesting deal for recipient
        let recipientVestingDealEntity = getVestingDeal(
          event.params.to.toHex() + '-' + event.address.toHex(),
        )

        let aelinDealContract = AelinDealContract.bind(event.address)
        let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()

        let investorDealTotal = event.params.amount
          .times(underlyingPerDealExchangeRate)
          .div(BigInt.fromI32(10).pow(18))

        // If the entity does not exists, create a new entity and save it
        if (recipientVestingDealEntity === null) {
          recipientVestingDealEntity = new VestingDeal(
            event.params.to.toHex() + '-' + event.address.toHex(),
          )

          recipientVestingDealEntity.merge([senderVestingDealEntity])
          recipientVestingDealEntity.id = event.params.to.toHex() + '-' + event.address.toHex()
          recipientVestingDealEntity.user = event.params.to.toHex()
          recipientVestingDealEntity.investorDealTotal = investorDealTotal
          recipientVestingDealEntity.remainingAmountToVest = investorDealTotal
          recipientVestingDealEntity.totalVested = BigInt.fromI32(0)
          recipientVestingDealEntity.save()
        } else {
          // If entity exists, update the entity amounts
          recipientVestingDealEntity.investorDealTotal =
            recipientVestingDealEntity.investorDealTotal!.plus(investorDealTotal)

          recipientVestingDealEntity.remainingAmountToVest =
            recipientVestingDealEntity.remainingAmountToVest.plus(investorDealTotal)

          recipientVestingDealEntity.save()
        }

        // Reduce sender's deal totals by transferred amount if result is non-negative
        if (senderVestingDealEntity.investorDealTotal!.minus(investorDealTotal).gt(ZERO)) {
          senderVestingDealEntity.investorDealTotal =
            senderVestingDealEntity.investorDealTotal!.minus(investorDealTotal)
        }
        if (senderVestingDealEntity.remainingAmountToVest.minus(investorDealTotal).gt(ZERO)) {
          senderVestingDealEntity.remainingAmountToVest =
            senderVestingDealEntity.remainingAmountToVest.minus(investorDealTotal)
        }

        senderVestingDealEntity.save()
        existingVestingTokenEntity.save()
      }
    }
  }
}

import { BigInt, log, store } from '@graphprotocol/graph-ts'

import { AELIN_FEE, ONE_HUNDRED, ZERO, ZERO_ADDRESS } from './helpers'
import {
  createEntity,
  createOrUpdateSponsorVestingUpfrontDeal,
  Entity,
  getDealFunded,
  getDealSponsored,
  getNftCollectionRule,
  getOrCreateUser,
  getPoolCreated,
  getUpfrontDeal,
  getVestingDeal,
} from './services/entities'
import { createNotificationsForEvent } from './services/notifications'
import { VestingToken, VestingDeal } from './types/schema'
import {
  DealFullyFunded as DealFullyFundedEvent,
  AcceptDeal as AcceptDealEvent,
  SponsorClaim as SponsorClaimEvent,
  HolderClaim as HolderClaimEvent,
  ClaimDealTokens as ClaimDealTokensEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
  DepositDealToken as DepositDealTokenEvent,
  PoolWith1155 as PoolWith1155Event,
  PoolWith721 as PoolWith721Event,
  BlacklistNFT as BlacklistNFTEvent,
  Vouch as VouchEvent,
  Disavow as DisavowEvent,
  FeeEscrowClaim as FeeEscrowClaimEvent,
  SetHolder as SetHolderEvent,
} from './types/templates/AelinUpfrontDeal/AelinUpfrontDeal'

import {
  Transfer as TransferDealERC721Event,
  VestingShareTransferred as VestingShareTransferredEvent,
  VestingTokenMinted as VestingTokenMintedEvent,
  HolderAccepted as HolderAcceptedEvent,
  PoolWith721 as UpfrontDealWith721Event,
  PoolWith1155 as UpfrontDealWith1155Event,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenERC721Event,
} from './types/templates/AelinUpfrontDeal_v1/AelinUpfrontDeal_v1'

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

export function handleUpfrontDealERC721Transfer(event: TransferDealERC721Event): void {
  // Create a new entity to represent this transfer event
  createEntity(Entity.TransferDeal, event)

  // Check if the event is an instance of TransferDealERC721Event
  if (event instanceof TransferDealERC721Event) {
    // Load the vesting token associated with the address and token ID
    let vestingTokenEntity = VestingToken.load(
      event.address.toHex() + '-' + event.params.tokenId.toHex(),
    )

    // Continue only if a vesting token was found
    if (vestingTokenEntity !== null) {
      // Update the owner of the vesting token
      vestingTokenEntity.owner = event.params.to

      // Load vesting deal entities associated with the sender and recipient
      let senderVestingDealEntity = getVestingDeal(
        event.params.from.toHex() + '-' + event.address.toHex(),
      )
      let recipientVestingDealEntity = getVestingDeal(
        event.params.to.toHex() + '-' + event.address.toHex(),
      )

      // Continue only if a vesting deal entity was found for the sender and neither the sender nor recipient is the zero address
      if (
        senderVestingDealEntity !== null &&
        event.params.from.toHex() != ZERO_ADDRESS.toHex() &&
        event.params.to.toHex() != ZERO_ADDRESS.toHex()
      ) {
        // Retrieve pool details associated with the vesting deal
        let poolDetails = getPoolCreated(senderVestingDealEntity.poolAddress.toHex())

        // Return if no pool details were found
        if (poolDetails === null) {
          return
        }

        // Add the receiver to invested pools, if not already present
        let userToEntity = getOrCreateUser(event.params.to.toHex())
        let poolsInvested = userToEntity.poolsInvested
        if (!poolsInvested.includes(senderVestingDealEntity.poolAddress.toHex())) {
          poolsInvested.push(senderVestingDealEntity.poolAddress.toHex())
        }
        userToEntity.poolsInvested = poolsInvested
        userToEntity.save()

        // Remove the pool from the sender's list of invested pools
        let userFromEntity = getOrCreateUser(event.params.from.toHex())
        poolsInvested = userFromEntity.poolsInvested
        let poolInvestedIndex = poolsInvested.indexOf(senderVestingDealEntity.poolAddress.toHex())
        if (poolInvestedIndex >= 0) {
          poolsInvested.splice(poolInvestedIndex, 1)
          userFromEntity.poolsInvested = poolsInvested
        }
        userFromEntity.save()

        // If the recipient does not already have a vesting deal, create a new one
        if (recipientVestingDealEntity === null) {
          let newVestingDealEntity = new VestingDeal(
            event.params.to.toHex() + '-' + event.address.toHex(),
          )

          // Copy properties from the sender's vesting deal
          newVestingDealEntity.merge([senderVestingDealEntity])

          // Add total amount to vest
          newVestingDealEntity.investorDealTotal = vestingTokenEntity.amount

          // Override id
          newVestingDealEntity.id = event.params.to.toHex() + '-' + event.address.toHex()

          // Override user
          newVestingDealEntity.user = event.params.to.toHex()

          store.remove('VestingDeal', event.params.from.toHex() + '-' + event.address.toHex())
          newVestingDealEntity.save()
        } else {
          // If the recipient already has a vesting deal, just update the totals
          recipientVestingDealEntity.investorDealTotal =
            recipientVestingDealEntity.investorDealTotal!.plus(vestingTokenEntity.amount)
          recipientVestingDealEntity.totalVested = recipientVestingDealEntity.totalVested.plus(
            senderVestingDealEntity.totalVested,
          )
          recipientVestingDealEntity.remainingAmountToVest =
            recipientVestingDealEntity.remainingAmountToVest.plus(vestingTokenEntity.amount)

          store.remove('VestingDeal', event.params.from.toHex() + '-' + event.address.toHex())

          recipientVestingDealEntity.save()
        }

        // Save the updated vesting token
        vestingTokenEntity.save()
      }
    }
  }
}

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
  /**
   * Update PoolCreated and upfrontDeal entities
   */
  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (poolCreatedEntity && upFrontDealEntity) {
    upFrontDealEntity.dealStart = event.block.timestamp
    poolCreatedEntity.purchaseExpiry = event.params.purchaseExpiryTimestamp
    poolCreatedEntity.vestingStarts = event.params.purchaseExpiryTimestamp
    poolCreatedEntity.vestingEnds = event.params.vestingExpiryTimestamp

    upFrontDealEntity.save()
    poolCreatedEntity.save()
  }

  createNotificationsForEvent(event)
}

export function handleAcceptDeal(event: AcceptDealEvent): void {
  createEntity(Entity.Deposit, event)
  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (poolCreatedEntity === null || upFrontDealEntity === null) {
    return
  }

  let userEntity = getOrCreateUser(event.params.user.toHex())
  if (userEntity !== null) {
    let upfrontDealsAccepted = userEntity.upfrontDealsAccepted
    upfrontDealsAccepted.push(poolCreatedEntity.id)
    userEntity.upfrontDealsAccepted = upfrontDealsAccepted
    userEntity.upfrontDealsAcceptedAmt = upfrontDealsAccepted.length

    let poolsInvested = userEntity.poolsInvested
    poolsInvested.push(poolCreatedEntity.id)
    userEntity.poolsInvested = poolsInvested
    userEntity.poolsInvestedAmt = poolsInvested.length

    upFrontDealEntity.totalUsersAccepted++
    userEntity.save()
  }

  let remainingDealTokens = upFrontDealEntity.remainingDealTokens!.minus(
    event.params.amountDealTokens,
  )

  if (remainingDealTokens.gt(ZERO)) {
    upFrontDealEntity.remainingDealTokens = remainingDealTokens
  } else {
    upFrontDealEntity.remainingDealTokens = ZERO
  }
  upFrontDealEntity.save()

  poolCreatedEntity.contributions = poolCreatedEntity.contributions.plus(
    event.params.amountPurchased,
  )

  const totalAddressesInvested = poolCreatedEntity.totalAddressesInvested
  const hasInvested = totalAddressesInvested.includes(event.params.user.toHex())
  if (!hasInvested) {
    poolCreatedEntity.totalUsersInvested++
    totalAddressesInvested.push(event.params.user.toHex())
    poolCreatedEntity.totalAddressesInvested = totalAddressesInvested
  }
  poolCreatedEntity.save()

  /**
   * Update DealSponsored entity
   */
  let dealSponsoredEntity = getDealSponsored(
    event.address.toHex() + '-' + poolCreatedEntity.sponsor.toHex(),
  )
  if (dealSponsoredEntity === null) {
    return
  }

  dealSponsoredEntity.totalInvested = dealSponsoredEntity.totalInvested.plus(
    event.params.amountPurchased,
  )

  dealSponsoredEntity.totalAccepted = dealSponsoredEntity.totalAccepted.plus(
    event.params.amountDealTokens,
  )

  dealSponsoredEntity.save()
  createNotificationsForEvent(event)
}

export function handleHolderClaim(event: HolderClaimEvent): void {
  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.holderClaim = true
    upFrontDealEntity.save()
  }

  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity === null) {
    return
  }

  /**
   * Update DealFunded entity
   */
  let dealFundedEntity = getDealFunded(
    event.address.toHex() + '-' + poolCreatedEntity.sponsor.toHex(),
  )
  if (dealFundedEntity !== null) {
    dealFundedEntity.amountRaised = dealFundedEntity.amountRaised.plus(event.params.amountClaimed)
    dealFundedEntity.save()
  }
}

export function handleSponsorClaim(event: SponsorClaimEvent): void {
  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity === null) {
    return
  }

  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())
  if (upFrontDealEntity !== null) {
    upFrontDealEntity.sponsorClaim = true
    upFrontDealEntity.totalRedeemed = upFrontDealEntity.totalRedeemed!.plus(
      event.params.amountMinted.div(ONE_HUNDRED.minus(AELIN_FEE)),
    )

    upFrontDealEntity.save()
  }

  createOrUpdateSponsorVestingUpfrontDeal(event)

  /**
   * Update DealSponsored entity
   */
  let dealSponsoredEntity = getDealSponsored(
    event.address.toHex() + '-' + event.params.sponsor.toHex(),
  )
  if (dealSponsoredEntity === null) {
    return
  }

  dealSponsoredEntity.amountEarned = dealSponsoredEntity.amountEarned.plus(
    event.params.amountMinted,
  )

  dealSponsoredEntity.save()
}

export function handleClaimDealTokens(event: ClaimDealTokensEvent): void {
  createEntity(Entity.DealAccepted, event)
  const poolCreatedEntity = getPoolCreated(event.address.toHex())

  if (poolCreatedEntity === null) {
    return
  }

  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.totalAmountUnredeemed = upFrontDealEntity.totalAmountUnredeemed!.minus(
      event.params.amountMinted,
    )
    upFrontDealEntity.totalRedeemed = upFrontDealEntity.totalRedeemed!.plus(
      event.params.amountMinted.div(ONE_HUNDRED.minus(AELIN_FEE)),
    )

    upFrontDealEntity.save()
  }

  /**
   * VestingDeal entity
   */
  let vestingDealEntity = getVestingDeal(event.params.user.toHex() + '-' + event.address.toHex())

  if (vestingDealEntity === null) {
    createEntity(Entity.VestingDeal, event)
  } else {
    vestingDealEntity.investorDealTotal = vestingDealEntity.investorDealTotal!.plus(
      event.params.amountMinted,
    )
    vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal!

    vestingDealEntity.save()
  }
  createNotificationsForEvent(event)
}

export function handleClaimedUnderlyingDealToken(event: ClaimedUnderlyingDealTokenEvent): void {
  createEntity(Entity.ClaimedUnderlyingDealToken, event)

  /**
   * Update VestingDeal entity
   */
  let vestingDealEntity = getVestingDeal(event.params.user.toHex() + '-' + event.address.toHex())
  if (vestingDealEntity !== null) {
    vestingDealEntity.totalVested = vestingDealEntity.totalVested.plus(event.params.amountClaimed)
    vestingDealEntity.remainingAmountToVest = vestingDealEntity.remainingAmountToVest.minus(
      event.params.amountClaimed,
    )
    vestingDealEntity.save()
  }

  createEntity(Entity.Vest, event)
  createNotificationsForEvent(event)
}

export function handleDepositDealToken(event: DepositDealTokenEvent): void {
  createEntity(Entity.DealFunded, event)
}

export function handlePoolWith721(event: PoolWith721Event): void {
  createEntity(Entity.NftCollectionRule, event)
}

export function handlePoolWith1155(event: PoolWith1155Event): void {
  createEntity(Entity.NftCollectionRule, event)
}

export function handleUpfrontDealWith721(event: UpfrontDealWith721Event): void {
  createEntity(Entity.NftCollectionRule, event)
}

export function handleUpfrontDealWith1155(event: UpfrontDealWith1155Event): void {
  createEntity(Entity.NftCollectionRule, event)
}

export function handleBlacklistNFT(event: BlacklistNFTEvent): void {
  /**
   * Update NftCollectionRule entity
   */
  let nftCollectionRuleEntity = getNftCollectionRule(
    event.address.toHex() + '-' + event.params.collection.toHex(),
  )

  if (nftCollectionRuleEntity) {
    let blackListedNfts = nftCollectionRuleEntity.erc721Blacklisted
    blackListedNfts.push(event.params.nftID)
    nftCollectionRuleEntity.erc721Blacklisted = blackListedNfts
    nftCollectionRuleEntity.save()
  }
}

export function handleVouch(event: VouchEvent): void {
  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  const userEntity = getOrCreateUser(event.params.voucher.toHex())
  if (!userEntity || !poolCreatedEntity) {
    return
  }

  const vouchers = poolCreatedEntity.vouchers
  const poolsVouched = userEntity.poolsVouched

  poolsVouched.push(event.address.toHex())
  vouchers.push(event.params.voucher.toHex())

  userEntity.poolsVouched = poolsVouched
  poolCreatedEntity.vouchers = vouchers

  userEntity.poolsVouchedAmt = poolsVouched.length
  poolCreatedEntity.totalVouchers = vouchers.length

  poolCreatedEntity.save()
  userEntity.save()
}

export function handleDisavow(event: DisavowEvent): void {
  const poolCreatedEntity = getPoolCreated(event.address.toHex())
  const userEntity = getOrCreateUser(event.params.voucher.toHex())
  if (!userEntity || !poolCreatedEntity) {
    return
  }

  const poolsVouched = userEntity.poolsVouched
  const vouchers = poolCreatedEntity.vouchers

  let poolVouchedIndex = poolsVouched.indexOf(event.address.toHex())
  let vouchersIndex = vouchers.indexOf(event.params.voucher.toHex())

  if (poolVouchedIndex >= 0 && vouchersIndex >= 0) {
    poolsVouched.splice(poolVouchedIndex, 1)
    userEntity.poolsVouched = poolsVouched

    vouchers.splice(vouchersIndex, 1)
    poolCreatedEntity.vouchers = vouchers

    userEntity.poolsVouchedAmt = poolsVouched.length
    poolCreatedEntity.totalVouchers = vouchers.length

    poolCreatedEntity.save()
    userEntity.save()
  }
}

export function handleFeeEscrowClaim(event: FeeEscrowClaimEvent): void {
  const poolCreatedEntity = getPoolCreated(event.address.toHex())

  if (!poolCreatedEntity) {
    return
  }

  poolCreatedEntity.totalAmountEarnedByProtocol = event.params.amount

  const upfrontDealAddress = poolCreatedEntity.upfrontDeal
  if (!upfrontDealAddress) {
    poolCreatedEntity.save()
    return
  }

  const upFrontDealEntity = getUpfrontDeal(upfrontDealAddress ? upfrontDealAddress : '')
  if (!upFrontDealEntity) {
    poolCreatedEntity.save()
    return
  }

  poolCreatedEntity.totalAmountEarnedByProtocolDecimal = event.params.amount.toBigDecimal().div(
    BigInt.fromI32(10)
      .pow(upFrontDealEntity.underlyingDealTokenDecimals as u8)
      .toBigDecimal(),
  )
  poolCreatedEntity.save()
}

export function handleClaimedUnderlyingDealTokenERC721(
  event: ClaimedUnderlyingDealTokenERC721Event,
): void {
  if (event instanceof ClaimedUnderlyingDealTokenERC721Event) {
    createEntity(Entity.ClaimedUnderlyingDealToken, event)

    /**
     * Update VestingDeal entity
     */

    let vestingDealEntity = getVestingDeal(event.params.user.toHex() + '-' + event.address.toHex())
    if (vestingDealEntity !== null) {
      vestingDealEntity.remainingAmountToVest = vestingDealEntity.totalVested.minus(
        event.params.amountClaimed,
      )
      vestingDealEntity.totalVested = vestingDealEntity.totalVested.plus(event.params.amountClaimed)
      vestingDealEntity.save()
    }

    createEntity(Entity.Vest, event)
    createNotificationsForEvent(event)
  }
}

export function handleVestingTokenMinted(event: VestingTokenMintedEvent): void {
  let upfrontDeal = getUpfrontDeal(event.address.toHex())

  if (upfrontDeal !== null) {
    createEntity(Entity.VestingToken, event)
  }
}

export function handleVestingShareTransferred(event: VestingShareTransferredEvent): void {
  let upfrontDeal = getUpfrontDeal(event.address.toHex())

  if (upfrontDeal !== null) {
    // Reduce vesting token amount by transferred amount
    let existingVestingTokenEntity = VestingToken.load(
      event.address.toHex() + '-' + event.params.tokenId.toHex(),
    )

    if (existingVestingTokenEntity !== null) {
      existingVestingTokenEntity.amount = existingVestingTokenEntity.amount.minus(
        event.params.amount,
      )
      existingVestingTokenEntity.save()
    }

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
      userEntity.poolsInvestedAmt = poolsInvested.length

      userEntity.save()

      // Get vesting deal for recipient
      let recipientVestingDealEntity = getVestingDeal(
        event.params.to.toHex() + '-' + event.address.toHex(),
      )

      // If the entity does not exists, create a new entity and save it
      if (recipientVestingDealEntity === null) {
        recipientVestingDealEntity = new VestingDeal(
          event.params.to.toHex() + '-' + event.address.toHex(),
        )

        recipientVestingDealEntity.merge([senderVestingDealEntity])
        recipientVestingDealEntity.id = event.params.to.toHex() + '-' + event.address.toHex()
        recipientVestingDealEntity.user = event.params.to.toHex()
        recipientVestingDealEntity.investorDealTotal = event.params.amount
        recipientVestingDealEntity.remainingAmountToVest = event.params.amount
        recipientVestingDealEntity.totalVested = BigInt.fromI32(0)
        recipientVestingDealEntity.save()
      } else {
        // If entity exists, update entity amounts
        recipientVestingDealEntity.investorDealTotal =
          recipientVestingDealEntity.investorDealTotal!.plus(event.params.amount)

        recipientVestingDealEntity.remainingAmountToVest =
          recipientVestingDealEntity.remainingAmountToVest.plus(event.params.amount)
        recipientVestingDealEntity.save()
      }

      // Reduce sender's deal totals by transferred amount if result is non-negative
      if (senderVestingDealEntity.investorDealTotal!.minus(event.params.amount).gt(ZERO)) {
        senderVestingDealEntity.investorDealTotal =
          senderVestingDealEntity.investorDealTotal!.minus(event.params.amount)
      }
      if (senderVestingDealEntity.remainingAmountToVest.minus(event.params.amount).gt(ZERO)) {
        senderVestingDealEntity.remainingAmountToVest =
          senderVestingDealEntity.remainingAmountToVest.minus(event.params.amount)
      }

      senderVestingDealEntity.save()
    }
  }
}

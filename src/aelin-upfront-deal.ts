import { BigInt } from '@graphprotocol/graph-ts'
import { AELIN_FEE, ONE_HUNDRED, ZERO } from './helpers'
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
} from './types/templates/AelinUpfrontDeal/AelinUpfrontDeal'

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

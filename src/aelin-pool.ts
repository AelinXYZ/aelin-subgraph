import { PoolStatus } from './enum'
import {
  Transfer as TransferEvent,
  SetSponsor as SetSponsorEvent,
  CreateDeal as CreateDealEvent,
  DealDetail as DealDetailEvent,
  PurchasePoolToken as PurchasePoolTokenEvent,
  WithdrawFromPool as WithdrawFromPoolEvent,
  AcceptDeal as AcceptDealEvent,
  AelinToken as AelinTokenEvent,
  PoolWith721 as PoolWith721Event,
  PoolWith1155 as PoolWith1155Event,
  BlacklistNFT as BlacklistNFTEvent,
} from './types/templates/AelinPool/AelinPool'
import { Address, BigInt } from '@graphprotocol/graph-ts'
import { ZERO_ADDRESS, DEAL_WRAPPER_DECIMALS, ONE_HUNDRED, AELIN_FEE, ZERO } from './helpers'
import { AelinDeal } from './types/templates'
import { AelinDeal as AelinDealContract } from './types/templates/AelinDeal/AelinDeal'
import { AelinPool as AelinPoolContract } from './types/templates/AelinPool/AelinPool'
import {
  createEntity,
  createOrUpdateSponsorVestingDeal,
  Entity,
  getDeal,
  getDealCreated,
  getDealFunded,
  getDealSponsored,
  getNftCollectionRule,
  getPoolCreated,
  getTotalDealsBySponsor,
  getUserAllocationStat,
  getVestingDeal,
} from './services/entities'
import { createNotificationsForEvent, removeNotificationsForEvent } from './services/notifications'

export function handleAelinPoolToken(event: AelinTokenEvent): void {
  createEntity(Entity.AelinToken, event)

  /**
   * Update PoolCreated entity
   */
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity != null) {
    poolCreatedEntity.purchaseTokenDecimals = event.params.decimals
    poolCreatedEntity.save()
  }
}

export function handleSetSponsor(event: SetSponsorEvent): void {
  createEntity(Entity.SetSponsor, event)
}

export function handlePoolTransfer(event: TransferEvent): void {
  createEntity(Entity.Transfer, event)

  /**
   * Update PoolCreated entity
   */
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity == null) {
    return
  }

  if (event.params.from.toHex() == ZERO_ADDRESS.toHex()) {
    poolCreatedEntity.totalSupply = poolCreatedEntity.totalSupply.plus(event.params.value)
  }
  if (event.params.to.toHex() == ZERO_ADDRESS.toHex()) {
    poolCreatedEntity.totalSupply = poolCreatedEntity.totalSupply.minus(event.params.value)
  }
  poolCreatedEntity.save()
}

export function handleCreateDeal(event: CreateDealEvent): void {
  createEntity(Entity.DealCreated, event)
  createEntity(Entity.DealSponsored, event)
  createEntity(Entity.Deal, event)

  /**
   * Update PoolCreated entity
   */
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity != null) {
    poolCreatedEntity.poolStatus = PoolStatus.FundingDeal
    poolCreatedEntity.dealAddress = event.params.dealContract
    poolCreatedEntity.save()
  }

  /**
   * TotalDealsBySponsor entity
   */
  let totalDealsBySponsorEntity = getTotalDealsBySponsor(event.params.sponsor.toHexString())
  if (totalDealsBySponsorEntity == null) {
    createEntity(Entity.TotalDealsBySponsor, event)
    totalDealsBySponsorEntity = getTotalDealsBySponsor(event.params.sponsor.toHexString())
  }
  if (totalDealsBySponsorEntity != null) {
    totalDealsBySponsorEntity.count++
    totalDealsBySponsorEntity.save()
  }

  removeNotificationsForEvent(event)
}

export function handleDealDetail(event: DealDetailEvent): void {
  createEntity(Entity.DealDetail, event)
  createEntity(Entity.Deal, event)

  /**
   * Update PoolCreated entity
   */
  let dealCreatedEntity = getDealCreated(event.params.dealContract.toHex())
  if (dealCreatedEntity != null) {
    let poolCreatedEntity = getPoolCreated(dealCreatedEntity.poolAddress.toHex())
    if (poolCreatedEntity != null) {
      poolCreatedEntity.deal = event.params.dealContract.toHex()
      poolCreatedEntity.holder = event.params.holder
      poolCreatedEntity.save()
    }
  }

  // use templates to create a new deal to track events
  AelinDeal.create(event.params.dealContract)
  createNotificationsForEvent(event)
}

// @TODO add block or timestamp to these events????
// @TODO look into what needs to be indexed
export function handlePurchasePoolToken(event: PurchasePoolTokenEvent): void {
  createEntity(Entity.PurchasePoolToken, event)
  createEntity(Entity.Deposit, event)

  /**
   * Update PoolCreated entity
   */
  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity != null) {
    poolCreatedEntity.contributions = poolCreatedEntity.contributions.plus(
      event.params.purchaseTokenAmount,
    )

    const totalAddressesInvested = poolCreatedEntity.totalAddressesInvested
    const hasInvested = totalAddressesInvested.includes(event.params.purchaser.toHex())
    if (!hasInvested) {
      poolCreatedEntity.totalUsersInvested++
      totalAddressesInvested.push(event.params.purchaser.toHex())
      poolCreatedEntity.totalAddressesInvested = totalAddressesInvested
    }
    poolCreatedEntity.save()
  }

  /**
   * UserAllocationStat entity
   */
  let userAllocationStatEntity = getUserAllocationStat(
    event.params.purchaser.toHex() + '-' + event.address.toHex(),
  )
  if (userAllocationStatEntity == null) {
    createEntity(Entity.UserAllocationStat, event)
    userAllocationStatEntity = getUserAllocationStat(
      event.params.purchaser.toHex() + '-' + event.address.toHex(),
    )
  }

  if (userAllocationStatEntity != null) {
    userAllocationStatEntity.totalAccepted = userAllocationStatEntity.totalAccepted.plus(
      event.params.purchaseTokenAmount,
    )
    userAllocationStatEntity.poolTokenBalance = userAllocationStatEntity.poolTokenBalance.plus(
      event.params.purchaseTokenAmount,
    )
    userAllocationStatEntity.save()
  }
}

export function handleWithdrawFromPool(event: WithdrawFromPoolEvent): void {
  createEntity(Entity.WithdrawFromPool, event)
  createEntity(Entity.Withdraw, event)

  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity == null) {
    return
  }

  /**
   * Update PoolCreated entity
   */

  poolCreatedEntity.totalAmountWithdrawn = poolCreatedEntity.totalAmountWithdrawn.plus(
    event.params.purchaseTokenAmount,
  )
  poolCreatedEntity.save()

  /**
   * Update UserAllocationStat entity
   */
  let userAllocationStatEntity = getUserAllocationStat(
    event.params.purchaser.toHex() + '-' + event.address.toHex(),
  )
  if (userAllocationStatEntity != null) {
    userAllocationStatEntity.totalWithdrawn = userAllocationStatEntity.totalWithdrawn.plus(
      event.params.purchaseTokenAmount,
    )
    userAllocationStatEntity.poolTokenBalance = userAllocationStatEntity.poolTokenBalance.minus(
      event.params.purchaseTokenAmount,
    )
    userAllocationStatEntity.save()
  }

  /**
   * Update Deal entity
   */
  const dealAddress = poolCreatedEntity.dealAddress
  if (dealAddress) {
    const dealEntity = getDeal(dealAddress.toHex())
    if (dealEntity) {
      let aelinDealContract = AelinDealContract.bind(Address.fromBytes(dealAddress))
      let aelinPoolContract = AelinPoolContract.bind(Address.fromBytes(event.address))
      const dealTokenBalance = aelinDealContract.balanceOf(event.params.purchaser)
      const poolTokenBalance = aelinPoolContract.balanceOf(event.params.purchaser)
      if (dealTokenBalance.equals(ZERO) && poolTokenBalance.equals(ZERO)) {
        dealEntity.totalUsersRejected++
        dealEntity.save()
      }
    }
  }
}

export function handleAcceptDeal(event: AcceptDealEvent): void {
  createEntity(Entity.AcceptDeal, event)

  let poolCreatedEntity = getPoolCreated(event.address.toHex())
  if (poolCreatedEntity == null) {
    return
  }

  /**
   * Update DealFunded entity
   */
  let dealFundedEntity = getDealFunded(
    event.params.dealAddress.toHex() + '-' + poolCreatedEntity.sponsor.toHex(),
  )
  if (dealFundedEntity != null) {
    dealFundedEntity.amountRaised = dealFundedEntity.amountRaised.plus(event.params.poolTokenAmount)
    dealFundedEntity.save()
  }

  let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals))
  let dealTokenAmount = event.params.poolTokenAmount.times(
    // @ts-ignore
    BigInt.fromI32(10).pow(<u8>exp.toI32()),
  )
  let aelinDealContract = AelinDealContract.bind(event.params.dealAddress)
  let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()
  let investorDealTotal = dealTokenAmount.times(underlyingPerDealExchangeRate)

  /**
   * UserAllocationStat entity
   */
  let userAllocationStatEntity = getUserAllocationStat(
    event.params.purchaser.toHex() + '-' + event.address.toHex(),
  )

  if (userAllocationStatEntity != null) {
    userAllocationStatEntity.poolTokenBalance = userAllocationStatEntity.poolTokenBalance.minus(
      event.params.poolTokenAmount,
    )
    userAllocationStatEntity.save()
  }

  /**
   * VestingDeal entity
   */
  let vestingDealEntity = getVestingDeal(
    event.params.purchaser.toHex() + '-' + event.params.dealAddress.toHex(),
  )

  if (vestingDealEntity === null) {
    createEntity(Entity.VestingDeal, event)
  } else {
    createOrUpdateSponsorVestingDeal(event)
    let sponsorFee = poolCreatedEntity.sponsorFee.div(BigInt.fromI32(10).pow(18))
    let dealTokens = investorDealTotal
      .div(BigInt.fromI32(10).pow(18))
      .times(ONE_HUNDRED.minus(AELIN_FEE).minus(sponsorFee)) // total Fees
      .div(ONE_HUNDRED)
    vestingDealEntity.investorDealTotal = vestingDealEntity.investorDealTotal.plus(dealTokens)
    vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal
    vestingDealEntity.save()
  }

  createEntity(Entity.DealAccepted, event)

  /**
   * Update DealSponsored entity
   */
  let dealSponsoredEntity = getDealSponsored(
    event.address.toHex() + '-' + poolCreatedEntity.sponsor.toHex(),
  )
  if (dealSponsoredEntity == null) {
    return
  }

  dealSponsoredEntity.totalInvested = dealSponsoredEntity.totalInvested.plus(
    event.params.poolTokenAmount,
  )
  dealSponsoredEntity.amountEarned = dealSponsoredEntity.amountEarned.plus(
    event.params.sponsorFee.times(underlyingPerDealExchangeRate).div(BigInt.fromI32(10).pow(18)),
  )
  dealSponsoredEntity.totalAccepted = dealSponsoredEntity.totalAccepted.plus(
    investorDealTotal.div(BigInt.fromI32(10).pow(18)),
  )
  dealSponsoredEntity.save()

  /**
   * Update PoolCreated entity
   */
  poolCreatedEntity.totalAmountAccepted = poolCreatedEntity.totalAmountAccepted.plus(
    event.params.poolTokenAmount,
  )
  poolCreatedEntity.totalAmountEarnedBySponsor = poolCreatedEntity.totalAmountEarnedBySponsor.plus(
    event.params.sponsorFee,
  )
  poolCreatedEntity.save()

  /**
   * Update Deal entity
   */
  const dealEntity = getDeal(event.params.dealAddress.toHex())
  if (dealEntity == null) {
    return
  }
  dealEntity.totalAmountUnredeemed = dealEntity.totalAmountUnredeemed.minus(
    investorDealTotal.div(BigInt.fromI32(10).pow(18)),
  )
  dealEntity.save()

  createNotificationsForEvent(event)
  removeNotificationsForEvent(event)
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

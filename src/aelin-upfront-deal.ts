import { BigInt, log } from '@graphprotocol/graph-ts'
import { AELIN_FEE, ONE_HUNDRED } from './helpers'
import {
  createEntity,
  createOrUpdateSponsorVestingDeal,
  createOrUpdateSponsorVestingUpfrontDeal,
  Entity,
  getOrCreateUser,
  getPoolCreated,
  getUpfrontDeal,
  getVestingDeal,
} from './services/entities'
import {
  DealFullyFunded as DealFullyFundedEvent,
  AcceptDeal as AcceptDealEvent,
  SponsorClaim as SponsorClaimEvent,
  HolderClaim as HolderClaimEvent,
  ClaimDealTokens as ClaimDealTokensEvent,
} from './types/templates/AelinUpfrontDeal/AelinUpfrontDeal'

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
  //   createEntity(Entity.AelinToken, event)

  /**
   * Update PoolCreated and entity UpFrontDeal entities
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
}

// export function handleDepositDealToken(event: DepositDealTokenEvent): void {
//   //   createEntity(Entity.AelinToken, event)

//   /**
//    * Update PoolCreated entity
//    */
//   const poolCreatedEntity = getPoolCreated(event.address.toHex())
//   const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

//   log.error('****************************************: {}', [])
//   log.error('DepositDealTokenEvent Fired: {}', [])

//   if (poolCreatedEntity && upFrontDealEntity && poolCreatedEntity.purchaseDuration) {
//     log.error('updating Fired: {}', [])
//     const vestingStarts = event.block.timestamp.plus(poolCreatedEntity.purchaseDuration as BigInt)
//     poolCreatedEntity.vestingStarts = vestingStarts
//     poolCreatedEntity.vestingEnds = vestingStarts.plus(upFrontDealEntity.vestingPeriod)
//     upFrontDealEntity.purchaseExpiry = vestingStarts
//     upFrontDealEntity.dealStart = event.block.timestamp
//     log.error('vestingStarts: {}', [vestingStarts.toString()])
//     log.error('vestingEnds: {}', [vestingStarts.plus(upFrontDealEntity.vestingPeriod).toString()])
//     log.error('dealStart: {}', [event.block.timestamp.toString()])

//     upFrontDealEntity.save()
//     poolCreatedEntity.save()
//   }
// }

export function handleAcceptDeal(event: AcceptDealEvent): void {
  /**
   * VestingDeal entity
   */
  const vestingDealEntity = getVestingDeal(event.params.user.toHex() + '-' + event.address.toHex())
  const poolCreatedEntity = getPoolCreated(event.address.toHex())

  if (poolCreatedEntity == null) {
    return
  }

  if (vestingDealEntity === null) {
    createEntity(Entity.VestingDeal, event)
  } else {
    createOrUpdateSponsorVestingUpfrontDeal(event)
    const sponsorFee = poolCreatedEntity.sponsorFee
    const dealTokens = event.params.totalDealTokens
      .times(ONE_HUNDRED.minus(AELIN_FEE).minus(sponsorFee))
      .div(ONE_HUNDRED)
    vestingDealEntity.investorDealTotal = vestingDealEntity.investorDealTotal.plus(dealTokens)
    vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal
    vestingDealEntity.save()
  }

  let userEntity = getOrCreateUser(event.params.user.toHex())
  if (userEntity != null) {
    let poolsInvested = userEntity.poolsInvested
    poolsInvested.push(poolCreatedEntity.id)
    userEntity.poolsInvested = poolsInvested
    userEntity.poolsInvestedAmt = poolsInvested.length
    // Also History.dealsSponsored

    userEntity.save()
  }

  poolCreatedEntity.totalAmountAccepted = poolCreatedEntity.totalAmountAccepted.plus(
    event.params.amountPurchased,
  )
}

export function handleHolderClaim(event: HolderClaimEvent): void {
  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.holderClaim = true
    upFrontDealEntity.save()
  }
}

export function handleSponsorClaim(event: SponsorClaimEvent): void {
  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.sponsorClaim = true
    upFrontDealEntity.save()
  }
}

export function handleClaimDealTokens(event: ClaimDealTokensEvent): void {
  const poolCreatedEntity = getPoolCreated(event.address.toHex())

  if (poolCreatedEntity == null) {
    return
  }

  const upFrontDealEntity = getUpfrontDeal(event.address.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.totalAmountUnredeemed = upFrontDealEntity.totalAmountUnredeemed.minus(
      event.params.amountMinted
        .times(ONE_HUNDRED.minus(AELIN_FEE).minus(poolCreatedEntity.sponsorFee))
        .div(ONE_HUNDRED),
    )

    upFrontDealEntity.save()
  }
}

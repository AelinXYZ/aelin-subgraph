import { PoolCreated, TotalPoolsCreated, UpfrontDeal } from './types/schema'
import {
  CreateUpFrontDeal as CreateUpFrontDealEvent,
  CreateUpFrontDealConfig as CreateUpFrontDealConfigEvent,
} from './types/AelinUpfrontDealFactory_v1/AelinUpfrontDealFactory'
import { ONE, ZERO } from './helpers'
import { PoolStatus, DealType } from './enum'
import { AelinUpfrontDeal } from './types/templates'
import {
  createEntity,
  Entity,
  getOrCreateUser,
  getPoolCreated,
  getUpfrontDeal,
} from './services/entities'
import { getTokenDecimals, getTokenSymbol } from './services/token'
import { createNotificationsForEvent } from './services/notifications'
import { BigInt } from '@graphprotocol/graph-ts'

export function handleCreateUpfrontDeal(event: CreateUpFrontDealEvent): void {
  let totalPoolsCreatedEntity = TotalPoolsCreated.load('1')
  if (totalPoolsCreatedEntity == null) {
    totalPoolsCreatedEntity = new TotalPoolsCreated('1')
    totalPoolsCreatedEntity.count = ONE
  } else {
    totalPoolsCreatedEntity.count = totalPoolsCreatedEntity.count.plus(ONE)
  }
  totalPoolsCreatedEntity.save()

  const poolCreatedEntity = new PoolCreated(event.params.dealAddress.toHex())
  poolCreatedEntity.dealType = DealType.UpfrontDeal
  poolCreatedEntity.name = event.params.name
  poolCreatedEntity.symbol = event.params.symbol
  poolCreatedEntity.purchaseToken = event.params.purchaseToken
  poolCreatedEntity.sponsorFee = event.params.sponsorFee
  poolCreatedEntity.sponsor = event.params.sponsor
  poolCreatedEntity.timestamp = event.block.timestamp
  poolCreatedEntity.purchaseTokenSymbol = getTokenSymbol(event.params.purchaseToken)
  poolCreatedEntity.purchaseTokenDecimals = getTokenDecimals(event.params.purchaseToken)

  poolCreatedEntity.poolStatus = PoolStatus.DealOpen
  poolCreatedEntity.filter = `${event.params.name.toLowerCase()}-${event.params.sponsor.toHex()}-${getTokenSymbol(
    event.params.purchaseToken,
  ).toLowerCase()}`

  // Initialization
  poolCreatedEntity.contributions = ZERO
  poolCreatedEntity.totalAmountAccepted = ZERO
  poolCreatedEntity.totalAmountWithdrawn = ZERO
  poolCreatedEntity.totalAmountFunded = ZERO
  poolCreatedEntity.totalAmountEarnedBySponsor = ZERO
  poolCreatedEntity.hasNftList = false
  poolCreatedEntity.totalVouchers = 0

  let userEntity = getOrCreateUser(event.params.sponsor.toHex())
  if (userEntity != null) {
    let poolsSponsored = userEntity.poolsSponsored
    poolsSponsored.push(poolCreatedEntity.id)
    userEntity.poolsSponsored = poolsSponsored
    userEntity.poolsSponsoredAmt = poolsSponsored.length

    userEntity.save()
  }

  userEntity = getOrCreateUser(event.params.holder.toHex())
  if (userEntity != null) {
    let poolsAsHolder = userEntity.poolsAsHolder
    poolsAsHolder.push(poolCreatedEntity.id)
    userEntity.poolsAsHolder = poolsAsHolder
    userEntity.poolsAsHolderAmt = poolsAsHolder.length

    userEntity.save()
  }

  const upFrontDealEntity = new UpfrontDeal(event.params.dealAddress.toHex())
  upFrontDealEntity.name = event.params.name
  upFrontDealEntity.symbol = event.params.symbol
  upFrontDealEntity.underlyingDealToken = event.params.underlyingDealToken
  upFrontDealEntity.underlyingDealTokenSymbol = getTokenSymbol(event.params.underlyingDealToken)
  upFrontDealEntity.underlyingDealTokenDecimals = getTokenDecimals(event.params.underlyingDealToken)
  upFrontDealEntity.holder = event.params.holder
  upFrontDealEntity.merkleRoot = event.params.merkleRoot
  upFrontDealEntity.ipfsHash = event.params.ipfsHash

  poolCreatedEntity.upfrontDeal = event.params.dealAddress.toHex()

  upFrontDealEntity.save()
  poolCreatedEntity.save()

  createEntity(Entity.DealSponsored, event)
  createNotificationsForEvent(event)
  // use templates to create a new pool to track events
  AelinUpfrontDeal.create(event.params.dealAddress)
}
export function handleCreateUpfrontDealConfig(event: CreateUpFrontDealConfigEvent): void {
  const upFrontDealEntity = getUpfrontDeal(event.params.dealAddress.toHex())
  const poolCreatedEntity = getPoolCreated(event.params.dealAddress.toHex())

  if (upFrontDealEntity) {
    upFrontDealEntity.underlyingDealTokenTotal = event.params.underlyingDealTokenTotal
    upFrontDealEntity.remainingDealTokens = event.params.underlyingDealTokenTotal
    upFrontDealEntity.purchaseTokenPerDealToken = event.params.purchaseTokenPerDealToken
    upFrontDealEntity.purchaseRaiseMinimum = event.params.purchaseRaiseMinimum
    upFrontDealEntity.vestingPeriod = event.params.vestingPeriod
    upFrontDealEntity.vestingCliffPeriod = event.params.vestingCliffPeriod
    upFrontDealEntity.allowDeallocation = event.params.allowDeallocation
    upFrontDealEntity.totalAmountUnredeemed = event.params.underlyingDealTokenTotal
    upFrontDealEntity.totalRedeemed = ZERO

    upFrontDealEntity.save()
  }

  if (poolCreatedEntity) {
    poolCreatedEntity.purchaseDuration = event.params.purchaseDuration
    if (event.params.allowDeallocation === false) {
      poolCreatedEntity.purchaseTokenCap = event.params.underlyingDealTokenTotal
        .times(event.params.purchaseTokenPerDealToken)
        .div(BigInt.fromI32(10).pow(18))
    } else {
      poolCreatedEntity.purchaseTokenCap = ZERO
    }

    poolCreatedEntity.save()
  }
}

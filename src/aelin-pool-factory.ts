import { BigInt } from '@graphprotocol/graph-ts'
import { PoolCreated, TotalPoolsCreated } from './types/schema'
import { CreatePool as CreatePoolEvent } from './types/AelinPoolFactory_v4/AelinPoolFactory'
import { AelinPool } from './types/templates'
import { ONE } from './helpers'
import { PoolStatus, DealType } from './enum'
import { createNotificationsForEvent } from './services/notifications'
import { getOrCreateUser } from './services/entities'
import { getTokenDecimals, getTokenSymbol } from './services/token'

export function handleCreatePool(event: CreatePoolEvent): void {
  let totalPoolsCreatedEntity = TotalPoolsCreated.load('1')
  if (totalPoolsCreatedEntity == null) {
    totalPoolsCreatedEntity = new TotalPoolsCreated('1')
    totalPoolsCreatedEntity.count = ONE
  } else {
    totalPoolsCreatedEntity.count = totalPoolsCreatedEntity.count.plus(ONE)
  }
  totalPoolsCreatedEntity.save()

  let poolCreatedEntity = new PoolCreated(event.params.poolAddress.toHex())
  poolCreatedEntity.dealType = DealType.SponsorDeal
  poolCreatedEntity.name = event.params.name
  poolCreatedEntity.symbol = event.params.symbol
  poolCreatedEntity.purchaseTokenCap = event.params.purchaseTokenCap
  poolCreatedEntity.purchaseToken = event.params.purchaseToken
  poolCreatedEntity.duration = event.params.duration
  poolCreatedEntity.sponsorFee = event.params.sponsorFee
  poolCreatedEntity.sponsor = event.params.sponsor
  poolCreatedEntity.purchaseDuration = event.params.purchaseDuration
  poolCreatedEntity.purchaseExpiry = event.params.purchaseDuration.plus(event.block.timestamp)
  poolCreatedEntity.timestamp = event.block.timestamp

  poolCreatedEntity.purchaseTokenSymbol = getTokenSymbol(event.params.purchaseToken)
  poolCreatedEntity.purchaseTokenDecimals = getTokenDecimals(event.params.purchaseToken)

  poolCreatedEntity.hasAllowList = event.params.hasAllowList
  poolCreatedEntity.poolStatus = PoolStatus.PoolOpen
  poolCreatedEntity.contributions = BigInt.fromI32(0)

  poolCreatedEntity.totalAmountAccepted = BigInt.fromI32(0)
  poolCreatedEntity.totalAmountWithdrawn = BigInt.fromI32(0)
  poolCreatedEntity.totalAmountFunded = BigInt.fromI32(0)
  poolCreatedEntity.totalAmountEarnedBySponsor = BigInt.fromI32(0)
  poolCreatedEntity.totalAmountEarnedByProtocol = BigInt.fromI32(0)
  poolCreatedEntity.dealsCreated = 0
  poolCreatedEntity.filter = `${event.params.name.toLowerCase()}-${event.params.sponsor.toHex()}-${getTokenSymbol(
    event.params.purchaseToken,
  ).toLowerCase()}`
  poolCreatedEntity.hasNftList = false
  poolCreatedEntity.totalVouchers = 0

  poolCreatedEntity.save()

  let userEntity = getOrCreateUser(event.params.sponsor.toHex())
  if (userEntity != null) {
    let poolsSponsored = userEntity.poolsSponsored
    poolsSponsored.push(poolCreatedEntity.id)
    userEntity.poolsSponsored = poolsSponsored
    userEntity.poolsSponsoredAmt = poolsSponsored.length
    userEntity.save()
  }

  // use templates to create a new pool to track events
  AelinPool.create(event.params.poolAddress)

  createNotificationsForEvent(event)
}

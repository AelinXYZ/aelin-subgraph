import { BigInt, log } from '@graphprotocol/graph-ts'
import {
	Transfer as TransferEvent,
	SetSponsor as SetSponsorEvent,
	CreateDeal as CreateDealEvent,
	DealDetail as DealDetailEvent,
	PurchasePoolToken as PurchasePoolTokenEvent,
	WithdrawFromPool as WithdrawFromPoolEvent,
	AcceptDeal as AcceptDealEvent,
	AelinToken as AelinTokenEvent
} from '../types/templates/AelinPool/AelinPool'

import {
	Transfer as TransferDealEvent,
	SetHolder as SetHolderEvent,
	DealFullyFunded as DealFullyFundedEvent,
	DepositDealToken as DepositDealTokenEvent,
	WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
	ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent
} from '../types/templates/AelinDeal/AelinDeal'

import { AelinDeal as AelinDealContract } from '../types/templates/AelinDeal/AelinDeal'

import {
	DealCreated,
	PurchasePoolToken,
	WithdrawFromPool,
	AcceptDeal,
	SetSponsor,
	DealDetail,
	Transfer,
	AelinToken,
	VestingDeal,
	Deposit,
	Withdraw,
	DealAccepted,
	DealSponsored,
	UserAllocationStat,
	TotalDealsBySponsor,
	PoolCreated,
	DealFunded,
	SetHolder,
	ClaimedUnderlyingDealToken,
	WithdrawUnderlyingDealToken,
	DealFullyFunded,
	DepositDealToken,
	Vest
} from '../types/schema'

import { DEAL_WRAPPER_DECIMALS } from '../helpers'
import { ERC20 } from '../types/templates/AelinPool/ERC20'

export enum Entity {
	AelinToken,
	DealCreated,
	DealSponsored,
	DealDetail,
	SetSponsor,
	Transfer,
	PurchasePoolToken,
	Deposit,
	WithdrawFromPool,
	Withdraw,
	AcceptDeal,
	VestingDeal,
	DealAccepted,
	UserAllocationStat,
	TotalDealsBySponsor,
	SetHolder,
	TransferDeal,
	ClaimedUnderlyingDealToken,
	WithdrawUnderlyingDealToken,
	DealFullyFunded,
	DealFunded,
	DepositDealToken,
	Vest
}

export function createEntity<E>(entityType: Entity, event: E): void {
	switch (entityType) {
		case Entity.DealCreated:
			if (event instanceof CreateDealEvent) {
				createDealCreatedEntity(event)
			}
			break
		case Entity.DealSponsored:
			if (event instanceof CreateDealEvent) {
				createDealSponsoredEntity(event)
			}
			break
		case Entity.DealDetail:
			if (event instanceof DealDetailEvent) {
				createDealDetailEntity(event)
			}
			break
		case Entity.AelinToken:
			if (event instanceof AelinTokenEvent) {
				createAelinTokenEntity(event)
			}
			break
		case Entity.SetSponsor:
			if (event instanceof SetSponsorEvent) {
				createSetSponsorEntity(event)
			}
			break
		case Entity.Transfer:
			if (event instanceof TransferEvent) {
				createTransferEntity(event)
			}
			break
		case Entity.PurchasePoolToken:
			if (event instanceof PurchasePoolTokenEvent) {
				createPurchasePoolTokenEntity(event)
			}
			break
		case Entity.Deposit:
			if (event instanceof PurchasePoolTokenEvent) {
				createDepositEntity(event)
			}
			break
		case Entity.WithdrawFromPool:
			if (event instanceof WithdrawFromPoolEvent) {
				createWithdrawFromPoolEntity(event)
			}
			break
		case Entity.Withdraw:
			if (event instanceof WithdrawFromPoolEvent) {
				createWithdrawEntity(event)
			}
			break
		case Entity.AcceptDeal:
			if (event instanceof AcceptDealEvent) {
				createAcceptDealEntity(event)
			}
			break
		case Entity.VestingDeal:
			if (event instanceof AcceptDealEvent) {
				createVestingDealEntity(event)
			}
			break
		case Entity.DealAccepted:
			if (event instanceof AcceptDealEvent) {
				createDealAcceptedEntity(event)
			}
			break
		case Entity.UserAllocationStat:
			if (event instanceof AcceptDealEvent) {
				createUserAllocationStatEntity(event)
			}
			break
		case Entity.TotalDealsBySponsor:
			if (event instanceof CreateDealEvent) {
				createTotalDealsBySponsorEntity(event)
			}
			break
		case Entity.SetHolder:
			if (event instanceof SetHolderEvent) {
				createSetHolderEntity(event)
			}
			break
		case Entity.TransferDeal:
			if (event instanceof TransferDealEvent) {
				createTransferDealEntity(event)
			}
			break
		case Entity.ClaimedUnderlyingDealToken:
			if (event instanceof ClaimedUnderlyingDealTokenEvent) {
				createClaimedUnderlyingDealTokenEntity(event)
			}
			break
		case Entity.WithdrawUnderlyingDealToken:
			if (event instanceof WithdrawUnderlyingDealTokenEvent) {
				createWithdrawUnderlyingDealTokenEntity(event)
			}
			break
		case Entity.DealFullyFunded:
			if (event instanceof DealFullyFundedEvent) {
				createDealFullyFundedEntity(event)
			}
			break
		case Entity.DealFunded:
			if (event instanceof DealFullyFundedEvent) {
				createDealFundedEntity(event)
			}
			break
		case Entity.DepositDealToken:
			if (event instanceof DepositDealTokenEvent) {
				createDepositDealTokenEntity(event)
			}
			break
		case Entity.Vest:
			if (event instanceof ClaimedUnderlyingDealTokenEvent) {
				createVestEntity(event)
			}
			break
		default:
			log.error(
				'Error in entities service. Trying to create a undefined EntityType??: {}',
				[]
			)
	}
}

function createVestEntity(event: ClaimedUnderlyingDealTokenEvent): void {
	let dealCreatedEntity = getDealCreated(event.address.toHex())
	if (dealCreatedEntity == null) {
		return
	}

	let vestEntity = new Vest(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)

	vestEntity.amountVested = event.params.underlyingDealTokensClaimed
	vestEntity.pool = dealCreatedEntity.poolAddress.toHex()
	vestEntity.userAddress = event.params.recipient
	vestEntity.timestamp = event.block.timestamp

	vestEntity.save()
}

function createDepositDealTokenEntity(event: DepositDealTokenEvent): void {
	let depositDealTokenEntity = new DepositDealToken(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	depositDealTokenEntity.underlyingDealTokenAddress =
		event.params.underlyingDealTokenAddress
	depositDealTokenEntity.depositor = event.params.depositor
	depositDealTokenEntity.dealContract = event.address
	depositDealTokenEntity.underlyingDealTokenAmount =
		event.params.underlyingDealTokenAmount

	depositDealTokenEntity.save()
}

function createDealFundedEntity(event: DealFullyFundedEvent): void {
	let poolCreatedEntity = getPoolCreated(event.params.poolAddress.toHex())
	let dealDetailEntity = getDealDetails(event.address.toHex())

	if (dealDetailEntity == null || poolCreatedEntity == null) {
		return
	}

	let dealFundedEntity = new DealFunded(
		event.address.toHex() + '-' + poolCreatedEntity.sponsor.toHex()
	)
	dealFundedEntity.holder = dealDetailEntity.holder
	dealFundedEntity.poolName = poolCreatedEntity.name
	dealFundedEntity.timestamp = event.block.timestamp
	dealFundedEntity.pool = event.params.poolAddress.toHex()

	dealFundedEntity.save()
}

function createDealFullyFundedEntity(event: DealFullyFundedEvent): void {
	let dealFullyFundedEntity = new DealFullyFunded(event.address.toHex())
	dealFullyFundedEntity.poolAddress = event.params.poolAddress
	dealFullyFundedEntity.proRataRedemptionExpiry =
		event.params.proRataRedemptionExpiry
	dealFullyFundedEntity.proRataRedemptionStart =
		event.params.proRataRedemptionStart
	dealFullyFundedEntity.openRedemptionExpiry = event.params.openRedemptionExpiry
	dealFullyFundedEntity.openRedemptionStart = event.params.openRedemptionStart

	dealFullyFundedEntity.save()
}

function createWithdrawUnderlyingDealTokenEntity(
	event: WithdrawUnderlyingDealTokenEvent
): void {
	let withdrawEntity = new WithdrawUnderlyingDealToken(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	withdrawEntity.underlyingDealTokenAddress =
		event.params.underlyingDealTokenAddress
	withdrawEntity.depositor = event.params.depositor
	withdrawEntity.dealContract = event.address
	withdrawEntity.underlyingDealTokenAmount =
		event.params.underlyingDealTokenAmount

	withdrawEntity.save()
}

function createClaimedUnderlyingDealTokenEntity(
	event: ClaimedUnderlyingDealTokenEvent
): void {
	let claimedEntity = new ClaimedUnderlyingDealToken(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	claimedEntity.dealAddress = event.address
	claimedEntity.underlyingDealTokenAddress =
		event.params.underlyingDealTokenAddress
	claimedEntity.recipient = event.params.recipient
	claimedEntity.underlyingDealTokensClaimed =
		event.params.underlyingDealTokensClaimed

	claimedEntity.save()
}

function createTransferDealEntity(event: TransferDealEvent): void {
	let transferEntity = new Transfer(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	transferEntity.from = event.params.from
	transferEntity.to = event.params.to
	transferEntity.value = event.params.value
	transferEntity.save()
}

function createSetHolderEntity(event: SetHolderEvent): void {
	let setHolderEntity = new SetHolder(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	setHolderEntity.holder = event.params.holder
	setHolderEntity.save()
}

function createTotalDealsBySponsorEntity(event: CreateDealEvent): void {
	let totalDealsBySponsorEntity = new TotalDealsBySponsor(
		event.params.sponsor.toHexString()
	)
	totalDealsBySponsorEntity.count = 0
	totalDealsBySponsorEntity.save()
}

function createUserAllocationStatEntity(event: AcceptDealEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let userAllocationStatEntity = new UserAllocationStat(
		event.params.purchaser.toHex() + '-' + event.params.dealAddress.toHex()
	)
	userAllocationStatEntity.userAddress = event.params.purchaser
	userAllocationStatEntity.totalWithdrawn = BigInt.fromI32(0)
	userAllocationStatEntity.totalAccepted = BigInt.fromI32(0)
	userAllocationStatEntity.pool = poolCreatedEntity.id
	userAllocationStatEntity.save()
}

function createDealAcceptedEntity(event: AcceptDealEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let dealAcceptedEntity = new DealAccepted(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)

	let exp = DEAL_WRAPPER_DECIMALS.minus(
		BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals)
	)
	let dealTokenAmount = event.params.poolTokenAmount.times(
		// @ts-ignore
		BigInt.fromI32(10).pow(<u8>exp.toI32())
	)
	let aelinDealContract = AelinDealContract.bind(event.params.dealAddress)
	let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()

	dealAcceptedEntity.userAddress = event.params.purchaser
	dealAcceptedEntity.timestamp = event.block.timestamp
	dealAcceptedEntity.poolName = poolCreatedEntity.name
	dealAcceptedEntity.investmentAmount = event.params.poolTokenAmount
	dealAcceptedEntity.dealTokenAmount = dealTokenAmount
		.times(underlyingPerDealExchangeRate)
		.div(BigInt.fromI32(10).pow(18))
	dealAcceptedEntity.pool = event.address.toHex()

	dealAcceptedEntity.save()
}

function createVestingDealEntity(event: AcceptDealEvent): void {
	let vestingDealEntity = new VestingDeal(
		event.params.purchaser.toHex() + '-' + event.params.dealAddress.toHex()
	)

	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	let dealDetailEntity = getDealDetails(event.params.dealAddress.toHex())

	if (dealDetailEntity == null || poolCreatedEntity == null) {
		return
	}

	let exp = DEAL_WRAPPER_DECIMALS.minus(
		BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals)
	)
	let dealTokenAmount = event.params.poolTokenAmount.times(
		// @ts-ignore
		BigInt.fromI32(10).pow(<u8>exp.toI32())
	)
	let aelinDealContract = AelinDealContract.bind(event.params.dealAddress)
	let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()
	let investorDealTotal = dealTokenAmount.times(underlyingPerDealExchangeRate)

	vestingDealEntity.poolName = poolCreatedEntity.name
	vestingDealEntity.tokenToVest = dealDetailEntity.underlyingDealToken
	vestingDealEntity.tokenToVestSymbol =
		dealDetailEntity.underlyingDealTokenSymbol
	vestingDealEntity.investorDealTotal = investorDealTotal.div(
		BigInt.fromI32(10).pow(18)
	)
	vestingDealEntity.amountToVest = dealDetailEntity.underlyingDealTokenTotal
	vestingDealEntity.totalVested = BigInt.fromI32(0)
	vestingDealEntity.vestingPeriodEnds = aelinDealContract.vestingExpiry()
	vestingDealEntity.investorAddress = event.params.purchaser
	vestingDealEntity.pool = poolCreatedEntity.id

	vestingDealEntity.save()
}

function createAcceptDealEntity(event: AcceptDealEvent): void {
	let acceptDealEntity = new AcceptDeal(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	acceptDealEntity.purchaser = event.params.purchaser
	acceptDealEntity.poolAddress = event.address
	acceptDealEntity.dealAddress = event.params.dealAddress
	acceptDealEntity.poolTokenAmount = event.params.poolTokenAmount
	acceptDealEntity.aelinFee = event.params.aelinFee
	acceptDealEntity.sponsorFee = event.params.sponsorFee
	acceptDealEntity.save()
}

function createWithdrawEntity(event: WithdrawFromPoolEvent): void {
	let withdrawEntity = new Withdraw(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)

	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	withdrawEntity.userAddress = event.params.purchaser
	withdrawEntity.timestamp = event.block.timestamp
	withdrawEntity.poolName = poolCreatedEntity.name
	withdrawEntity.amountWithdrawn = event.params.purchaseTokenAmount
	withdrawEntity.pool = event.address.toHex()

	withdrawEntity.save()
}

function createWithdrawFromPoolEntity(event: WithdrawFromPoolEvent): void {
	let withdrawFromPoolEntity = new WithdrawFromPool(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	withdrawFromPoolEntity.purchaser = event.params.purchaser
	withdrawFromPoolEntity.poolAddress = event.address
	withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount

	withdrawFromPoolEntity.save()
}

function createDepositEntity(event: PurchasePoolTokenEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let depositEntity = new Deposit(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)

	depositEntity.userAddress = event.params.purchaser
	depositEntity.timestamp = event.block.timestamp
	depositEntity.poolName = poolCreatedEntity.name
	depositEntity.sponsor = poolCreatedEntity.sponsor
	depositEntity.amountDeposited = event.params.purchaseTokenAmount
	depositEntity.pool = event.address.toHex()

	depositEntity.save()
}

function createPurchasePoolTokenEntity(event: PurchasePoolTokenEvent): void {
	let purchasePoolTokenEntity = new PurchasePoolToken(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	purchasePoolTokenEntity.timestamp = event.block.timestamp
	purchasePoolTokenEntity.purchaser = event.params.purchaser
	purchasePoolTokenEntity.poolAddress = event.address
	purchasePoolTokenEntity.purchaseTokenAmount = event.params.purchaseTokenAmount

	purchasePoolTokenEntity.save()
}

function createTransferEntity(event: TransferEvent): void {
	let transferEntity = new Transfer(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)

	transferEntity.from = event.params.from
	transferEntity.to = event.params.to
	transferEntity.value = event.params.value
	transferEntity.save()
}

function createSetSponsorEntity(event: SetSponsorEvent): void {
	let setSponsorEntity = new SetSponsor(
		event.transaction.hash.toHex() + '-' + event.logIndex.toString()
	)
	setSponsorEntity.sponsor = event.params.sponsor
	setSponsorEntity.save()
}

function createAelinTokenEntity(event: AelinTokenEvent): void {
	let aelinPoolTokenEntity = new AelinToken(event.address.toHex())
	aelinPoolTokenEntity.decimals = event.params.decimals
	aelinPoolTokenEntity.name = event.params.name
	aelinPoolTokenEntity.symbol = event.params.symbol

	aelinPoolTokenEntity.save()
}

function createDealCreatedEntity(event: CreateDealEvent): void {
	let dealCreatedEntity = new DealCreated(event.params.dealContract.toHex())
	dealCreatedEntity.name = event.params.name
	dealCreatedEntity.symbol = event.params.symbol
	dealCreatedEntity.sponsor = event.params.sponsor
	dealCreatedEntity.poolAddress = event.address

	dealCreatedEntity.save()
}

function createDealSponsoredEntity(event: CreateDealEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let dealSponsoredEntity = new DealSponsored(
		event.address.toHex() + '-' + event.params.sponsor.toHex()
	)
	dealSponsoredEntity.sponsor = event.params.sponsor
	dealSponsoredEntity.timestamp = event.block.timestamp
	dealSponsoredEntity.poolName = poolCreatedEntity.name
	dealSponsoredEntity.amountEarned = BigInt.fromI32(0)
	dealSponsoredEntity.totalAccepted = BigInt.fromI32(0)
	dealSponsoredEntity.totalInvested = BigInt.fromI32(0)
	dealSponsoredEntity.sponsorFee = poolCreatedEntity.sponsorFee
	dealSponsoredEntity.pool = event.address.toHex()

	dealSponsoredEntity.save()
}

function createDealDetailEntity(event: DealDetailEvent): void {
	let dealDetailEntity = new DealDetail(event.params.dealContract.toHex())
	dealDetailEntity.underlyingDealToken = event.params.underlyingDealToken
	dealDetailEntity.purchaseTokenTotalForDeal =
		event.params.purchaseTokenTotalForDeal
	dealDetailEntity.underlyingDealTokenTotal =
		event.params.underlyingDealTokenTotal
	dealDetailEntity.vestingPeriod = event.params.vestingPeriod
	dealDetailEntity.vestingCliff = event.params.vestingCliff
	dealDetailEntity.proRataRedemptionPeriod =
		event.params.proRataRedemptionPeriod
	dealDetailEntity.openRedemptionPeriod = event.params.openRedemptionPeriod
	dealDetailEntity.holder = event.params.holder
	dealDetailEntity.holderFundingDuration = event.params.holderFundingDuration
	dealDetailEntity.holderFundingExpiration = event.params.holderFundingDuration.plus(
		event.block.timestamp
	)
	dealDetailEntity.isDealFunded = false
	//get underlyingDealToken symbol and decimals
	const underlyingDealToken = ERC20.bind(event.params.underlyingDealToken)
	dealDetailEntity.underlyingDealTokenSymbol = underlyingDealToken.symbol()
	dealDetailEntity.underlyingDealTokenDecimals = underlyingDealToken.decimals()
	dealDetailEntity.underlyingDealTokenTotalSupply = underlyingDealToken.totalSupply()
	dealDetailEntity.save()
}

export function getDealCreated(address: string): DealCreated | null {
	let dealCreatedEntity = DealCreated.load(address)
	if (dealCreatedEntity == null) {
		log.error('trying to find deal not saved with address: {}', [address])
		return null
	}

	return dealCreatedEntity
}

export function getDealDetails(address: string): DealDetail | null {
	let dealDetailsEntity = DealDetail.load(address)
	if (dealDetailsEntity == null) {
		log.error('trying to find deal not saved with address: {}', [address])
		return null
	}

	return dealDetailsEntity
}

export function getPoolCreated(address: string): PoolCreated | null {
	let poolCreatedEntity = PoolCreated.load(address)
	if (poolCreatedEntity == null) {
		log.error('trying to find pool not saved with address: {}', [address])
		return null
	}

	return poolCreatedEntity
}

export function getVestingDeal(address: string): VestingDeal | null {
	let vestingDealEntity = VestingDeal.load(address)
	if (vestingDealEntity == null) {
		log.error('trying to find a vestingDeal not saved with address: {}', [
			address
		])
		return null
	}

	return vestingDealEntity
}

export function getDealFunded(address: string): DealFunded | null {
	let dealFundedEntity = DealFunded.load(address)
	if (dealFundedEntity == null) {
		log.error('trying to find a dealFunded not saved with address: {}', [
			address
		])
		return null
	}

	return dealFundedEntity
}

export function getDealSponsored(address: string): DealSponsored | null {
	let dealSponsoredEntity = DealSponsored.load(address)
	if (dealSponsoredEntity == null) {
		log.error('trying to find a ealSponsored not saved with address: {}', [])
		return null
	}

	return dealSponsoredEntity
}

export function getUserAllocationStat(
	address: string
): UserAllocationStat | null {
	let userAllocationStatEntity = UserAllocationStat.load(address)
	if (userAllocationStatEntity == null) {
		log.error(
			'trying to find a userAllocationStat not saved with address: {}',
			[address]
		)
		return null
	}

	return userAllocationStatEntity
}

export function getTotalDealsBySponsor(
	address: string
): TotalDealsBySponsor | null {
	let totalDealsBySponsorEntity = TotalDealsBySponsor.load(address)
	if (totalDealsBySponsorEntity == null) {
		log.error(
			'trying to find a TotalDealsBySponsor not saved with address: {}',
			[address]
		)
		return null
	}

	return totalDealsBySponsorEntity
}

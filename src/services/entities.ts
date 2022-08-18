import { BigInt, log } from '@graphprotocol/graph-ts'
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
	PoolWith1155 as PoolWith1155Event
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
	Vest,
	Deal,
	History,
	User,
	NftCollectionRule
} from '../types/schema'

import { AELIN_FEE, DEAL_WRAPPER_DECIMALS, ONE_HUNDRED } from '../helpers'
import { getTokenDecimals, getTokenTotalSupply, getTokenSymbol } from './token'
import { NFTType } from '../enum'

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
	Vest,
	Deal,
	NftCollectionRule
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
		case Entity.UserAllocationStat:
			if (event instanceof PurchasePoolTokenEvent) {
				createUserAllocationStatEntity(event)
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
		case Entity.Deal:
			createOrUpdateDealEntity(event)
			break
		case Entity.NftCollectionRule:
			if (event instanceof PoolWith721Event) {
				createNft721CollectionRules(event)
				break
			} else if (event instanceof PoolWith1155Event) {
				createNft1155CollectionRules(event)
				break
			}
		default:
			log.error('Error in entities service. Trying to create a undefined EntityType??: {}', [])
	}
}

function createNft721CollectionRules(event: PoolWith721Event): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	const nftCollectionRule = new NftCollectionRule(event.address.toHex() + '-' + event.params.collectionAddress.toHex())
	nftCollectionRule.poolAddress = event.address
	nftCollectionRule.collectionAddress = event.params.collectionAddress
	nftCollectionRule.purchaseAmount = event.params.purchaseAmount
	nftCollectionRule.purchaseAmountPerToken = event.params.purchaseAmountPerToken
	nftCollectionRule.nftType = NFTType.ERC721

	poolCreatedEntity.hasNftList = true

	let nftCollectionRules = poolCreatedEntity.nftCollectionRules
	nftCollectionRules.push(nftCollectionRule.id)
	poolCreatedEntity.nftCollectionRules = nftCollectionRules

	nftCollectionRule.save()
	poolCreatedEntity.save()
}

function createNft1155CollectionRules(event: PoolWith1155Event): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	const nftCollectionRule = new NftCollectionRule(event.address.toHex() + '-' + event.params.collectionAddress.toHex())
	nftCollectionRule.poolAddress = event.address
	nftCollectionRule.collectionAddress = event.params.collectionAddress
	nftCollectionRule.purchaseAmount = event.params.purchaseAmount
	nftCollectionRule.purchaseAmountPerToken = event.params.purchaseAmountPerToken
	nftCollectionRule.nftType = NFTType.ERC1155
	nftCollectionRule.erc1155TokenIds = event.params.tokenIds
	nftCollectionRule.erc1155TokensAmtEligible = event.params.minTokensEligible

	poolCreatedEntity.hasNftList = true

	let nftCollectionRules = poolCreatedEntity.nftCollectionRules
	nftCollectionRules.push(nftCollectionRule.id)
	poolCreatedEntity.nftCollectionRules = nftCollectionRules

	nftCollectionRule.save()
	poolCreatedEntity.save()
}

function createVestEntity(event: ClaimedUnderlyingDealTokenEvent): void {
	let dealCreatedEntity = getDealCreated(event.address.toHex())
	if (dealCreatedEntity == null) {
		return
	}

	let poolCreatedEntity = getPoolCreated(dealCreatedEntity.poolAddress.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let vestEntity = new Vest(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

	vestEntity.amountVested = event.params.underlyingDealTokensClaimed
	vestEntity.pool = dealCreatedEntity.poolAddress.toHex()
	vestEntity.userAddress = event.params.recipient
	vestEntity.timestamp = event.block.timestamp
	vestEntity.poolName = poolCreatedEntity.name

	let historyEntity = getOrCreateHistory(event.params.recipient.toHex())
	if (historyEntity != null) {
		let vests = historyEntity.vests
		vests.push(vestEntity.id)
		historyEntity.vests = vests
		historyEntity.save()
	}

	vestEntity.save()
}

function createDepositDealTokenEntity(event: DepositDealTokenEvent): void {
	let depositDealTokenEntity = new DepositDealToken(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	depositDealTokenEntity.underlyingDealTokenAddress = event.params.underlyingDealTokenAddress
	depositDealTokenEntity.depositor = event.params.depositor
	depositDealTokenEntity.dealContract = event.address
	depositDealTokenEntity.underlyingDealTokenAmount = event.params.underlyingDealTokenAmount

	depositDealTokenEntity.save()
}

function createDealFundedEntity(event: DealFullyFundedEvent): void {
	let poolCreatedEntity = getPoolCreated(event.params.poolAddress.toHex())
	let dealEntity = getDeal(event.address.toHex())

	if (dealEntity == null || poolCreatedEntity == null) {
		return
	}

	let dealFundedEntity = new DealFunded(event.address.toHex() + '-' + dealEntity.holder.toHex())
	dealFundedEntity.holder = dealEntity.holder
	dealFundedEntity.poolName = poolCreatedEntity.name
	dealFundedEntity.timestamp = event.block.timestamp
	dealFundedEntity.pool = event.params.poolAddress.toHex()
	dealFundedEntity.amountFunded = dealEntity.underlyingDealTokenTotal
	dealFundedEntity.purchaseTokenSymbol = poolCreatedEntity.purchaseTokenSymbol
	dealFundedEntity.purchaseTokenDecimals = poolCreatedEntity.purchaseTokenDecimals
	dealFundedEntity.underlyingDealTokenSymbol = dealEntity.underlyingDealTokenSymbol
	dealFundedEntity.underlyingDealTokenDecimals = dealEntity.underlyingDealTokenDecimals

	let historyEntity = getOrCreateHistory(dealEntity.holder.toHex())
	if (historyEntity != null) {
		let dealsFunded = historyEntity.dealsFunded
		dealsFunded.push(dealFundedEntity.id)
		historyEntity.dealsFunded = dealsFunded
		historyEntity.save()
	}

	dealFundedEntity.save()
}

function createDealFullyFundedEntity(event: DealFullyFundedEvent): void {
	let dealFullyFundedEntity = new DealFullyFunded(event.address.toHex())
	dealFullyFundedEntity.poolAddress = event.params.poolAddress
	dealFullyFundedEntity.proRataRedemptionExpiry = event.params.proRataRedemptionExpiry
	dealFullyFundedEntity.proRataRedemptionStart = event.params.proRataRedemptionStart
	dealFullyFundedEntity.openRedemptionExpiry = event.params.openRedemptionExpiry
	dealFullyFundedEntity.openRedemptionStart = event.params.openRedemptionStart

	dealFullyFundedEntity.save()
}

function createWithdrawUnderlyingDealTokenEntity(event: WithdrawUnderlyingDealTokenEvent): void {
	let withdrawEntity = new WithdrawUnderlyingDealToken(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	withdrawEntity.underlyingDealTokenAddress = event.params.underlyingDealTokenAddress
	withdrawEntity.depositor = event.params.depositor
	withdrawEntity.dealContract = event.address
	withdrawEntity.underlyingDealTokenAmount = event.params.underlyingDealTokenAmount

	withdrawEntity.save()
}

function createClaimedUnderlyingDealTokenEntity(event: ClaimedUnderlyingDealTokenEvent): void {
	let claimedEntity = new ClaimedUnderlyingDealToken(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	claimedEntity.dealAddress = event.address
	claimedEntity.underlyingDealTokenAddress = event.params.underlyingDealTokenAddress
	claimedEntity.recipient = event.params.recipient
	claimedEntity.underlyingDealTokensClaimed = event.params.underlyingDealTokensClaimed

	claimedEntity.save()

	let vestingDealEntity = getVestingDeal(event.params.recipient.toHex() + '-' + event.address.toHex())
	if (vestingDealEntity) {
		vestingDealEntity.lastClaim = event.block.timestamp
		vestingDealEntity.save()
	}
}

function createTransferDealEntity(event: TransferDealEvent): void {
	let transferEntity = new Transfer(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	transferEntity.from = event.params.from
	transferEntity.to = event.params.to
	transferEntity.value = event.params.value
	transferEntity.save()
}

function createSetHolderEntity(event: SetHolderEvent): void {
	let setHolderEntity = new SetHolder(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	setHolderEntity.holder = event.params.holder
	setHolderEntity.save()
}

function createTotalDealsBySponsorEntity(event: CreateDealEvent): void {
	let totalDealsBySponsorEntity = new TotalDealsBySponsor(event.params.sponsor.toHexString())
	totalDealsBySponsorEntity.count = 0
	totalDealsBySponsorEntity.save()
}

function createUserAllocationStatEntity(event: PurchasePoolTokenEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	let userAllocationStatEntity = new UserAllocationStat(event.params.purchaser.toHex() + '-' + event.address.toHex())
	userAllocationStatEntity.userAddress = event.params.purchaser
	userAllocationStatEntity.totalWithdrawn = BigInt.fromI32(0)
	userAllocationStatEntity.totalAccepted = BigInt.fromI32(0)
	userAllocationStatEntity.poolTokenBalance = BigInt.fromI32(0)
	userAllocationStatEntity.pool = poolCreatedEntity.id

	let userEntity = getOrCreateUser(event.params.purchaser.toHex())
	if (userEntity != null) {
		let allocationsStat = userEntity.allocationsStat
		allocationsStat.push(userAllocationStatEntity.id)
		userEntity.allocationsStat = allocationsStat
		userEntity.save()
	}

	userAllocationStatEntity.save()
}

function createDealAcceptedEntity(event: AcceptDealEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	const dealAddress = poolCreatedEntity.dealAddress
	if (!dealAddress) {
		return
	}

	const dealEntity = getDeal(dealAddress.toHex())
	if (!dealEntity) {
		return
	}

	let dealAcceptedEntity = new DealAccepted(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

	let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals))
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
	dealAcceptedEntity.dealTokenAmount = dealTokenAmount.times(underlyingPerDealExchangeRate).div(BigInt.fromI32(10).pow(18))
	dealAcceptedEntity.pool = event.address.toHex()

	let historyEntity = getOrCreateHistory(event.params.purchaser.toHex())
	if (historyEntity != null) {
		let dealsAccepted = historyEntity.dealsAccepted
		dealsAccepted.push(dealAddress.toHex())
		historyEntity.dealsAccepted = dealsAccepted
		historyEntity.save()
	}

	let userEntity = getOrCreateUser(event.params.purchaser.toHex())
	if (userEntity != null) {
		let dealsAccepted = userEntity.dealsAccepted
		let dealsAcceptedIndex = dealsAccepted.indexOf(dealAddress.toHex())
		//Check if already accepted
		if (dealsAcceptedIndex < 0) {
			dealsAccepted.push(dealAddress.toHex())
			userEntity.dealsAccepted = dealsAccepted
			userEntity.dealsAcceptedAmt = dealsAccepted.length
			dealEntity.totalUsersAccepted++
			dealEntity.save()
		}

		// If dealAccepted then remove it from poolsInvested to avoid duplicates/redundant info
		let poolsInvested = userEntity.poolsInvested
		let poolInvestedIndex = poolsInvested.indexOf(dealAcceptedEntity.pool)
		if (poolInvestedIndex >= 0) {
			poolsInvested.splice(poolInvestedIndex, 1)
			userEntity.poolsInvested = poolsInvested
		}

		userEntity.save()
	}

	dealAcceptedEntity.save()
}
export function createOrUpdateSponsorVestingDeal(event: AcceptDealEvent): void {
	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	let dealEntity = getDeal(event.params.dealAddress.toHex())

	if (dealEntity == null || poolCreatedEntity == null) {
		return
	}

	let vestingDealEntity = getVestingDeal(poolCreatedEntity.sponsor.toHex() + '-' + event.params.dealAddress.toHex())

	let aelinDealContract = AelinDealContract.bind(event.params.dealAddress)
	let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()
	let investorDealTotal = event.params.sponsorFee.times(underlyingPerDealExchangeRate).div(BigInt.fromI32(10).pow(18))

	if (vestingDealEntity === null) {
		vestingDealEntity = new VestingDeal(poolCreatedEntity.sponsor.toHex() + '-' + event.params.dealAddress.toHex())

		vestingDealEntity.poolName = poolCreatedEntity.name
		vestingDealEntity.poolAddress = event.address
		vestingDealEntity.tokenToVest = dealEntity.underlyingDealToken
		vestingDealEntity.tokenToVestSymbol = dealEntity.underlyingDealTokenSymbol
		vestingDealEntity.investorDealTotal = investorDealTotal
		vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal
		vestingDealEntity.totalVested = BigInt.fromI32(0)
		vestingDealEntity.vestingPeriodStarts = dealEntity.vestingPeriodStarts
		vestingDealEntity.vestingPeriodEnds = dealEntity.vestingPeriodStarts.plus(dealEntity.vestingPeriod)
		vestingDealEntity.underlyingDealTokenDecimals = dealEntity.underlyingDealTokenDecimals
		vestingDealEntity.user = poolCreatedEntity.sponsor.toHex()
		vestingDealEntity.pool = poolCreatedEntity.id
	} else {
		vestingDealEntity.investorDealTotal = vestingDealEntity.investorDealTotal.plus(investorDealTotal)
		vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal
	}

	vestingDealEntity.save()
}

function createVestingDealEntity(event: AcceptDealEvent): void {
	createOrUpdateSponsorVestingDeal(event)

	let vestingDealEntity = getVestingDeal(event.params.purchaser.toHex() + '-' + event.params.dealAddress.toHex())

	if (vestingDealEntity == null) {
		vestingDealEntity = new VestingDeal(event.params.purchaser.toHex() + '-' + event.params.dealAddress.toHex())
	}

	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	let dealEntity = getDeal(event.params.dealAddress.toHex())

	if (dealEntity == null || poolCreatedEntity == null) {
		return
	}

	let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals))
	let dealTokenAmount = event.params.poolTokenAmount.times(
		// @ts-ignore
		BigInt.fromI32(10).pow(<u8>exp.toI32())
	)
	let aelinDealContract = AelinDealContract.bind(event.params.dealAddress)
	let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()
	let investorDealTotal = dealTokenAmount.times(underlyingPerDealExchangeRate)

	vestingDealEntity.poolName = poolCreatedEntity.name
	vestingDealEntity.poolAddress = event.address
	vestingDealEntity.tokenToVest = dealEntity.underlyingDealToken
	vestingDealEntity.tokenToVestSymbol = dealEntity.underlyingDealTokenSymbol

	let sponsorFee = poolCreatedEntity.sponsorFee.div(BigInt.fromI32(10).pow(18))

	vestingDealEntity.investorDealTotal = vestingDealEntity.investorDealTotal.plus(
		investorDealTotal
			.div(BigInt.fromI32(10).pow(18))
			.times(ONE_HUNDRED.minus(AELIN_FEE).minus(sponsorFee)) // total Fees
			.div(ONE_HUNDRED)
	)

	vestingDealEntity.remainingAmountToVest = vestingDealEntity.investorDealTotal
	vestingDealEntity.totalVested = BigInt.fromI32(0)
	vestingDealEntity.vestingPeriodStarts = dealEntity.vestingPeriodStarts
	vestingDealEntity.vestingPeriodEnds = dealEntity.vestingPeriodStarts.plus(dealEntity.vestingPeriod)
	vestingDealEntity.underlyingDealTokenDecimals = dealEntity.underlyingDealTokenDecimals
	vestingDealEntity.user = event.params.purchaser.toHex()
	vestingDealEntity.pool = poolCreatedEntity.id

	vestingDealEntity.save()
}

function createAcceptDealEntity(event: AcceptDealEvent): void {
	let acceptDealEntity = new AcceptDeal(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	acceptDealEntity.purchaser = event.params.purchaser
	acceptDealEntity.poolAddress = event.address
	acceptDealEntity.dealAddress = event.params.dealAddress
	acceptDealEntity.poolTokenAmount = event.params.poolTokenAmount
	acceptDealEntity.aelinFee = event.params.aelinFee
	acceptDealEntity.sponsorFee = event.params.sponsorFee
	acceptDealEntity.save()
}

function createWithdrawEntity(event: WithdrawFromPoolEvent): void {
	let withdrawEntity = new Withdraw(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

	let poolCreatedEntity = getPoolCreated(event.address.toHex())
	if (poolCreatedEntity == null) {
		return
	}

	withdrawEntity.userAddress = event.params.purchaser
	withdrawEntity.timestamp = event.block.timestamp
	withdrawEntity.poolName = poolCreatedEntity.name
	withdrawEntity.amountWithdrawn = event.params.purchaseTokenAmount
	withdrawEntity.pool = event.address.toHex()

	let historyEntity = getOrCreateHistory(event.params.purchaser.toHex())
	if (historyEntity != null) {
		let withdraws = historyEntity.withdraws
		withdraws.push(withdrawEntity.id)
		historyEntity.withdraws = withdraws
		historyEntity.save()
	}

	withdrawEntity.save()
}

function createWithdrawFromPoolEntity(event: WithdrawFromPoolEvent): void {
	let withdrawFromPoolEntity = new WithdrawFromPool(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
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

	let depositEntity = new Deposit(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

	depositEntity.userAddress = event.params.purchaser
	depositEntity.timestamp = event.block.timestamp
	depositEntity.poolName = poolCreatedEntity.name
	depositEntity.sponsor = poolCreatedEntity.sponsor
	depositEntity.amountDeposited = event.params.purchaseTokenAmount
	depositEntity.pool = event.address.toHex()

	let historyEntity = getOrCreateHistory(event.params.purchaser.toHex())
	if (historyEntity != null) {
		let deposits = historyEntity.deposits
		deposits.push(depositEntity.id)
		historyEntity.deposits = deposits
		historyEntity.save()
	}

	depositEntity.save()
}

function createPurchasePoolTokenEntity(event: PurchasePoolTokenEvent): void {
	let purchasePoolTokenEntity = new PurchasePoolToken(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
	purchasePoolTokenEntity.timestamp = event.block.timestamp
	purchasePoolTokenEntity.purchaser = event.params.purchaser
	purchasePoolTokenEntity.poolAddress = event.address
	purchasePoolTokenEntity.purchaseTokenAmount = event.params.purchaseTokenAmount

	let userEntity = getOrCreateUser(event.params.purchaser.toHex())
	if (userEntity != null) {
		let poolsInvested = userEntity.poolsInvested
		poolsInvested.push(event.address.toHex())
		userEntity.poolsInvested = poolsInvested
		userEntity.poolsInvestedAmt = poolsInvested.length
		userEntity.save()
	}

	purchasePoolTokenEntity.save()
}

function createTransferEntity(event: TransferEvent): void {
	let transferEntity = new Transfer(event.transaction.hash.toHex() + '-' + event.logIndex.toString())

	transferEntity.from = event.params.from
	transferEntity.to = event.params.to
	transferEntity.value = event.params.value
	transferEntity.save()
}

function createSetSponsorEntity(event: SetSponsorEvent): void {
	let setSponsorEntity = new SetSponsor(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
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

	let dealSponsoredEntity = new DealSponsored(event.address.toHex() + '-' + event.params.sponsor.toHex())
	dealSponsoredEntity.sponsor = event.params.sponsor
	dealSponsoredEntity.timestamp = event.block.timestamp
	dealSponsoredEntity.poolName = poolCreatedEntity.name
	dealSponsoredEntity.amountEarned = BigInt.fromI32(0)
	dealSponsoredEntity.totalAccepted = BigInt.fromI32(0)
	dealSponsoredEntity.totalInvested = BigInt.fromI32(0)
	dealSponsoredEntity.sponsorFee = poolCreatedEntity.sponsorFee
	dealSponsoredEntity.pool = event.address.toHex()

	let historyEntity = getOrCreateHistory(event.params.sponsor.toHex())
	if (historyEntity != null) {
		let dealsSponsored = historyEntity.dealsSponsored
		dealsSponsored.push(dealSponsoredEntity.id)
		historyEntity.dealsSponsored = dealsSponsored
		historyEntity.save()
	}

	dealSponsoredEntity.save()
}

function createDealDetailEntity(event: DealDetailEvent): void {
	let dealDetailEntity = new DealDetail(event.params.dealContract.toHex())
	dealDetailEntity.underlyingDealToken = event.params.underlyingDealToken
	dealDetailEntity.purchaseTokenTotalForDeal = event.params.purchaseTokenTotalForDeal
	dealDetailEntity.underlyingDealTokenTotal = event.params.underlyingDealTokenTotal
	dealDetailEntity.vestingPeriod = event.params.vestingPeriod
	dealDetailEntity.vestingCliff = event.params.vestingCliff
	dealDetailEntity.proRataRedemptionPeriod = event.params.proRataRedemptionPeriod
	dealDetailEntity.openRedemptionPeriod = event.params.openRedemptionPeriod
	dealDetailEntity.holder = event.params.holder
	dealDetailEntity.holderFundingDuration = event.params.holderFundingDuration
	dealDetailEntity.holderFundingExpiration = event.params.holderFundingDuration.plus(event.block.timestamp)
	dealDetailEntity.isDealFunded = false
	dealDetailEntity.underlyingDealTokenSymbol = getTokenSymbol(event.params.underlyingDealToken)
	dealDetailEntity.underlyingDealTokenDecimals = getTokenDecimals(event.params.underlyingDealToken)
	dealDetailEntity.underlyingDealTokenTotalSupply = getTokenTotalSupply(event.params.underlyingDealToken)
	dealDetailEntity.save()
}

function createOrUpdateDealEntity<E>(event: E): void {
	if (event instanceof CreateDealEvent) {
		let dealEntity = new Deal(event.params.dealContract.toHex())
		dealEntity.name = event.params.name
		dealEntity.symbol = event.params.symbol
		dealEntity.poolAddress = event.address
		dealEntity.timestamp = event.block.timestamp
		dealEntity.save()
	} else if (event instanceof DealDetailEvent) {
		let dealEntity = getDeal(event.params.dealContract.toHex())
		if (dealEntity != null) {
			dealEntity.underlyingDealToken = event.params.underlyingDealToken
			dealEntity.purchaseTokenTotalForDeal = event.params.purchaseTokenTotalForDeal
			dealEntity.underlyingDealTokenTotal = event.params.underlyingDealTokenTotal
			dealEntity.vestingPeriod = event.params.vestingPeriod
			dealEntity.vestingCliff = event.params.vestingCliff
			dealEntity.vestingPeriodStarts = event.block.timestamp
				.plus(event.params.proRataRedemptionPeriod)
				.plus(event.params.openRedemptionPeriod)
				.plus(event.params.vestingCliff)
			dealEntity.proRataRedemptionPeriod = event.params.proRataRedemptionPeriod
			dealEntity.openRedemptionPeriod = event.params.openRedemptionPeriod
			dealEntity.holder = event.params.holder
			dealEntity.holderFundingDuration = event.params.holderFundingDuration
			dealEntity.holderFundingExpiration = event.params.holderFundingDuration.plus(event.block.timestamp)
			dealEntity.isDealFunded = false
			dealEntity.underlyingDealTokenSymbol = getTokenSymbol(event.params.underlyingDealToken)
			dealEntity.underlyingDealTokenDecimals = getTokenDecimals(event.params.underlyingDealToken)
			dealEntity.underlyingDealTokenTotalSupply = getTokenTotalSupply(event.params.underlyingDealToken)

			let aelinDealContract = AelinDealContract.bind(event.params.dealContract)
			dealEntity.maxDealTotalSupply = aelinDealContract.maxTotalSupply()

			let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate()
			dealEntity.underlyingPerDealExchangeRate = underlyingPerDealExchangeRate

			let poolCreatedEntity = getPoolCreated(event.address.toHex())
			if (poolCreatedEntity) {
				let dealsCreated = poolCreatedEntity.dealsCreated + 1
				poolCreatedEntity.dealsCreated = dealsCreated
				poolCreatedEntity.save()
			}

			let userEntity = getOrCreateUser(event.params.holder.toHex())
			if (userEntity != null) {
				let poolsAsHolder = userEntity.poolsAsHolder
				poolsAsHolder.push(dealEntity.poolAddress.toHex())
				userEntity.poolsAsHolder = poolsAsHolder
				userEntity.poolsAsHolderAmt = poolsAsHolder.length
				userEntity.save()
			}

			dealEntity.save()
		}
	} else if (event instanceof DealFullyFundedEvent) {
		let dealEntity = getDeal(event.address.toHex())
		if (dealEntity !== null) {
			dealEntity.poolAddress = event.params.poolAddress
			dealEntity.proRataRedemptionExpiry = event.params.proRataRedemptionExpiry
			dealEntity.proRataRedemptionStart = event.params.proRataRedemptionStart
			dealEntity.openRedemptionExpiry = event.params.openRedemptionExpiry
			dealEntity.openRedemptionStart = event.params.openRedemptionStart

			dealEntity.save()
		}
	}
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
		log.error('trying to find a vestingDeal not saved with address: {}', [address])
		return null
	}

	return vestingDealEntity
}

export function getDealFunded(address: string): DealFunded | null {
	let dealFundedEntity = DealFunded.load(address)
	if (dealFundedEntity == null) {
		log.error('trying to find a dealFunded not saved with address: {}', [address])
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

export function getUserAllocationStat(address: string): UserAllocationStat | null {
	let userAllocationStatEntity = UserAllocationStat.load(address)
	if (userAllocationStatEntity == null) {
		log.error('trying to find a userAllocationStat not saved with address: {}', [address])
		return null
	}

	return userAllocationStatEntity
}

export function getTotalDealsBySponsor(address: string): TotalDealsBySponsor | null {
	let totalDealsBySponsorEntity = TotalDealsBySponsor.load(address)
	if (totalDealsBySponsorEntity == null) {
		log.error('trying to find a TotalDealsBySponsor not saved with address: {}', [address])
		return null
	}

	return totalDealsBySponsorEntity
}

export function getDeal(address: string): Deal | null {
	let dealEntity = Deal.load(address)
	if (dealEntity == null) {
		log.error('trying to find a deal not saved with address: {}', [address])
		return null
	}

	return dealEntity
}

export function getOrCreateHistory(address: string): History | null {
	let historyEntity = History.load(address)
	if (historyEntity == null) {
		historyEntity = new History(address)
		historyEntity.user = address
		historyEntity.save()
	}

	return historyEntity
}

export function getOrCreateUser(address: string): User | null {
	let userEntity = User.load(address)
	if (userEntity == null) {
		userEntity = new User(address)
	}

	return userEntity
}

export function getNftCollectionRule(id: string): NftCollectionRule | null {
	let nftCollectionRuleEntity = NftCollectionRule.load(id)
	if (nftCollectionRuleEntity == null) {
		log.error('trying to find a nftCollectionRuleEntity not saved with id: {}', [id])
		return null
	}

	return nftCollectionRuleEntity
}

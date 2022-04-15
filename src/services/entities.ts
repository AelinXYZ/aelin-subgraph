import { BigInt, log } from "@graphprotocol/graph-ts";
import {
    Transfer as TransferEvent,
    SetSponsor as SetSponsorEvent,
    CreateDeal as CreateDealEvent,
    DealDetail as DealDetailEvent,
    PurchasePoolToken as PurchasePoolTokenEvent,
    WithdrawFromPool as WithdrawFromPoolEvent,
    AcceptDeal as AcceptDealEvent,
    AelinToken as AelinTokenEvent,
} from "../types/templates/AelinPool/AelinPool";
import { AelinDeal as AelinDealContract } from "../types/templates/AelinDeal/AelinDeal";

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
    TotalDealsBySponsor
} from "../types/schema";
import { DEAL_WRAPPER_DECIMALS, getDealDetails, getPoolCreated } from "../helpers";
import { ERC20 } from "../types/templates/AelinPool/ERC20";

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
    TotalDealsBySponsor
}

export function createEntity<E>(entityType: Entity, event: E):void {
    switch(entityType) {
        case Entity.DealCreated:
            if(event instanceof CreateDealEvent) {
                createDealCreatedEntity(event);
            }
            break;
        case Entity.DealSponsored:
            if(event instanceof CreateDealEvent) {
                createDealSponsoredEntity(event);
            }
            break;
        case Entity.DealDetail:
            if(event instanceof DealDetailEvent) {
                createDealDetailEntity(event);
            }
            break;
        case Entity.AelinToken:
            if(event instanceof AelinTokenEvent) {
                createAelinTokenEntity(event);
            }
            break;
        case Entity.SetSponsor:
            if(event instanceof SetSponsorEvent) {
                createSetSponsorEntity(event);
            }
            break;
        case Entity.Transfer:
            if(event instanceof TransferEvent) {
                createTransferEntity(event);
            }
            break;
        case Entity.PurchasePoolToken:
            if(event instanceof PurchasePoolTokenEvent) {
                createPurchasePoolTokenEntity(event);
            }
            break;
        case Entity.Deposit:
            if(event instanceof PurchasePoolTokenEvent) {
                createDepositEntity(event);
            }
            break;
        case Entity.WithdrawFromPool:
            if(event instanceof WithdrawFromPoolEvent) {
                createWithdrawFromPoolEntity(event);
            }
            break;
        case Entity.Withdraw:
            if(event instanceof WithdrawFromPoolEvent) {
                createWithdrawEntity(event);
            }
            break;
        case Entity.AcceptDeal:
            if(event instanceof AcceptDealEvent) {
                createAcceptDealEntity(event);
            }
            break;
        case Entity.VestingDeal:
            if(event instanceof AcceptDealEvent) {
                createVestingDealEntity(event);
            }
            break;
        case Entity.DealAccepted:
            if(event instanceof AcceptDealEvent) {
                createDealAcceptedEntity(event);
            }
            break;
        case Entity.UserAllocationStat:
            if(event instanceof AcceptDealEvent) {
                createUserAllocationStatEntity(event);
            }
            break;
        case Entity.TotalDealsBySponsor:
            if(event instanceof CreateDealEvent) {
                createTotalDealsBySponsorEntity(event);
            }
            break;
        default:
            log.error("Error in entities service. Trying to create a undefined EntityType??: {}", []);
    }
}

function createTotalDealsBySponsorEntity(event: CreateDealEvent):void {
    let totalDealsBySponsorEntity = new TotalDealsBySponsor(event.params.sponsor.toHexString());
    totalDealsBySponsorEntity.count = 0;
    totalDealsBySponsorEntity.save();
}

function createUserAllocationStatEntity(event: AcceptDealEvent):void {
    let poolCreatedEntity = getPoolCreated(event.address.toHex());
    if(poolCreatedEntity == null) {
        return;
    }

    let userAllocationStatEntity = new UserAllocationStat(event.params.purchaser.toHex() + "-" + event.params.dealAddress.toHex());
    userAllocationStatEntity.userAddress = event.params.purchaser;
    userAllocationStatEntity.totalWithdrawn = BigInt.fromI32(0);
    userAllocationStatEntity.totalAccepted = BigInt.fromI32(0);
    userAllocationStatEntity.pool = poolCreatedEntity.id;
}

function createDealAcceptedEntity(event: AcceptDealEvent):void {
    let poolCreatedEntity = getPoolCreated(event.address.toHex());
    if(poolCreatedEntity == null) {
        return;
    }

    let dealAcceptedEntity = new DealAccepted(event.transaction.hash.toHex() + "-" + event.logIndex.toString());

    let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals));
    // @ts-ignore 
    let dealTokenAmount = event.params.poolTokenAmount.times(BigInt.fromI32(10).pow(<u8>exp.toI32()));
    let aelinDealContract = AelinDealContract.bind(event.params.dealAddress);
    let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate();

    dealAcceptedEntity.userAddress = event.params.purchaser;
    dealAcceptedEntity.timestamp = event.block.timestamp;
    dealAcceptedEntity.poolName = poolCreatedEntity.name;
    dealAcceptedEntity.investmentAmount = event.params.poolTokenAmount;
    dealAcceptedEntity.dealTokenAmount = dealTokenAmount.times(underlyingPerDealExchangeRate).div(BigInt.fromI32(10).pow(18));
    dealAcceptedEntity.pool = event.address.toHex();

    dealAcceptedEntity.save();
}

function createVestingDealEntity(event: AcceptDealEvent):void {
    let vestingDealEntity = new VestingDeal(
        event.params.purchaser.toHex() + "-" + event.params.dealAddress.toHex()
      );

    let poolCreatedEntity = getPoolCreated(event.address.toHex());
    let dealDetailEntity = getDealDetails(event.params.dealAddress.toHex());

    if(dealDetailEntity == null || poolCreatedEntity == null) {
        return;
    }

    let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreatedEntity.purchaseTokenDecimals));
    // @ts-ignore 
    let dealTokenAmount = event.params.poolTokenAmount.times(BigInt.fromI32(10).pow(<u8>exp.toI32()));
    let aelinDealContract = AelinDealContract.bind(event.params.dealAddress);
    let underlyingPerDealExchangeRate = aelinDealContract.underlyingPerDealExchangeRate();
    let investorDealTotal = dealTokenAmount.times(underlyingPerDealExchangeRate);
  
    vestingDealEntity.poolName = poolCreatedEntity.name;
    vestingDealEntity.tokenToVest = dealDetailEntity.underlyingDealToken;
    vestingDealEntity.tokenToVestSymbol = dealDetailEntity.underlyingDealTokenSymbol;
    vestingDealEntity.investorDealTotal = investorDealTotal.div(BigInt.fromI32(10).pow(18));  
    vestingDealEntity.amountToVest = dealDetailEntity.underlyingDealTokenTotal;
    vestingDealEntity.totalVested = BigInt.fromI32(0);
    vestingDealEntity.vestingPeriodEnds = aelinDealContract.vestingExpiry();
    vestingDealEntity.investorAddress = event.params.purchaser;
    vestingDealEntity.pool = poolCreatedEntity.id;

    vestingDealEntity.save();
}

function createAcceptDealEntity(event: AcceptDealEvent):void {
    let acceptDealEntity = new AcceptDeal(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
      );
    acceptDealEntity.purchaser = event.params.purchaser;
    acceptDealEntity.poolAddress = event.address;
    acceptDealEntity.dealAddress = event.params.dealAddress;
    acceptDealEntity.poolTokenAmount = event.params.poolTokenAmount;
    acceptDealEntity.aelinFee = event.params.aelinFee;
    acceptDealEntity.sponsorFee = event.params.sponsorFee;
    acceptDealEntity.save();
}

function createWithdrawEntity(event: WithdrawFromPoolEvent):void {
    let withdrawEntity = new Withdraw(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );

    let poolCreatedEntity = getPoolCreated(event.address.toHex());
    if (poolCreatedEntity == null) {
      return;
    }
    
    withdrawEntity.userAddress = event.params.purchaser;
    withdrawEntity.timestamp = event.block.timestamp;
    withdrawEntity.poolName = poolCreatedEntity.name;
    withdrawEntity.amountWithdrawn = event.params.purchaseTokenAmount;
    withdrawEntity.pool = event.address.toHex();

    withdrawEntity.save();
}

function createWithdrawFromPoolEntity(event: WithdrawFromPoolEvent):void {
    let withdrawFromPoolEntity = new WithdrawFromPool(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
      );
    withdrawFromPoolEntity.purchaser = event.params.purchaser;
    withdrawFromPoolEntity.poolAddress = event.address;
    withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount;

    withdrawFromPoolEntity.save();
}

function createDepositEntity(event: PurchasePoolTokenEvent):void {
    let poolCreatedEntity = getPoolCreated(event.address.toHex());
    if(poolCreatedEntity == null) {
        return;
    }

    let depositEntity = new Deposit(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
    
    depositEntity.userAddress = event.params.purchaser;
    depositEntity.timestamp = event.block.timestamp;
    depositEntity.poolName = poolCreatedEntity.name;
    depositEntity.sponsor = poolCreatedEntity.sponsor;
    depositEntity.amountDeposited = event.params.purchaseTokenAmount;
    depositEntity.pool = event.address.toHex();

    depositEntity.save();
}

function createPurchasePoolTokenEntity(event: PurchasePoolTokenEvent):void {
    let purchasePoolTokenEntity = new PurchasePoolToken(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
      );
    purchasePoolTokenEntity.timestamp = event.block.timestamp;
    purchasePoolTokenEntity.purchaser = event.params.purchaser;
    purchasePoolTokenEntity.poolAddress = event.address;
    purchasePoolTokenEntity.purchaseTokenAmount =
    event.params.purchaseTokenAmount;
    
    purchasePoolTokenEntity.save();
}

function createTransferEntity(event: TransferEvent):void {
    let tranferEntity = new Transfer(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );

    tranferEntity.from = event.params.from;
    tranferEntity.to = event.params.to;
    tranferEntity.value = event.params.value;
    tranferEntity.save();
}
  
function createSetSponsorEntity(event: SetSponsorEvent):void {
    let setSponsorEntity = new SetSponsor(
        event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
    setSponsorEntity.sponsor = event.params.sponsor;
    setSponsorEntity.save();
}

function createAelinTokenEntity(event: AelinTokenEvent):void {
    let aelinPoolTokenEntity = new AelinToken(event.address.toHex());
    aelinPoolTokenEntity.decimals = event.params.decimals;
    aelinPoolTokenEntity.name = event.params.name;
    aelinPoolTokenEntity.symbol = event.params.symbol;

    aelinPoolTokenEntity.save();
}

function createDealCreatedEntity(event: CreateDealEvent):void {
    let dealCreatedEntity = new DealCreated(event.params.dealContract.toHex());
    dealCreatedEntity.name = event.params.name;
    dealCreatedEntity.symbol = event.params.symbol;
    dealCreatedEntity.sponsor = event.params.sponsor;
    dealCreatedEntity.poolAddress = event.address;

    dealCreatedEntity.save();
}

function createDealSponsoredEntity(event: CreateDealEvent):void {
    let poolCreatedEntity = getPoolCreated(event.address.toHex())
    if(poolCreatedEntity == null) {
        return;
    }
    
    let dealSponsoredEntity = new DealSponsored(event.address.toHex() + "-" + event.params.sponsor.toHex());
    dealSponsoredEntity.sponsor = event.params.sponsor;
    dealSponsoredEntity.timestamp = event.block.timestamp;
    dealSponsoredEntity.poolName = poolCreatedEntity.name;
    dealSponsoredEntity.amountEarned = BigInt.fromI32(0);
    dealSponsoredEntity.totalAccepted = BigInt.fromI32(0);
    dealSponsoredEntity.totalInvested = BigInt.fromI32(0);
    dealSponsoredEntity.sponsorFee = poolCreatedEntity.sponsorFee;
    dealSponsoredEntity.pool = event.address.toHex();
  
    dealSponsoredEntity.save();
}

function createDealDetailEntity(event: DealDetailEvent):void {
    let dealDetailEntity = new DealDetail(event.params.dealContract.toHex());
    dealDetailEntity.underlyingDealToken = event.params.underlyingDealToken;
    dealDetailEntity.purchaseTokenTotalForDeal =
      event.params.purchaseTokenTotalForDeal;
    dealDetailEntity.underlyingDealTokenTotal =
      event.params.underlyingDealTokenTotal;
    dealDetailEntity.vestingPeriod = event.params.vestingPeriod;
    dealDetailEntity.vestingCliff = event.params.vestingCliff;
    dealDetailEntity.proRataRedemptionPeriod =
      event.params.proRataRedemptionPeriod;
    dealDetailEntity.openRedemptionPeriod = event.params.openRedemptionPeriod;
    dealDetailEntity.holder = event.params.holder;
    dealDetailEntity.holderFundingDuration = event.params.holderFundingDuration;
    dealDetailEntity.holderFundingExpiration = event.params.holderFundingDuration.plus(
      event.block.timestamp
    );
    dealDetailEntity.isDealFunded = false;
    dealDetailEntity.totalAmountAccepted = BigInt.fromI32(0);
    dealDetailEntity.totalWithdrawn = BigInt.fromI32(0);
    dealDetailEntity.totalAmountFunded = BigInt.fromI32(0);
  
    //get underlyingDealToken symbol and decimals
    const underlyingDealToken = ERC20.bind(event.params.underlyingDealToken);
    dealDetailEntity.underlyingDealTokenSymbol = underlyingDealToken.symbol();
    dealDetailEntity.underlyingDealTokenDecimals = underlyingDealToken.decimals();
    dealDetailEntity.underlyingDealTokenTotalSupply = underlyingDealToken.totalSupply();
    dealDetailEntity.save();
}
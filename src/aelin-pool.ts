import {
  DealCreated,
  PurchasePoolToken,
  WithdrawFromPool,
  AcceptDeal,
  SetSponsor,
  DealDetail,
  Transfer,
  PoolCreated,
  AelinToken,
  VestingDeal,
	TotalDealsBySponsor,
  Deposit,
} from "./types/schema";
import { PoolStatus } from "./enum";
import {
  Transfer as TransferEvent,
  SetSponsor as SetSponsorEvent,
  CreateDeal as CreateDealEvent,
  DealDetail as DealDetailEvent,
  PurchasePoolToken as PurchasePoolTokenEvent,
  WithdrawFromPool as WithdrawFromPoolEvent,
  AcceptDeal as AcceptDealEvent,
  AelinToken as AelinTokenEvent,
} from "./types/templates/AelinPool/AelinPool";
import { ERC20 } from "./types/templates/AelinPool/ERC20";
import { BigInt, log } from "@graphprotocol/graph-ts";
import { getDealCreated, getDealDetails, getPoolCreated, ZERO_ADDRESS, DEAL_WRAPPER_DECIMALS } from "./helpers";
import { AelinDeal } from "./types/templates";
import { AelinDeal as AelinDealContract } from "./types/templates/AelinDeal/AelinDeal";

export function handleAelinPoolToken(event: AelinTokenEvent): void {
  let aelinPoolTokenEntity = new AelinToken(event.address.toHex());
  aelinPoolTokenEntity.decimals = event.params.decimals;
  aelinPoolTokenEntity.name = event.params.name;
  aelinPoolTokenEntity.symbol = event.params.symbol;
  let poolCreatedEntity = PoolCreated.load(event.address.toHex());
  if (poolCreatedEntity != null) {
    poolCreatedEntity.purchaseTokenDecimals = event.params.decimals;
    poolCreatedEntity.save();
  }
  aelinPoolTokenEntity.save();
}

export function handleSetSponsor(event: SetSponsorEvent): void {
  let setSponsorEntity = new SetSponsor(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  setSponsorEntity.sponsor = event.params.sponsor;
  setSponsorEntity.save();
}

export function handlePoolTransfer(event: TransferEvent): void {
  let tranferEntity = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  tranferEntity.from = event.params.from;
  tranferEntity.to = event.params.to;
  tranferEntity.value = event.params.value;
  tranferEntity.save();
  let poolCreatedEntity = PoolCreated.load(event.address.toHex());
  if (poolCreatedEntity == null) {
    log.error("trying to find pool not saved with address: {}", [
      event.address.toHex(),
    ]);
    return;
  }
  if (event.params.from.toHex() == ZERO_ADDRESS.toHex()) {
    poolCreatedEntity.totalSupply = poolCreatedEntity.totalSupply.plus(
      event.params.value
    );
  }
  if (event.params.to.toHex() == ZERO_ADDRESS.toHex()) {
    poolCreatedEntity.totalSupply = poolCreatedEntity.totalSupply.minus(
      event.params.value
    );
  }
  poolCreatedEntity.save();
}

export function handleCreateDeal(event: CreateDealEvent): void {
  let dealCreatedEntity = new DealCreated(event.params.dealContract.toHex());
  dealCreatedEntity.name = event.params.name;
  dealCreatedEntity.symbol = event.params.symbol;
  dealCreatedEntity.sponsor = event.params.sponsor;
  dealCreatedEntity.poolAddress = event.address;
  let poolCreatedEntity = PoolCreated.load(event.address.toHex());
  if (poolCreatedEntity == null) {
    log.error("trying to find pool not saved with address: {}", [
      event.address.toHex(),
    ]);
    return;
  }
  poolCreatedEntity.poolStatus = PoolStatus.FundingDeal;
  poolCreatedEntity.dealAddress = event.params.dealContract;

  let totalDealsBySponsorEntity = TotalDealsBySponsor.load(event.params.sponsor.toHexString());
  if (totalDealsBySponsorEntity == null) {
    totalDealsBySponsorEntity = new TotalDealsBySponsor(event.params.sponsor.toHexString());
    totalDealsBySponsorEntity.count = 0;
  }
  totalDealsBySponsorEntity.count++;

	totalDealsBySponsorEntity.save();
  poolCreatedEntity.save();
  dealCreatedEntity.save();
}

export function handleDealDetail(event: DealDetailEvent): void {
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

  //get underlyingDealToken symbol and decimals
  const underlyingDealToken = ERC20.bind(event.params.underlyingDealToken);
  dealDetailEntity.underlyingDealTokenSymbol = underlyingDealToken.symbol();
  dealDetailEntity.underlyingDealTokenDecimals = underlyingDealToken.decimals();
  dealDetailEntity.underlyingDealTokenTotalSupply = underlyingDealToken.totalSupply();

  let dealCreatedEntity = getDealCreated(event.params.dealContract.toHex());
  if(dealCreatedEntity != null) {
    let poolCreatedEntity = getPoolCreated(dealCreatedEntity.poolAddress.toHex());
    if (poolCreatedEntity != null) {
      poolCreatedEntity.deal = event.params.dealContract.toHex();
      poolCreatedEntity.save();
    }      
  }

  dealDetailEntity.save();

  // use templates to create a new deal to track events
  AelinDeal.create(event.params.dealContract);
}

// @TODO add block or timestamp to these events????
// @TODO look into what needs to be indexed
export function handlePurchasePoolToken(event: PurchasePoolTokenEvent): void {
  let purchasePoolTokenEntity = new PurchasePoolToken(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  purchasePoolTokenEntity.timestamp = event.block.timestamp;
  purchasePoolTokenEntity.purchaser = event.params.purchaser;
  purchasePoolTokenEntity.poolAddress = event.address;
  purchasePoolTokenEntity.purchaseTokenAmount =
    event.params.purchaseTokenAmount;
  let poolCreatedEntity = PoolCreated.load(event.address.toHex());
  if (poolCreatedEntity == null) {
    log.error("trying to find pool not saved with address: {}", [
      event.address.toHex(),
    ]);
    return;
  }
  poolCreatedEntity.contributions = poolCreatedEntity.contributions.plus(
    event.params.purchaseTokenAmount
  );

  let depositEntity = new Deposit(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "d"
  )

  depositEntity.userAddress = event.params.purchaser;
  depositEntity.timestamp = event.block.timestamp;
  depositEntity.poolName = poolCreatedEntity.name;
  depositEntity.sponsor = poolCreatedEntity.sponsor;
  depositEntity.amountDeposited = event.params.purchaseTokenAmount;
  depositEntity.pool = event.address.toHex();

  poolCreatedEntity.save();
  purchasePoolTokenEntity.save();
  depositEntity.save();
}

export function handleWithdrawFromPool(event: WithdrawFromPoolEvent): void {
  let withdrawFromPoolEntity = new WithdrawFromPool(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  withdrawFromPoolEntity.purchaser = event.params.purchaser;
  withdrawFromPoolEntity.poolAddress = event.address;
  withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount;

  let poolCreatedEntity = getPoolCreated(event.address.toHex());
  if(poolCreatedEntity != null) {
      let dealAddress = poolCreatedEntity.dealAddress
      if(dealAddress) {
        let dealDetailEntity = getDealDetails(dealAddress.toHex());
        if(dealDetailEntity != null) {
          dealDetailEntity.totalWithdrawn = (dealDetailEntity.totalWithdrawn as BigInt).plus(event.params.purchaseTokenAmount);
          dealDetailEntity.save();
        }
      }
  }

  withdrawFromPoolEntity.save();
}

export function handleAcceptDeal(event: AcceptDealEvent): void {
  let acceptDealEntity = new AcceptDeal(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  acceptDealEntity.purchaser = event.params.purchaser;
  acceptDealEntity.poolAddress = event.address;
  acceptDealEntity.dealAddress = event.params.dealAddress;
  acceptDealEntity.poolTokenAmount = event.params.poolTokenAmount;
  acceptDealEntity.aelinFee = event.params.aelinFee;
  acceptDealEntity.sponsorFee = event.params.sponsorFee;

  let dealDetailEntity = getDealDetails(event.params.dealAddress.toHex());
  if(dealDetailEntity != null) {
      dealDetailEntity.totalAmountAccepted = (dealDetailEntity.totalAmountAccepted as BigInt).plus(event.params.poolTokenAmount);
      dealDetailEntity.save(); 
  }
  
  let vestingDeal = VestingDeal.load(
    event.params.purchaser.toHex() + "-" + event.params.dealAddress.toHex()
  );
  if (vestingDeal === null) {
    let poolCreated = PoolCreated.load(event.address.toHex());
    if (poolCreated === null) {
      log.error("trying to find a pool not saved with address: {}", [
        event.address.toHex(),
      ]);
      return;
    }
    let dealDetail = DealDetail.load(event.params.dealAddress.toHex());
    if (dealDetail === null) {
      log.error("trying to find a deal not saved with address: {}", [
        event.params.dealAddress.toHex(),
      ]);
      return;
    }

    let exp = DEAL_WRAPPER_DECIMALS.minus(BigInt.fromI32(poolCreated.purchaseTokenDecimals))
    // @ts-ignore 
    let dealTokenAmount = event.params.poolTokenAmount.times(BigInt.fromI32(10).pow(<u8>exp.toI32()));
    let aelinDeal = AelinDealContract.bind(event.params.dealAddress);
    let underlyingPerDealExchangeRate = aelinDeal.underlyingPerDealExchangeRate();
    let vestingExpiry = aelinDeal.vestingExpiry();
    let investorDealTotal = dealTokenAmount.times(underlyingPerDealExchangeRate);
    dealDetail.underlyingDealTokenDecimals

    vestingDeal = new VestingDeal(
      event.params.purchaser.toHex() + "-" + event.params.dealAddress.toHex()
    );
    vestingDeal.poolName = poolCreated.name;
    vestingDeal.tokenToVest = dealDetail.underlyingDealToken;
    vestingDeal.tokenToVestSymbol = dealDetail.underlyingDealTokenSymbol;
    vestingDeal.investorDealTotal = investorDealTotal.div(BigInt.fromI32(10).pow(18));  
    vestingDeal.amountToVest = dealDetail.underlyingDealTokenTotal;
    vestingDeal.totalVested = BigInt.fromI32(0);
    vestingDeal.vestingPeriodEnds = vestingExpiry; // timestamp of when the vesting period ends after all the other periods
    vestingDeal.investorAddress = event.params.purchaser;
  }

  vestingDeal.save();
  acceptDealEntity.save();
}

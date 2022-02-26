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
import { AelinDeal } from "./types/templates";
import { log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./helpers";

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

  //get underlyingDealToken symbol and decimals
  const underlyingDealToken = ERC20.bind(event.params.underlyingDealToken);
  dealDetailEntity.underlyingDealTokenSymbol = underlyingDealToken.symbol();
  dealDetailEntity.underlyingDealTokenDecimals = underlyingDealToken.decimals();

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
  poolCreatedEntity.save();

  purchasePoolTokenEntity.save();
}

export function handleWithdrawFromPool(event: WithdrawFromPoolEvent): void {
  let withdrawFromPoolEntity = new WithdrawFromPool(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  withdrawFromPoolEntity.purchaser = event.params.purchaser;
  withdrawFromPoolEntity.poolAddress = event.address;
  withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount;

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

  acceptDealEntity.save();
}

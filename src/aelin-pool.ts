import {
  DealCreated,
  PurchasePoolToken,
  WithdrawFromPool,
  AcceptDeal,
  SetSponsor,
  DealDetails,
  Transfer,
} from "./types/schema";
import {
  Transfer as TransferEvent,
  SetSponsor as SetSponsorEvent,
  CreateDeal as CreateDealEvent,
  DealDetails as DealDetailsEvent,
  PurchasePoolToken as PurchasePoolTokenEvent,
  WithdrawFromPool as WithdrawFromPoolEvent,
  AcceptDeal as AcceptDealEvent,
} from "./types/templates/AelinPool/AelinPool";
import { AelinDeal } from "./types/templates";

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
}

export function handleCreateDeal(event: CreateDealEvent): void {
  let dealCreatedEntity = new DealCreated(event.params.dealContract.toHex());
  dealCreatedEntity.name = event.params.name;
  dealCreatedEntity.symbol = event.params.symbol;
  dealCreatedEntity.sponsor = event.params.sponsor;
  dealCreatedEntity.poolAddress = event.address;
  dealCreatedEntity.save();
}

export function handleDealDetails(event: DealDetailsEvent): void {
  let dealDetailsEntity = new DealDetails(event.params.dealContract.toHex());
  dealDetailsEntity.underlyingDealToken = event.params.underlyingDealToken;
  dealDetailsEntity.purchaseTokenTotalForDeal =
    event.params.purchaseTokenTotalForDeal;
  dealDetailsEntity.underlyingDealTokenTotal =
    event.params.underlyingDealTokenTotal;
  dealDetailsEntity.vestingPeriod = event.params.vestingPeriod;
  dealDetailsEntity.vestingCliff = event.params.vestingCliff;
  dealDetailsEntity.proRataRedemptionPeriod =
    event.params.proRataRedemptionPeriod;
  dealDetailsEntity.openRedemptionPeriod = event.params.openRedemptionPeriod;
  dealDetailsEntity.holder = event.params.holder;
  dealDetailsEntity.holderFundingDuration = event.params.holderFundingDuration;
  dealDetailsEntity.holderFundingExpiration =
    event.params.holderFundingDuration.plus(event.block.timestamp);

  dealDetailsEntity.save();

  // use templates to create a new deal to track events
  AelinDeal.create(event.params.dealContract);
}

// @TODO add block or timestamp to these events????
// @TODO look into what needs to be indexed
export function handlePurchasePoolToken(event: PurchasePoolTokenEvent): void {
  let purchasePoolTokenEntity = new PurchasePoolToken(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  purchasePoolTokenEntity.purchaser = event.params.purchaser;
  purchasePoolTokenEntity.poolAddress = event.address;
  purchasePoolTokenEntity.purchaseTokenAmount =
    event.params.purchaseTokenAmount;
  purchasePoolTokenEntity.poolTokenAmount = event.params.poolTokenAmount;

  purchasePoolTokenEntity.save();
}

export function handleWithdrawFromPool(event: WithdrawFromPoolEvent): void {
  let withdrawFromPoolEntity = new WithdrawFromPool(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  withdrawFromPoolEntity.purchaser = event.params.purchaser;
  withdrawFromPoolEntity.poolAddress = event.address;
  withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount;
  withdrawFromPoolEntity.poolTokenAmount = event.params.poolTokenAmount;

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
  acceptDealEntity.underlyingToHolderAmt = event.params.underlyingToHolderAmt;
  acceptDealEntity.aelinFee = event.params.aelinFee;
  acceptDealEntity.sponsorFee = event.params.sponsorFee;

  acceptDealEntity.save();
}

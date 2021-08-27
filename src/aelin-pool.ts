import {
  DealCreated,
  PurchasePoolToken,
  WithdrawFromPool,
  AcceptDeal,
} from "./types/schema";
import { CreateDeal as CreateDealEvent } from "./types/CreateDeal/CreateDeal";
import { PurchasePoolToken as PurchasePoolTokenEvent } from "./types/PurchasePoolToken/PurchasePoolToken";
import { WithdrawFromPool as WithdrawFromPoolEvent } from "./types/WithdrawFromPool/WithdrawFromPool";
import { AcceptDeal as AcceptDealEvent } from "./types/AcceptDeal/AcceptDeal";
import { AelinDeal } from "./types/templates";

export function handleCreateDeal(event: CreateDealEvent): void {
  let dealCreatedEntity = new DealCreated(event.params.dealContract.toHex());
  dealCreatedEntity.name = event.params.name;
  dealCreatedEntity.symbol = event.params.symbol;
  dealCreatedEntity.underlyingDealToken = event.params.underlyingDealToken;
  dealCreatedEntity.dealPurchaseTokenTotal =
    event.params.dealPurchaseTokenTotal;
  dealCreatedEntity.underlyingDealTokenTotal =
    event.params.underlyingDealTokenTotal;
  dealCreatedEntity.vestingPeriod = event.params.vestingPeriod;
  dealCreatedEntity.vestingCliff = event.params.vestingCliff;
  dealCreatedEntity.redemptionPeriod = event.params.redemptionPeriod;
  dealCreatedEntity.holder = event.params.holder;
  dealCreatedEntity.poolTokenMaxPurchaseAmount =
    event.params.poolTokenMaxPurchaseAmount;

  dealCreatedEntity.save();

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
  purchasePoolTokenEntity.poolAddress = event.params.poolAddress;
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
  withdrawFromPoolEntity.poolAddress = event.params.poolAddress;
  withdrawFromPoolEntity.purchaseTokenAmount = event.params.purchaseTokenAmount;
  withdrawFromPoolEntity.poolTokenAmount = event.params.poolTokenAmount;

  withdrawFromPoolEntity.save();
}

export function handleAcceptDeal(event: AcceptDealEvent) {
  let acceptDealEntity = new AcceptDeal(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  acceptDealEntity.purchaser = event.params.purchaser;
  acceptDealEntity.poolAddress = event.params.poolAddress;
  acceptDealEntity.dealAddress = event.params.dealAddress;
  acceptDealEntity.poolTokenAmount = event.params.poolTokenAmount;

  acceptDealEntity.save();
}

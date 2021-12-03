import {
  DealFullyFunded,
  DepositDealTokens,
  WithdrawUnderlyingDealTokens,
  ClaimedUnderlyingDealTokens,
  SetHolder,
  Transfer,
  PoolCreated,
  DealDetails,
} from "./types/schema";
import { PoolStatus } from "./enum";
import {
  Transfer as TransferEvent,
  SetHolder as SetHolderEvent,
  DealFullyFunded as DealFullyFundedEvent,
  DepositDealTokens as DepositDealTokensEvent,
  WithdrawUnderlyingDealTokens as WithdrawUnderlyingDealTokensEvent,
  ClaimedUnderlyingDealTokens as ClaimedUnderlyingDealTokensEvent,
} from "./types/templates/AelinDeal/AelinDeal";
import { log } from "@graphprotocol/graph-ts";

export function handleSetHolder(event: SetHolderEvent): void {
  let setHolderEntity = new SetHolder(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  setHolderEntity.holder = event.params.holder;
  setHolderEntity.save();
}

export function handleDealTransfer(event: TransferEvent): void {
  let tranferEntity = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  tranferEntity.from = event.params.from;
  tranferEntity.to = event.params.to;
  tranferEntity.value = event.params.value;
  tranferEntity.save();
}

export function handleClaimedUnderlyingDealTokens(
  event: ClaimedUnderlyingDealTokensEvent
): void {
  let claimedEntity = new ClaimedUnderlyingDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  claimedEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  claimedEntity.recipient = event.params.recipient;
  claimedEntity.underlyingDealTokensClaimed =
    event.params.underlyingDealTokensClaimed;

  claimedEntity.save();
}

export function handleWithdrawUnderlyingDealTokens(
  event: WithdrawUnderlyingDealTokensEvent
): void {
  let withdrawEntity = new WithdrawUnderlyingDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  withdrawEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  withdrawEntity.depositor = event.params.depositor;
  withdrawEntity.dealContract = event.address;
  withdrawEntity.underlyingDealTokenAmount =
    event.params.underlyingDealTokenAmount;

  withdrawEntity.save();
}

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
  let dealFullyFundedEntity = new DealFullyFunded(event.address.toHex());
  dealFullyFundedEntity.poolAddress = event.params.poolAddress;
  dealFullyFundedEntity.proRataRedemptionExpiry =
    event.params.proRataRedemptionExpiry;
  dealFullyFundedEntity.proRataRedemptionStart =
    event.params.proRataRedemptionStart;
  dealFullyFundedEntity.openRedemptionExpiry =
    event.params.openRedemptionExpiry;
  dealFullyFundedEntity.openRedemptionStart = event.params.openRedemptionStart;
  let poolCreatedEntity = PoolCreated.load(event.params.poolAddress.toHex());
  if (poolCreatedEntity == null) {
    log.error("trying to find pool not saved with address: {}", [
      event.params.poolAddress.toHex(),
    ]);
    return;
  }
  poolCreatedEntity.poolStatus = PoolStatus.DealOpen;
  poolCreatedEntity.save();

  let dealDetailsEntity = DealDetails.load(event.address.toHex());
  if (dealDetailsEntity == null) {
    log.error("trying to find deal not saved with address: {}", [
      event.address.toHex(),
    ]);
    return;
  }
  dealDetailsEntity.proRataRedemptionPeriodStart = event.block.timestamp;
  dealDetailsEntity.isDealFunded = true;
  dealDetailsEntity.save();

  dealFullyFundedEntity.save();
}

export function handleDepositDealTokens(event: DepositDealTokensEvent): void {
  let depositDealTokensEntity = new DepositDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  depositDealTokensEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  depositDealTokensEntity.depositor = event.params.depositor;
  depositDealTokensEntity.dealContract = event.address;
  depositDealTokensEntity.underlyingDealTokenAmount =
    event.params.underlyingDealTokenAmount;

  depositDealTokensEntity.save();
}

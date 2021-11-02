import {
  DealFullyFunded,
  DepositDealTokens,
  WithdrawUnderlyingDealTokens,
  ClaimedUnderlyingDealTokens,
  MintDealTokens,
  SetHolder,
  Transfer,
} from "./types/schema";
import { Transfer as TransferEvent, SetHolder as SetHolderEvent , DealFullyFunded as DealFullyFundedEvent, DepositDealTokens as DepositDealTokensEvent, WithdrawUnderlyingDealTokens as WithdrawUnderlyingDealTokensEvent, ClaimedUnderlyingDealTokens as ClaimedUnderlyingDealTokensEvent, MintDealTokens as MintDealTokensEvent } from "./types/templates/AelinDeal/AelinDeal";

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
  withdrawEntity.dealContract = event.params.dealContract;
  withdrawEntity.underlyingDealTokenAmount =
    event.params.underlyingDealTokenAmount;

  withdrawEntity.save();
}

export function handleDealFullyFunded(event: DealFullyFundedEvent): void {
  let dealFullyFundedEntity = new DealFullyFunded(
    event.params.dealAddress.toHex()
  );
  dealFullyFundedEntity.poolAddress = event.params.poolAddress;
  dealFullyFundedEntity.proRataRedemptionExpiry = event.params.proRataRedemptionExpiry;
  dealFullyFundedEntity.proRataRedemptionStart = event.params.proRataRedemptionStart;
  dealFullyFundedEntity.openRedemptionExpiry = event.params.openRedemptionExpiry;
  dealFullyFundedEntity.openRedemptionStart = event.params.openRedemptionStart;
  dealFullyFundedEntity.save();
}

export function handleDepositDealTokens(event: DepositDealTokensEvent): void {
  let depositDealTokensEntity = new DepositDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  depositDealTokensEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  depositDealTokensEntity.depositor = event.params.depositor;
  depositDealTokensEntity.dealContract = event.params.dealContract;
  depositDealTokensEntity.underlyingDealTokenAmount =
    event.params.underlyingDealTokenAmount;

  depositDealTokensEntity.save();
}

export function handleMintDealTokens(event: MintDealTokensEvent): void {
  let mintDealTokensEntity = new MintDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  mintDealTokensEntity.dealContract = event.params.dealContract;
  mintDealTokensEntity.recipient = event.params.recipient;
  mintDealTokensEntity.dealTokenAmount = event.params.dealTokenAmount;

  mintDealTokensEntity.save();
}

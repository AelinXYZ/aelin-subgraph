import {
  DealFullyFunded,
  DepositDealTokens,
  WithdrawUnderlyingDealTokens,
  ClaimedUnderlyingDealTokens,
  MintDealTokens,
} from "./types/schema";
import { DealFullyFunded as DealFullyFundedEvent } from "./types/DealFullyFunded/DealFullyFunded";
import { DepositDealTokens as DepositDealTokensEvent } from "./types/DepositDealTokens/DepositDealTokens";
import { WithdrawUnderlyingDealTokens as WithdrawUnderlyingDealTokensEvent } from "./types/WithdrawUnderlyingDealTokens/WithdrawUnderlyingDealTokens";
import { ClaimedUnderlyingDealTokens as ClaimedUnderlyingDealTokensEvent } from "./types/ClaimedUnderlyingDealTokens/ClaimedUnderlyingDealTokens";
import { MintDealTokens as MintDealTokensEvent } from "./types/MintDealTokens/MintDealTokens";

export function handleClaimedUnderlyingDealTokens(
  event: ClaimedUnderlyingDealTokensEvent
): void {
  let claimedEntity = new ClaimedUnderlyingDealTokens(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  claimedEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  claimedEntity.fromAddress = event.params.from;
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
  dealFullyFundedEntity.redemptionStart = event.params.redemptionStart;
  dealFullyFundedEntity.redemptionExpiry = event.params.redemptionExpiry;

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

import {
  DealFullyFunded,
  DepositDealToken,
  WithdrawUnderlyingDealToken,
  ClaimedUnderlyingDealToken,
  SetHolder,
  Transfer,
  PoolCreated,
  DealDetail,
  VestingDeal,
} from "./types/schema";
import { PoolStatus } from "./enum";
import {
  Transfer as TransferEvent,
  SetHolder as SetHolderEvent,
  DealFullyFunded as DealFullyFundedEvent,
  DepositDealToken as DepositDealTokenEvent,
  WithdrawUnderlyingDealToken as WithdrawUnderlyingDealTokenEvent,
  ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
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

export function handleClaimedUnderlyingDealToken(
  event: ClaimedUnderlyingDealTokenEvent
): void {
  let claimedEntity = new ClaimedUnderlyingDealToken(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  claimedEntity.dealAddress = event.address;
  claimedEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  claimedEntity.recipient = event.params.recipient;
  claimedEntity.underlyingDealTokensClaimed =
    event.params.underlyingDealTokensClaimed;

  let vestingDeal = VestingDeal.load(event.params.recipient.toHex() + "-" + event.address.toHex());
  if(vestingDeal === null) {
    log.error("trying to find a vestingDeal not saved with address: {}", [
      event.params.recipient.toHex() + "-" + event.address.toHex(),
    ]);
    return;
  }

  vestingDeal.amountToVest = vestingDeal.amountToVest.minus(event.params.underlyingDealTokensClaimed);
  vestingDeal.totalVested = vestingDeal.totalVested.plus(event.params.underlyingDealTokensClaimed);

  vestingDeal.save();
  claimedEntity.save();
}

export function handleWithdrawUnderlyingDealToken(
  event: WithdrawUnderlyingDealTokenEvent
): void {
  let withdrawEntity = new WithdrawUnderlyingDealToken(
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

  let dealDetailEntity = DealDetail.load(event.address.toHex());
  if (dealDetailEntity == null) {
    log.error("trying to find deal not saved with address: {}", [
      event.address.toHex(),
    ]);
    return;
  }
  dealDetailEntity.proRataRedemptionPeriodStart = event.block.timestamp;
  dealDetailEntity.isDealFunded = true;
  dealDetailEntity.save();

  dealFullyFundedEntity.save();
}

export function handleDepositDealToken(event: DepositDealTokenEvent): void {
  let depositDealTokenEntity = new DepositDealToken(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  depositDealTokenEntity.underlyingDealTokenAddress =
    event.params.underlyingDealTokenAddress;
  depositDealTokenEntity.depositor = event.params.depositor;
  depositDealTokenEntity.dealContract = event.address;
  depositDealTokenEntity.underlyingDealTokenAmount =
    event.params.underlyingDealTokenAmount;

  depositDealTokenEntity.save();
}

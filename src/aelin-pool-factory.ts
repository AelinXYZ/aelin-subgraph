import { PoolCreated, TotalPoolsCreated } from "./types/schema";
import { CreatePool as CreatePoolEvent } from "./types/AelinPoolFactory/AelinPoolFactory";
import { AelinPool } from "./types/templates";
import { ONE } from "./helpers";

export function handleCreatePool(event: CreatePoolEvent): void {
  let totalPoolsCreatedEntity = TotalPoolsCreated.load("1");
  if (totalPoolsCreatedEntity == null) {
    totalPoolsCreatedEntity = new TotalPoolsCreated("1");
    totalPoolsCreatedEntity.count = ONE;
  } else {
    totalPoolsCreatedEntity.count = totalPoolsCreatedEntity.count.plus(ONE);
  }
  totalPoolsCreatedEntity.save();

  let poolCreatedEntity = new PoolCreated(event.params.poolAddress.toHex());
  poolCreatedEntity.name = event.params.name;
  poolCreatedEntity.symbol = event.params.symbol;
  poolCreatedEntity.purchaseTokenCap = event.params.purchaseTokenCap;
  poolCreatedEntity.purchaseToken = event.params.purchaseToken;
  poolCreatedEntity.duration = event.params.duration;
  poolCreatedEntity.sponsorFee = event.params.sponsorFee;
  poolCreatedEntity.sponsor = event.params.sponsor;
  poolCreatedEntity.purchaseDuration = event.params.purchaseDuration;
  poolCreatedEntity.purchaseExpiry = event.params.purchaseDuration.plus(
    event.block.timestamp
  );
  poolCreatedEntity.timestamp = event.block.timestamp;

  poolCreatedEntity.save();

  // use templates to create a new pool to track events
  AelinPool.create(event.params.poolAddress);
}

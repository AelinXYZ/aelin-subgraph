import { PoolCreated } from "./types/schema";
import { CreatePool as CreatePoolEvent } from "./types/CreatePool/CreatePool";
import { AelinPool } from "./types/templates";

export function handleCreatePool(event: CreatePoolEvent): void {
  let poolCreatedEntity = new PoolCreated(event.params.poolAddress.toHex());
  poolCreatedEntity.name = event.params.name;
  poolCreatedEntity.symbol = event.params.symbol;
  poolCreatedEntity.purchaseTokenCap = event.params.purchaseTokenCap;
  poolCreatedEntity.purchaseToken = event.params.purchaseToken;
  poolCreatedEntity.duration = event.params.duration;
  poolCreatedEntity.sponsorFee = event.params.sponsorFee;
  poolCreatedEntity.sponsor = event.params.sponsor;
  poolCreatedEntity.purchaseExpiry = event.params.purchaseExpiry;

  poolCreatedEntity.save();

  // use templates to create a new pool to track events
  AelinPool.create(event.params.poolAddress);
}

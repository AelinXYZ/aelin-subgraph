import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { DealCreated, DealDetail, PoolCreated } from "./types/schema";

export let ONE = BigInt.fromI32(1);

export let ZERO_ADDRESS = Address.fromHexString("0x0000000000000000000000000000000000000000");

export let DEAL_WRAPPER_DECIMALS = 18;

export function getDealCreated(address:string): DealCreated | null {
  let dealCreatedEntity = DealCreated.load(address)
  if (dealCreatedEntity == null) {
    log.error("trying to find deal not saved with address: {}", [
      address,
    ]);
    return null;
  }

  return dealCreatedEntity
}

export function getDealDetails(address:string): DealDetail | null {
    let dealDetailsEntity = DealDetail.load(address)
    if (dealDetailsEntity == null) {
      log.error("trying to find deal not saved with address: {}", [
        address,
      ]);
      return null;
    }
  
    return dealDetailsEntity
  }

export function getPoolCreated(address:string): PoolCreated | null {
    let poolCreatedEntity = PoolCreated.load(address)
    if (poolCreatedEntity == null) {
      log.error("trying to find pool not saved with address: {}", [
        address,
      ]);
      return null;
    }
  
    return poolCreatedEntity
  }

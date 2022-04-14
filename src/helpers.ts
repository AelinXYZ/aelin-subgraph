import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { DealCreated, DealDetail, PoolCreated, UserAllocationStat, VestingDeal, DealFunded, DealSponsored } from "./types/schema";

export let ONE = BigInt.fromI32(1);

export let ZERO_ADDRESS = Address.fromHexString("0x0000000000000000000000000000000000000000");

export let DEAL_WRAPPER_DECIMALS = BigInt.fromI32(18);

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

export function getVestingDeal(address:string): VestingDeal | null {
  let vestingDealEntity = VestingDeal.load(address);
  if(vestingDealEntity == null) {
    log.error("trying to find a vestingDeal not saved with address: {}", [
      address,
    ]);
    return null;
  }

  return vestingDealEntity
}

export function getUserAllocationStat(address:string): UserAllocationStat | null {
  let userAllocationStatEntity = UserAllocationStat.load(address);
  if(userAllocationStatEntity == null) {
    log.error("trying to find a userAllocationStat not saved with address: {}", [
      address
    ]);
    return null;
  }

  return userAllocationStatEntity
}



export function getDealFunded(address:string): DealFunded | null {
  let dealFundedEntity = DealFunded.load(address);
  if(dealFundedEntity == null) {
    log.error("trying to find a dealFunded not saved with address: {}", [
      address,
    ]);
    return null;
  }

  return dealFundedEntity
}
      
export function getDealSponsored(address:string): DealSponsored | null {
  let dealSponsoredEntity = DealSponsored.load(address);
  if(dealSponsoredEntity == null) {
    log.error("trying to find a ealSponsored not saved with address: {}", [
      address,
    ]);
    return null;
  }

  return dealSponsoredEntity
}

import { log } from "@graphprotocol/graph-ts";
import { NotificationType } from "./enum";
import { DealCreated, DealDetail, Notification } from "./types/schema";
import {
    DealDetail as DealDetailEvent,
  } from "./types/templates/AelinPool/AelinPool";

  import {
    ClaimedUnderlyingDealToken as ClaimedUnderlyingDealTokenEvent,
  } from "./types/templates/AelinDeal/AelinDeal";

  import { store } from '@graphprotocol/graph-ts'

/**
 * 
 * >> TBD <<
 * The "keyof" operand seems to break graph compilation (it's not supported?)
 * I'll leave this function commented since it would be pretty useful (if we solve the keyof problem) 
 * 
 *
interface EventNotificationMapping {
  DealTokensVested: ClaimedUnderlyingDealTokenEvent
  VestingCliffBegun: DealDetailEvent
  DealTokensVestingBegun: DealDetailEvent
}

export function createNotification<K extends keyof EventNotificationMapping>(notificationType:K, event: EventNotificationMapping[K]): void {
    switch(notificationType) {
        case NotificationType.DealTokensVested:
            return createDealTokensVestedNotification(event as ClaimedUnderlyingDealTokenEvent)
        case NotificationType.DealTokensVestingBegun:
            return createDealTokensVestingBegunNotification(event as DealDetailEvent)
        case NotificationType.VestingCliffBegun:
            return createVestingCliffBegunNotification(event as DealDetailEvent)
        default: 
        log.error("NotificationType invalid on createNotification" , []);
    }
}
*/

export function createDealTokensVestedNotification(event: ClaimedUnderlyingDealTokenEvent):void {}

export function createVestingCliffBegunNotification(event: DealDetailEvent):void {
    let dealDetailEntity = getDealDetailEntity(event.params.dealContract.toHex())
    let dealCreatedEntity = getDealCreatedEntity(event.params.dealContract.toHex())
    if(dealCreatedEntity && dealDetailEntity) { 
    let notificationEntity = new Notification(dealCreatedEntity.poolAddress.toHex() + "-" + NotificationType.VestingCliffBegun)
    notificationEntity.type = NotificationType.VestingCliffBegun
    notificationEntity.pool = dealCreatedEntity.poolAddress
    notificationEntity.triggerTime = event.block.timestamp
      .plus(dealDetailEntity.proRataRedemptionPeriod)
      .plus(dealDetailEntity.openRedemptionPeriod)
      .plus(dealDetailEntity.vestingCliff)
      .plus(dealDetailEntity.vestingPeriod)
    
      notificationEntity.save()
    }
}

export function createDealTokensVestingBegunNotification(event: DealDetailEvent):void {
    let dealDetailEntity = getDealDetailEntity(event.params.dealContract.toHex())
    let dealCreatedEntity = getDealCreatedEntity(event.params.dealContract.toHex())
    if(dealCreatedEntity && dealDetailEntity) {
        let notificationEntity = new Notification(dealCreatedEntity.poolAddress.toHex() + "-" + NotificationType.DealTokensVestingBegun)
        notificationEntity.type = NotificationType.DealTokensVestingBegun
        notificationEntity.pool = dealCreatedEntity.poolAddress
        notificationEntity.triggerTime = event.block.timestamp
            .plus(dealDetailEntity.proRataRedemptionPeriod)
            .plus(dealDetailEntity.openRedemptionPeriod)
            .plus(dealDetailEntity.vestingCliff)
        
            notificationEntity.save()
    }
}

export function removeDealTokensVestingBegunNotification(event: DealDetailEvent):void {
  let dealCreatedEntity = getDealCreatedEntity(event.params.dealContract.toHex())
  if(dealCreatedEntity) {
    let notificationEntity = Notification.load(dealCreatedEntity.poolAddress.toHex() + "-" + NotificationType.DealTokensVestingBegun)
    if (notificationEntity == null) {
      log.error("trying to find notification not saved with address: {}", [
        dealCreatedEntity.poolAddress.toHex() + "-" + NotificationType.DealTokensVestingBegun,
      ]);
    } else {
      store.remove('Notification', dealCreatedEntity.poolAddress.toHex() + "-" + NotificationType.DealTokensVestingBegun)
    }
  }
}


function getDealCreatedEntity(address:string): DealCreated | null {
    let dealCreatedEntity = DealCreated.load(address);
    if (dealCreatedEntity == null) {
      log.error("trying to find deal not saved with address: {}", [
        address,
      ]);
    }
    return dealCreatedEntity
}

function getDealDetailEntity(address:string): DealDetail | null {
    let dealDetailEntity = DealDetail.load(address);
    if (dealDetailEntity == null) {
      log.error("trying to find deal not saved with address: {}", [
        address,
      ]);
    }
    return dealDetailEntity
}

// function getVestingDeal(addess:string){
//     let vestingDeal = VestingDeal.load(address);
//     if(vestingDeal === null) {
//       log.error("trying to find a vestingDeal not saved with address: {}", [
//         address,
//       ]);
//       return;
//     }
// }
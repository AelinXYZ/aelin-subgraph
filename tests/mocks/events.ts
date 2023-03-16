import { newMockEvent } from 'matchstick-as/assembly/index'
import { Address, ethereum, BigInt, Bytes } from '@graphprotocol/graph-ts'

import { CreateUpFrontDeal as CreateUpFrontDealEvent } from '../../src/types/AelinUpfrontDealFactory_v1/AelinUpfrontDealFactory'

export function createNewUpfrontDealsEvent(
  dealAddress: string,
  name: string,
  symbol: string,
  purchaseToken: string,
  underlyingDealToken: string,
  holder: string,
  sponsor: string,
  sponsorFee: i32,
  merkleRoot: string,
  ipfsHash: string,
): CreateUpFrontDealEvent {
  let newUpfrontDealEvent = changetype<CreateUpFrontDealEvent>(newMockEvent())
  newUpfrontDealEvent.parameters = new Array<ethereum.EventParam>()

  let dealAddressParam = new ethereum.EventParam(
    'dealAddress',
    ethereum.Value.fromAddress(Address.fromString(dealAddress)),
  )

  let nameParam = new ethereum.EventParam('name', ethereum.Value.fromString(name))

  let symbolParam = new ethereum.EventParam('symbol', ethereum.Value.fromString(symbol))

  let purchaseTokenParam = new ethereum.EventParam(
    'purchaseToken',
    ethereum.Value.fromAddress(Address.fromString(purchaseToken)),
  )

  let underlyingDealTokenParam = new ethereum.EventParam(
    'underlyingDealToken',
    ethereum.Value.fromAddress(Address.fromString(underlyingDealToken)),
  )

  let holderParam = new ethereum.EventParam(
    'holder',
    ethereum.Value.fromAddress(Address.fromString(holder)),
  )

  let sponsorParam = new ethereum.EventParam(
    'sponsor',
    ethereum.Value.fromAddress(Address.fromString(sponsor)),
  )

  let sponsorFeeParam = new ethereum.EventParam(
    'sponsorFee',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(sponsorFee)),
  )

  let merkleRootParam = new ethereum.EventParam(
    'merkleRoot',
    ethereum.Value.fromFixedBytes(Bytes.fromHexString(merkleRoot) as Bytes),
  )

  let ipfsHashParam = new ethereum.EventParam('ipfsHash', ethereum.Value.fromString(ipfsHash))

  newUpfrontDealEvent.parameters.push(dealAddressParam)
  newUpfrontDealEvent.parameters.push(nameParam)
  newUpfrontDealEvent.parameters.push(symbolParam)
  newUpfrontDealEvent.parameters.push(purchaseTokenParam)
  newUpfrontDealEvent.parameters.push(underlyingDealTokenParam)
  newUpfrontDealEvent.parameters.push(holderParam)
  newUpfrontDealEvent.parameters.push(sponsorParam)
  newUpfrontDealEvent.parameters.push(sponsorFeeParam)
  newUpfrontDealEvent.parameters.push(merkleRootParam)
  newUpfrontDealEvent.parameters.push(ipfsHashParam)

  return newUpfrontDealEvent
}

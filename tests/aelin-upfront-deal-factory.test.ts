import {
  clearStore,
  describe,
  test,
  assert,
  createMockedFunction,
  afterEach,
} from 'matchstick-as/assembly/index'
import { Address, ethereum } from '@graphprotocol/graph-ts'

import { CreateUpFrontDeal as CreateUpFrontDealEvent } from '../src/types/AelinUpfrontDealFactory_v1/AelinUpfrontDealFactory'
import { handleCreateUpfrontDeal } from '../src/aelin-upfront-deal-factory'

import { createNewUpfrontDealsEvent } from './mocks/events'

import {
  UPFRONT_DEAL_ENTITY_TYPE,
  POOL_CREATED_ENTITY_TYPE,
  TOTAL_POOLS_CREATED_ENTITY_TYPE,
} from './entities'

export function handleCreateUpfrontDeals(events: CreateUpFrontDealEvent[]): void {
  events.forEach((event) => {
    handleCreateUpfrontDeal(event)
  })
}

describe('handleCreateUpfrontDeal()', () => {
  afterEach(() => {
    clearStore()
  })

  test('Can call handleCreateUpfrontDeal with custom events', () => {
    let upfrontDealEvent = createNewUpfrontDealsEvent(
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'Upfront Deal Test',
      'TEST',
      '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
      '0x61BAADcF22d2565B0F471b291C475db5555e0b76',
      '0xa834e550b45b4a469a05b846fb637bfcb12e3df8',
      '0xa834e550b45b4a469a05b846fb637bfcb12e3df8',
      2,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )

    createMockedFunction(
      Address.fromString('0x61baadcf22d2565b0f471b291c475db5555e0b76'),
      'symbol',
      'symbol():(string)',
    ).returns([ethereum.Value.fromString('AELIN')])

    createMockedFunction(
      Address.fromString('0x61baadcf22d2565b0f471b291c475db5555e0b76'),
      'decimals',
      'decimals():(uint8)',
    ).returns([ethereum.Value.fromI32(18)])

    createMockedFunction(
      Address.fromString('0x57ab1ec28d129707052df4df418d58a2d46d5f51'),
      'symbol',
      'symbol():(string)',
    ).returns([ethereum.Value.fromString('sUSD')])

    createMockedFunction(
      Address.fromString('0x57ab1ec28d129707052df4df418d58a2d46d5f51'),
      'decimals',
      'decimals():(uint8)',
    ).returns([ethereum.Value.fromI32(18)])

    handleCreateUpfrontDeal(upfrontDealEvent)

    // Asserts for UpfrontDeal entity
    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'name',
      'Upfront Deal Test',
    )

    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'symbol',
      'TEST',
    )

    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'underlyingDealToken',
      '0x61baadcf22d2565b0f471b291c475db5555e0b76',
    )

    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'holder',
      '0xa834e550b45b4a469a05b846fb637bfcb12e3df8',
    )

    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'merkleRoot',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )

    assert.fieldEquals(
      UPFRONT_DEAL_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'ipfsHash',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    )

    // Asserts for PoolCreated entity
    assert.fieldEquals(
      'PoolCreated',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'name',
      'Upfront Deal Test',
    )

    assert.fieldEquals(
      POOL_CREATED_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'sponsor',
      '0xa834e550b45b4a469a05b846fb637bfcb12e3df8',
    )

    assert.fieldEquals(
      POOL_CREATED_ENTITY_TYPE,
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
      'sponsorFee',
      '2',
    )

    // Asserts for TotalPoolsCreated entity
    assert.fieldEquals(TOTAL_POOLS_CREATED_ENTITY_TYPE, '1', 'count', '1')
  })
})

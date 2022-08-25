export namespace PoolStatus {
  export const PoolOpen = 'PoolOpen'
  export const FundingDeal = 'FundingDeal'
  export const DealOpen = 'DealOpen'
}

export namespace Notifications {
  export const InvestmentWindowAlert = 'InvestmentWindowAlert'
  export const InvestmentWindowEnded = 'InvestmentWindowEnded'
  export const DealProposed = 'DealProposed'
  export const HolderSet = 'HolderSet'
  export const SponsorFeesReady = 'SponsorFeesReady'
  export const VestingCliffBegun = 'VestingCliffBegun'
  export const WithdrawUnredeemed = 'WithdrawUnredeemed'
  export const DealTokensVestingBegun = 'DealTokensVestingBegun'
  export const AllDealTokensVested = 'AllDealTokensVested'
  export const FundingWindowAlert = 'FundingWindowAlert'
  export const FundingWindowEnded = 'FundingWindowEnded'
  export const DealNotFunded = 'DealNotFunded'
}

export namespace NotificationTarget {
  export const DealInvestor = 'DealInvestor'
  export const PoolInvestor = 'PoolInvestor'
  export const Sponsor = 'Sponsor'
  export const Holder = 'Holder'
}

export namespace NFTType {
  export const ERC721 = 'ERC721'
  export const ERC1155 = 'ERC1155'
}

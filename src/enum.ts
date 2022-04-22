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
}

export namespace NotificationTarget {
	export const Investor = 'Investor'
	export const Sponsor = 'Sponsor'
	export const Holder = 'Holder'
}

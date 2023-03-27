# Aelin Subgraph

A Aelin subgraph for [The Graph](https://thegraph.com). Aelin is a fundraising protocol built on Ethereum.
<br>
<br>

## Getting Started

Install the project dependencies by running `npm install`

Prerequisites: `Node.js` and `npm` installed, preferably LTS versions

### Hosted Deployment

The deploy script simplifies the deployment process, allowing you to deploy to any network and repo.

- Create a `.env` file in the root directory and set the `GRAPH_ACCESS_TOKEN` environment variable

- Run `npm run deploy:hosted:init` with the --network and --repo arguments:

  eg: `npm run deploy:hosted:init -- --network <network> --repo <repo>`

Replace <network> with the desired network (e.g., goerli, mainnet, optimism, arbitrum, polygon) and <repo> with the desired repository name (e.g., user/repo).

### Studio Deployment

The deploy script simplifies the deployment process, allowing you to deploy to any network and repo.

- Create a `.env` file in the root directory and set the `GRAPH_DEPLOY_KEY` environment variable

- Run `npm run deploy:studio:init` with the --network and --repo arguments:

  eg: `npm run deploy:studio:init -- --network <network> --repo <repo>`

Replace <network> with the desired network (e.g., mainnet, arbitrum) and <repo> with the desired repository name (e.g., your-subgraph-slug).

## Notifications

Notifications are a powerful feature that will allow Aelin to create a communication chanel with users in a reliable way. All notifications are design with a goal in mind: little-to-none work should be done on the client-side to transform chain data.
<br>
<br>

### Rendering

Notifications are created in advanced, this means that the client will have to decide if a notification should be rendered depending on `triggerStart` and `triggerEnd` fields.<br>
It's important to mention that all(\*) notifications will be removed from the subgraph at certain point and therefore wont be possible to query them again from that point.<br>
<i>Some notifications might be stored forever depending on the context and certain conditions, ie: a pool is created but no one invests in it and no deal is created. As a consequence no event will be emitted to remove InvestmentWindowAlert and InvestmentWindowEnded</i>
<br>
<br>

### Filtering

Notifications can be easily filtered by `target` and `type`, for instance:<br>
If a user has invested in `PoolA`, when all notifications from `PoolA` are pulled from the subgraph, the client will have to show <b>only</b> those relevant for the user, and in this case, since the user is (only) an investor, then the client should filter by `target: Investor`
<br>
<br>

### Entity Fields

<br>
<table>
<tr>
<th>Name</th><th>Type</th><th>Description</th>
</tr>
<tr>
<td>id</td><td><code>ID</code></td><td><code>address - NotificationType</code><br><i>address could be a poolAddress, dealAddress, or a userAddress</i></td>
</tr>
<tr>
<td>message</td><td><code>String</code></td><td>The notification message</td>
</tr>
<tr>
<td>type</td>
<td>
<pre>
enum NotificationType {
	InvestmentWindowAlert
	InvestmentWindowEnded
	DealProposed
	HolderSet
	SponsorFeesReady
	VestingCliffBegun
	WithdrawUnredeemed
	DealTokensVestingBegun
	AllDealTokensVested
}
</pre>
<td>Depending on the <code>type</code> field, the client-side will<br>decide if the <code>message</code> needs to be adapted or changed.</td>
</td>
</tr>
<tr>
<td>target</td>
<td>
<pre>
enum NotificationTarget {
	Investor
	Sponsor
	Holder
}
</pre>
</td>
<td>Since all notifications types and targets from a certain Pool <br>will be queried from the subgraph, the client will need a<br>way to filter them depending on the user type<br>(investor, sponsor, holder)
</td>
</tr>
<tr>
<td>triggerStart</td><td><code>BigInt</code></td><td>Notification should be visible to the client <b>only</b> if the current <br> time has passed <code>triggerStart</code></td>
</tr>
</tr>
<tr>
<td>triggerEnd</td><td><code>BigInt</code></td><td>Notification should be <b>NOT</b> be visible to the client if the current<br> time has passed <code>triggerEnd</code></td>
</tr>
<tr>
<td>pool</td><td><code>PoolCreated</code></td><td>Contain all the information of the pool related to the notification</td>
</tr>

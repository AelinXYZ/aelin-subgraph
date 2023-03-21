const { spawnSync } = require('child_process')
const args = require('args')
require('dotenv').config()

args
  .option('network', 'The network on which the subgraph will be deploying')
  .option('repo', 'The project on which the subgraph will be deploying')

const flags = args.parse(process.argv)

const { network, repo } = flags
const token = process.env.GRAPH_ACCESS_TOKEN

if (!network || !repo) {
  console.error('Please provide --network and --repo arguments')
  process.exit(1)
}

if (!token) {
  console.error('GRAPH_ACCESS_TOKEN not found')
  process.exit(1)
}

console.log(`Deploying to ${network} for ${repo}...`)
const result = spawnSync('npm', ['run', 'deploy:hosted'], {
  env: { ...process.env, NETWORK: network, REPO: repo, GRAPH_ACCESS_TOKEN: token },
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Error deploying to ${network} for ${repo}:`, result.error)
  process.exit(result.status)
}

process.exit()

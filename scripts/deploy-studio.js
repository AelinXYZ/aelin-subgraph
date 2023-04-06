const { spawnSync } = require('child_process')
const args = require('args')
require('dotenv').config()

args
  .option('network', 'The network on which the subgraph will be deploying')
  .option('slug', 'The project on which the subgraph will be deploying')

const flags = args.parse(process.argv)

const { network, slug } = flags
const token = process.env.GRAPH_DEPLOY_KEY

if (!network || !slug) {
  console.error('Please provide --network and --slug arguments')
  process.exit(1)
}

if (!token) {
  console.error('GRAPH_DEPLOY_KEY not found')
  process.exit(1)
}

console.log(`Deploying to ${network} for ${slug}...`)
const result = spawnSync('npm', ['run', 'deploy:studio'], {
  env: { ...process.env, NETWORK: network, REPO: slug, GRAPH_DEPLOY_KEY: token },
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Error deploying to ${network} for ${slug}:`, result.error)
  process.exit(result.status)
}

process.exit()

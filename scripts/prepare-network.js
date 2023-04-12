const { spawnSync } = require('child_process')
const args = require('args')
require('dotenv').config()

args.option('network', 'The network to prepare for')

const flags = args.parse(process.argv)

const { network } = flags

if (!network) {
  console.error('Please provide --network argument')
  process.exit(1)
}

const result = spawnSync('npm', ['run', 'prepare:network'], {
  env: { ...process.env, NETWORK: network },
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Error preparing ${network} network:`, result.error)
  process.exit(result.status)
}

process.exit()

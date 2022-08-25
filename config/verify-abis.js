const fs = require('fs')

const fileExists = async (path) =>
  !!(await fs.promises.stat(path).catch(() => {
    console.log(
      `ABI for ${path.slice(
        path.lastIndexOf('/') + 1,
        path.lastIndexOf('.'),
      )} not found! [${path}]`,
    )
    process.exit(1)
  }))

const getAbiNames = (dataSources) => dataSources.map((d) => d.name)

const verify = async () => {
  const network = process.argv.slice(2)

  if (!network) process.exit(1)

  const config = require(`./${network}.json`)
  const abiNames = getAbiNames(config.dataSources)

  await Promise.all(abiNames.map((abi) => fileExists(`./abis/${abi}.json`)))

  console.log(`Verification for ${network} passed.`)
  process.exit(0)
}

verify()

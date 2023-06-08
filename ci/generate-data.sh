#!/bin/bash

file_path="/usr/share/envs/.env.linuz"

while [ ! -f $file_path ]
do
  echo "Waiting for file $file_path to exist..."
  sleep 1
done

AELIN_POOL_FACTORY_ADDRESS=$(grep AelinPoolFactory_address /usr/share/envs/.env.linuz | tail -1 | awk -F "=" '{print $2}')
AELIN_DEAL_FACTORY_ADDRESS=$(grep AelinUpFrontDealFactory_address /usr/share/envs/.env.linuz | tail -1 | awk -F "=" '{print $2}')

echo "
{
  \"network\": \"mainnet\",
  \"dataSources\": {
    \"sponsorPools\": [
      {
        \"name\": \"AelinPoolFactory_v4\",
        \"address\": \"$AELIN_POOL_FACTORY_ADDRESS\",
        \"startBlock\": 1
      }
    ],
    \"upfrontDeals\": [
      {
         \"name\": \"AelinUpfrontDealFactory_v1\",
        \"address\": \"$AELIN_DEAL_FACTORY_ADDRESS\",
        \"startBlock\": 1
      }
    ]
  }
}
" > ../config/goerli-ci.json

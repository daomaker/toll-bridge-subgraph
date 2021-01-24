# Deployment Readme

## Step 1: Update contract addresses

Update the contract `address` and `network` in `subgraph.yaml` to the correct values.

## Step 2: Update the package.json

Update `SUBGRAPH_NAME` (e.g. daomaker/dyco-subgraph) and `ACCESS_TOKEN` in `./package.json` to the correct values.

## Step 3: Install npm packages

Run `yarn install`

## Step 4: Codegen

Run `yarn run codegen`

## Step 5: Deploy

Run `yarn run deploy`. The deployed subgraph can be found at https://thegraph.com/explorer/dashboard

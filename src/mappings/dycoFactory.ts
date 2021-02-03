import {
  BigInt,
  Address,
} from "@graphprotocol/graph-ts"
import {
  DycoCreated,
  DycoExited,
  DycoPaused,
  DycoResumed,
  TokensClaimed,
  WhitelistedUsersAdded
} from "../../generated/DycoFactory/DycoFactory"
import {
  Dyco,
  Operator,
  Investor,
  DycoState,
  Claim
} from "../../generated/schema"

import * as Utils from '../utils'

export function handleDycoCreated(event: DycoCreated): void {
  let id = event.params.dyco.toHex()

  // Save DYCO entity

  let entity = new Dyco(id)
  entity.address = event.params.dyco.toHex()
  entity.token = event.params.token.toHex()
  entity.tollFee = event.params.tollFee

  let totalDelay = Utils.ZERO_INT
  let delays = event.params.distributionDelays
  let releasesTimestamps = new Array<BigInt>(delays.length)
  for (let i = 0; i < delays.length; i++) {
    totalDelay = totalDelay.plus(delays[i])

    if (i == 0) {
      releasesTimestamps[i] = event.block.timestamp.plus(delays[i])
    } else {
      releasesTimestamps[i] = releasesTimestamps[i - 1].plus(delays[i])
    }
  }

  entity.distributionDelays = delays
  entity.distributionPercents = event.params.distributionPercents
  entity.releasesTimestamps = releasesTimestamps
  entity.start = event.block.timestamp
  entity.finish = event.block.timestamp.plus(totalDelay)
  entity.transferredTokens = Utils.ZERO_DEC
  entity.burnedTokens = Utils.ZERO_DEC
  entity.totalTokens = Utils.ZERO_DEC
  entity.isTokenBurnable = event.params.isBurnableToken
  entity.isPaused = false
  entity.isExited = false
  entity.initialDistributionEnabled = event.params.initialDistributionEnabled
  entity.transactionHash = event.transaction.hash.toHex()
  entity.investors = Utils.EMPTY_STRING_ARRAY
  entity.operator = event.params.operator.toHex()
  entity.save()

  // Save Operator entity

  let operatorEntity = Operator.load(event.params.operator.toHex())
  if (operatorEntity == null) {
    operatorEntity = new Operator(event.params.operator.toHex())
    operatorEntity.address = event.params.operator.toHex()
    operatorEntity.dycos = Utils.EMPTY_STRING_ARRAY
  }

  let dycos = operatorEntity.dycos
  dycos.push(entity.id)
  operatorEntity.dycos = dycos
  operatorEntity.save()
}

export function handleWhitelistedUsersAdded(event: WhitelistedUsersAdded): void {
  let entity = Dyco.load(event.params.dyco.toHex())
  let investors = entity.investors
  let decimals: i32 = Utils.getTokenDecimals(Address.fromString(entity.token))

  let users = event.params.users
  let amounts = event.params.amounts

  for (let i = 0; i < users.length; i++) {
    let investorEntity = Investor.load(users[i].toHex())
    if (investorEntity == null) {
      investorEntity = new Investor(users[i].toHex())
      investorEntity.address = users[i].toHex()
      investorEntity.dycos = Utils.EMPTY_STRING_ARRAY
    }

    let dycoStateEntity = new DycoState(users[i].toHex() + "-" + event.params.dyco.toHex())
    dycoStateEntity.dyco = event.params.dyco.toHex()
    dycoStateEntity.maxTokens = Utils.normalize(amounts[i], decimals)
    dycoStateEntity.lastActivity = Utils.ZERO_INT
    dycoStateEntity.distributedTokens = Utils.ZERO_DEC
    dycoStateEntity.claims = Utils.EMPTY_STRING_ARRAY

    if (entity.initialDistributionEnabled) {
      // Calculate user claimed amount
      let distributionPercents = entity.distributionPercents
      let claimedTokensAmount = Utils.normalize(amounts[i].times(distributionPercents[0]).div(BigInt.fromI32(10000)), decimals)

      // Create entity for claim
      let claimedEntity = new Claim(users[i].toHex() + "-" + event.params.dyco.toHex() + "-" + event.transaction.hash.toHex())
      claimedEntity.claimedTokens = claimedTokensAmount
      claimedEntity.burnedTokens = Utils.ZERO_DEC
      claimedEntity.timestamp = event.block.timestamp
      claimedEntity.transactionHash = event.transaction.hash.toHex()
      claimedEntity.save()

      // Update user dyco state values
      dycoStateEntity.distributedTokens = claimedTokensAmount
      dycoStateEntity.lastActivity = event.block.timestamp
      let claims = dycoStateEntity.claims
      claims.push(claimedEntity.id)
      dycoStateEntity.claims = claims

      // Update DYCO total and distributed tokens amount
      entity.totalTokens = entity.totalTokens.plus(Utils.normalize(amounts[i], decimals))
      entity.transferredTokens = entity.transferredTokens.plus(claimedTokensAmount)
    }

    dycoStateEntity.save()

    let investorDycos = investorEntity.dycos
    investorDycos.push(dycoStateEntity.id)
    investorEntity.dycos = investorDycos

    investorEntity.save()

    // Save for DYCO entity
    investors.push(users[i].toHex())
  }

  entity.investors = investors
  entity.save()
}

export function handleDycoExited(event: DycoExited): void {
  let entity = Dyco.load(event.params.dyco.toHex())
  entity.isExited = true
  entity.save()
}

export function handleDycoPaused(event: DycoPaused): void {
  let entity = Dyco.load(event.params.dyco.toHex())
  entity.isPaused = true
  entity.save()
}

export function handleDycoResumed(event: DycoResumed): void {
  let entity = Dyco.load(event.params.dyco.toHex())
  entity.isPaused = false
  entity.save()
}

export function handleTokensClaimed(event: TokensClaimed): void {
  let entity = Dyco.load(event.params.dyco.toHex())
  let decimals: i32 = Utils.getTokenDecimals(Address.fromString(entity.token))

  let dycoStateEntity = DycoState.load(event.params.receiver.toHex() + "-" + event.params.dyco.toHex())

  let burnedTokens = Utils.normalize(event.params.burned, decimals)
  let receivedTokens = Utils.normalize(event.params.received, decimals)

  // Create entity for claim
  let claimedEntity = new Claim(event.params.receiver.toHex() + "-" + event.params.dyco.toHex() + "-" + event.transaction.hash.toHex())
  claimedEntity.claimedTokens = receivedTokens
  claimedEntity.burnedTokens = burnedTokens
  claimedEntity.timestamp = event.block.timestamp
  claimedEntity.transactionHash = event.transaction.hash.toHex()
  claimedEntity.save()

  // Update user dyco state values
  dycoStateEntity.distributedTokens = dycoStateEntity.distributedTokens.plus(burnedTokens).plus(receivedTokens)
  dycoStateEntity.lastActivity = event.block.timestamp
  let claims = dycoStateEntity.claims
  claims.push(claimedEntity.id)
  dycoStateEntity.claims = claims

  // Increase global transferred/burned tokens amount
  entity.transferredTokens = entity.transferredTokens.plus(receivedTokens)
  entity.burnedTokens = entity.burnedTokens.plus(burnedTokens)

  // Save dyco state
  dycoStateEntity.save()
  entity.save()
}

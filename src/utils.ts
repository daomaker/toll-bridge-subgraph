import { BigInt, Address, BigDecimal } from '@graphprotocol/graph-ts'
import { DycoToken } from '../generated/templates/DycoToken/DycoToken'

export let ZERO_INT = BigInt.fromI32(0)
export let ZERO_DEC = BigDecimal.fromString('0')
export let EMPTY_STRING_ARRAY = new Array<string>()
export let ONE_INT = BigInt.fromI32(1)
export let ONE_DEC = BigDecimal.fromString('1')
export let PRECISION = new BigDecimal(tenPow(18))
export let ETH_ADDR = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
export let ZERO_ADDR = '0x0000000000000000000000000000000000000000'

export function tenPow(exponent: number): BigInt {
  let result = BigInt.fromI32(1)
  for (let i = 0; i < exponent; i++) {
    result = result.times(BigInt.fromI32(10))
  }
  return result
}

export function dycoToken(tokenAddress: Address): DycoToken {
  return DycoToken.bind(tokenAddress)
}

export function getArrItem<T>(arr: Array<T>, idx: i32): T {
  let a = new Array<T>()
  a = a.concat(arr)
  return a[idx]
}

export function getTokenDecimals(tokenAddress: Address): i32 {
  let token = dycoToken(tokenAddress)
  let decimals: i32
  if (ETH_ADDR.includes(tokenAddress.toHex())) {
    decimals = 18
  } else {
    decimals = token.decimals()
  }
  return decimals
}

export function normalize(i: BigInt, decimals: number = 18): BigDecimal {
  return i.toBigDecimal().div(tenPow(decimals).toBigDecimal())
}
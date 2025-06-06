import { ArbitrageResult } from "./bellman-ford-algorithm.ts";
import { calculatePrice } from "./depth-calculator.ts";
import { getKvNull } from "./kvStore.ts";
import { Balance, CurrencyCode, OrderBook } from "./types.ts";
import mockBalance from './mock-balance.json' with { type: 'json' }

const getBestPrice = async (params: {type: 'buy' | 'sell', base: CurrencyCode, quote: CurrencyCode, amount: number}): Promise<[number, boolean]> => {
  const { type, base, quote, amount } = params

  const [real, inverse] = await Promise.all([
    getKvNull<OrderBook>([quote, base]), 
    getKvNull<OrderBook>([base, quote])
  ])

  const depth = real ?? inverse

  if (!depth) {
    throw new Error(`No depth found for ${base} -> ${quote}`)
  }


  /** Sell */
  return [calculatePrice({orderBook: depth, amount, type}).averagePrice, !!inverse]
}

const exchangeFee = 0.0022

const actionArbitrage = async (result: ArbitrageResult) => {
  if (!result.hasArbitrage || !result.path) {
    return "No arbitrage opportunity detected.";
  }

  let tempBalance = {...mockBalance, [result.path[0]]: { available: 10, allocatedOnExchange: 0 }} as Balance
  let amount = tempBalance[result.path[0]].available
  
  for (let i = 0; i < result.path.length - 1; i++) {
    const baseCode = result.path[i]
    const quoteCode = result.path[i + 1]
    const type = i % 2 === 0 ? 'buy' : 'sell'

    const [bestPrice, inverse] = await getBestPrice({type, base: baseCode, quote: quoteCode, amount})
    const balance = tempBalance[baseCode].available

    const total = inverse ? amount / bestPrice : amount * bestPrice
    const fee = total * exchangeFee
    const totalAfterFee = total - fee

    const newBalance = balance - amount
    amount = totalAfterFee

    tempBalance[baseCode] = { available: newBalance, allocatedOnExchange: 0 }
    tempBalance[quoteCode] = { available: tempBalance[quoteCode].available + totalAfterFee, allocatedOnExchange: 0 }

    console.log({
      type: i % 2 === 0 ? 'buy' : 'sell',
      path: `${baseCode} -> ${quoteCode}`,
      price: bestPrice,
      purchaseAmount: total,
      fee,
      balance,
    })
  }

}

export default actionArbitrage
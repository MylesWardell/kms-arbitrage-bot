import { ArbitrageResult, detectArbitrage } from "./bellman-ford-algorithm.ts";
import { Balance, CurrencyCode, DepthItems } from "./types.ts";
import { getKvNull } from "./kvStore.ts";
import mockBalance from './mock-balance.json' with { type: 'json' }

/**
 * Format the arbitrage result for display
 * 
 * @param result - Arbitrage detection result
 * @returns Formatted string with arbitrage details
 */
function formatArbitrageResult(result: ArbitrageResult): string {
  if (!result.hasArbitrage || !result.path) {
    return "No arbitrage opportunity detected.";
  }
  
  const profitPercentage = (result.profitFactor - 1) * 100;
  const path = result.path.join(" → ");
  
  return `
    Arbitrage opportunity detected!
    Path: ${path}
    Profit factor: ${result.profitFactor.toFixed(4)}
    Profit percentage: ${profitPercentage.toFixed(2)}%
  `;
}

const getBestPrice = async (type: 'buy' | 'sell', base: CurrencyCode, quote: CurrencyCode): Promise<[number, boolean]> => {
  const [real, inverse] = await Promise.all([
    getKvNull<DepthItems>([quote, base]), 
    getKvNull<DepthItems>([base, quote])
  ])

  const depth = real ?? inverse

  if (!depth) {
    throw new Error(`No depth found for ${base} -> ${quote}`)
  }

  /**Buy */
  if (type === 'buy') {
    return [depth.ask[0].price, !!inverse]
  }

  /** Sell */
  return [depth.bid[0].price, !!inverse]

}

const exchangeFee = 0.0022

const main = async    () => {
  const startCurrency = 'KAU';
  const result = await  detectArbitrage(startCurrency);

  console.log(result)

  if (!result.hasArbitrage || !result.path) {
    return "No arbitrage opportunity detected.";
  }

  let tempBalance = {...mockBalance, [result.path[0]]: { available: 10, allocatedOnExchange: 0 }} as Balance
  let amount = tempBalance[result.path[0]].available
  
  for (let i = 0; i < result.path.length - 1; i++) {
    const baseCode = result.path[i]
    const quoteCode = result.path[i + 1]
    const type = i % 2 === 0 ? 'buy' : 'sell'

    const [bestPrice, inverse] = await getBestPrice(type, baseCode, quoteCode)
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

  console.log(tempBalance[result.path[0]])
  console.log(formatArbitrageResult(result))
};

if (import.meta.main) {
  main();
}

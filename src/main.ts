import { ArbitrageResult, detectArbitrage } from "./bellman-ford-algorithm.ts";
import actionArbitrage from "./implement-arbitrage.ts";

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


const main = async    () => {
  const startCurrency = 'KAU';
  const result = await detectArbitrage(startCurrency);
  console.log(await actionArbitrage(result))
};

if (import.meta.main) {
  main();
}

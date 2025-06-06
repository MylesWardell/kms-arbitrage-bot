import { OrderBook } from "./types.ts";

/**
 * Calculates the average price for buying a specific amount of the base currency
 * 
 * @param orderBook - The order book with bid and ask arrays
 * @param amount - The amount of base currency to buy (e.g., BTC amount for BTC_AUD)
 * @returns Object containing the average price and total cost
 */
export function calculateBuyPrice(orderBook: OrderBook, amount: number): { 
  averagePrice: number; 
  totalCost: number;
  filled: boolean;
} {
  const asks = orderBook.ask;

  let remainingAmount = amount;
  let totalCost = 0;

  // Go through the ask orders from lowest to highest price
  for (const ask of asks) {
    const fillAmount = Math.min(remainingAmount, ask.amount);
    const fillCost = fillAmount * ask.price;
    
    totalCost += fillCost;
    remainingAmount -= fillAmount;
    
    // If we've filled the entire amount, we're done
    if (remainingAmount <= 0.00000001) { // Using a small epsilon to account for floating-point precision
      break;
    }
  }
  
  // Check if we could fill the entire order
  const filled = remainingAmount <= 0.00000001;
  
  // Calculate the average price
  const averagePrice = amount > 0 ? totalCost / (amount - remainingAmount) : 0;

  return {
    averagePrice: averagePrice,
    totalCost: totalCost,
    filled: filled
  };
}

/**
 * Calculates the average price for selling a specific amount of the base currency
 * 
 * @param orderBook - The order book with bid and ask arrays
 * @param amount - The amount of base currency to sell (e.g., BTC amount for BTC_AUD)
 * @returns Object containing the average price and total proceeds
 */
export function calculateSellPrice(orderBook: OrderBook, amount: number): {
  averagePrice: number;
  totalProceeds: number;
  filled: boolean;
} {
  const bids = orderBook.bid;

  let remainingAmount = amount;
  let totalProceeds = 0;
  
  // Go through the bid orders from highest to lowest price
  for (const bid of bids) {
    const fillAmount = Math.min(remainingAmount, bid.amount);
    const fillProceeds = fillAmount * bid.price;
    
    totalProceeds += fillProceeds;
    remainingAmount -= fillAmount;

    // If we've filled the entire amount, we're done
    if (remainingAmount <= 0.00000001) { // Using a small epsilon to account for floating-point precision
      break;
    }
  }
  
  // Check if we could fill the entire order
  const filled = remainingAmount <= 0.00000001;
  
  // Calculate the average price
  const averagePrice = amount > 0 ? totalProceeds / (amount - remainingAmount) : 0;

  return {
    averagePrice: averagePrice,
    totalProceeds: totalProceeds,
    filled: filled
  };
}

/**
 * Main function to calculate price based on amount and side (buy/sell)
 * 
 * @param orderBook - The order book with bid and ask arrays
 * @param amount - The amount of base currency (positive for buy, negative for sell)
 * @returns Object containing the execution details
 */
export function calculatePrice(params: {orderBook: OrderBook, amount: number, type: 'buy' | 'sell'}): {
  averagePrice: number;
  totalValue: number;
  filled: boolean;
  side: 'buy' | 'sell';
} {
  const { orderBook, amount, type } = params

  if (type === 'buy') {
    const result = calculateBuyPrice(orderBook, amount);
    return {
      averagePrice: result.averagePrice,
      totalValue: result.totalCost,
      filled: result.filled,
      side: 'buy'
    };
  } else {
    const result = calculateSellPrice(orderBook, amount);
    return {
      averagePrice: result.averagePrice,
      totalValue: result.totalProceeds,
      filled: result.filled,
      side: 'sell'
    };
  }
}
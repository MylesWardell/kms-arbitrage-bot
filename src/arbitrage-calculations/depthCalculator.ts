import { OrderBook } from "../types.ts";
import { Decimal } from "decimal.js";

/**
 * Calculates the average price for buying a specific amount of the base currency
 * 
 * @param orderBook - The order book with bid and ask arrays
 * @param amount - The amount of base currency to buy (e.g., BTC amount for BTC_AUD)
 * @returns Object containing the average price and total cost
 */
export function calculateBuyPrice(orderBook: OrderBook, amount: Decimal): { 
  averagePrice: Decimal; 
  totalCost: Decimal;
  filled: boolean;
} {
  const asks = orderBook.ask;

  let remainingAmount = new Decimal(amount);
  let totalCost = new Decimal(0);

  // Go through the ask orders from lowest to highest price
  for (const ask of asks) {
    const fillAmount = Decimal(remainingAmount).lt(new Decimal(ask.amount)) ? remainingAmount : new Decimal(ask.amount);
    const fillCost = fillAmount.times(ask.price);

    totalCost = totalCost.plus(fillCost);
    remainingAmount = remainingAmount.minus(fillAmount);
    
    // If we've filled the entire amount, we're done
    if (remainingAmount.lte(0.00000001)) { // Using a small epsilon to account for floating-point precision
      break;
    }
  }
  
  // Check if we could fill the entire order
  const filled = remainingAmount.lte(0.00000001);
  
  // Calculate the average price
  const averagePrice = amount.gt(0) ? totalCost.div(amount.minus(remainingAmount)) : new Decimal(0);

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
export function calculateSellPrice(orderBook: OrderBook, amount: Decimal): {
  averagePrice: Decimal;
  totalProceeds: Decimal;
  filled: boolean;
} {
  const bids = orderBook.bid;

  let remainingAmount = new Decimal(amount);
  let totalProceeds = new Decimal(0);
  
  // Go through the bid orders from highest to lowest price
  for (const bid of bids) {
    const fillAmount = Decimal(remainingAmount).lt(new Decimal(bid.amount)) ? remainingAmount : new Decimal(bid.amount);
    const fillProceeds = fillAmount.times(bid.price);
    
    totalProceeds = totalProceeds.plus(fillProceeds);
    remainingAmount = remainingAmount.minus(fillAmount);

    // If we've filled the entire amount, we're done
    if (remainingAmount.lte(0.00000001)) { // Using a small epsilon to account for floating-point precision
      break;
    }
  }
  
  // Check if we could fill the entire order
  const filled = remainingAmount.lte(0.00000001);
  
  // Calculate the average price
  const averagePrice = amount.gt(0) ? totalProceeds.div(amount.minus(remainingAmount)) : new Decimal(0);

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
export function calculatePrice(params: {orderBook: OrderBook, amount: Decimal, type: 'buy' | 'sell'}): {
  averagePrice: Decimal;
  totalValue: Decimal;
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
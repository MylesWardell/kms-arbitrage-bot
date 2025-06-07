import { ArbitrageOpportunity, CurrencyCode, Edge } from "../types.ts";
import { getBestPrice } from "./getBestPrice.ts";
import { get } from "../kvStore.ts";
import { Decimal } from "decimal.js";
import { findNegativeCycles } from "./bellmanFordAlgorithm.ts";
import { getQuoteBaseMap } from "../helpers/getQuoteBaseMap.ts";

/**
 * Step 2: Convert market data to exchange rates
 *
 * @param marketDataSet - Array of market data entries
 * @returns Array of exchange rates
 */
export async function convertToExchangeRates(): Promise<Edge[]> {
  const quoteCurrencies = await getQuoteBaseMap();

  const exchangeRates: Edge[] = [];
  for (const quoteCurrency of quoteCurrencies.keys()) {
    const baseCurrencies = quoteCurrencies.get(quoteCurrency);
    if (!baseCurrencies) {
      continue;
    }

    for (const baseCurrency of baseCurrencies) {
      const bestPrice = await getBestPrice({
        from: baseCurrency as CurrencyCode,
        to: quoteCurrency as CurrencyCode,
        pay: new Decimal(10),
      });

      const bestPriceInverse = await getBestPrice({
        from: quoteCurrency as CurrencyCode,
        to: baseCurrency as CurrencyCode,
        pay: new Decimal(10),
      });

      exchangeRates.push({
        fromCurrency: baseCurrency as CurrencyCode,
        toCurrency: quoteCurrency as CurrencyCode,
        rate: bestPrice.price,

        weight: bestPrice.rateAdjusted.ln().neg(),
        type: bestPrice.type,
      });

      exchangeRates.push({
        fromCurrency: quoteCurrency as CurrencyCode,
        toCurrency: baseCurrency as CurrencyCode,
        rate: bestPriceInverse.price,

        weight: bestPriceInverse.rateAdjusted.ln().neg(),
        type: bestPriceInverse.type,
      });
    }
  }

  return exchangeRates;
}

export async function detectArbitrageOpportunities(): Promise<
  Array<ArbitrageOpportunity>
> {
  // Step 1: Convert market data to exchange rates
  const exchangeRates = await convertToExchangeRates();

  // Step 2: Create a graph
  const baseCurrencies = await get<CurrencyCode[]>(["base-currencies"]);
  const quoteCurrencies = await get<CurrencyCode[]>(["quote-currencies"]);
  const currencies = new Set([...baseCurrencies, ...quoteCurrencies]);

  // Step 3: Use Bellman-Ford algorithm to find arbitrage opportunities
  const opportunities = findNegativeCycles({
    vertices: currencies,
    edges: exchangeRates,
  });

  return opportunities;
}

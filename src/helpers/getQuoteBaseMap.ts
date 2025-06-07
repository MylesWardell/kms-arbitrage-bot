import {
  ExchangePairResponse,
} from "../types.ts";

export const getQuoteBaseMap = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await kv.get<ExchangePairResponse[]>(["all-currencies"]);

  if (!currencies.value) {
    throw new Error("No currencies found");
  }

  const baseCurrencies = new Set<string>();
  const quoteCurrencies = new Set<string>();

  const quoteBaseMap = new Map<string, Set<string>>();
  for (const currency of currencies.value) {
    baseCurrencies.add(currency.baseCurrency);
    quoteCurrencies.add(currency.quoteCurrency);

    if (quoteBaseMap.has(currency.quoteCurrency)) {
      quoteBaseMap.get(currency.quoteCurrency)?.add(currency.baseCurrency);
    } else {
      quoteBaseMap.set(
        currency.quoteCurrency,
        new Set([currency.baseCurrency]),
      );
    }
  }

  return quoteBaseMap;
};

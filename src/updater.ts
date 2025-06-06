import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import { getBalanceQuery, getExchangeDepthBySymbolQuery, getExchangePairsQuery } from "./kms_requests.ts";
import type { ExchangePairResponse } from "./types.ts";

export const updateDepth = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await getExchangePairsQuery()

  for (const currency of currencies) {
    const depth = await getExchangeDepthBySymbolQuery(currency.currencyPairId);
    await kv.set([currency.quoteCurrency, currency.baseCurrency], depth.depthItems);
    await sleep(1)
    console.debug('Updated depth for', currency.currencyPairId)
  }
}

export const updateExchangePairs = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await getExchangePairsQuery()
  await kv.set(['all-currencies'], currencies)

  const baseCurrencies = new Set<string>()
  const quoteCurrencies = new Set<string>()


  await Promise.all([
    kv.set(['base-currencies'], Array.from(baseCurrencies)),
    kv.set(['quote-currencies'], Array.from(quoteCurrencies)),
  ])

  console.debug('Updated Kv for all currencies')
}

export const updateBalance = async () => {
  const kv = await Deno.openKv("./kv.db");
  const balance = await getBalanceQuery()
  await kv.set(['balance'], balance)
  console.debug('Update balance')
}

export const getQuoteBaseMap = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await kv.get<ExchangePairResponse[]>(['all-currencies'])

  if (!currencies.value) {
    throw new Error('No currencies found')
  }

  const baseCurrencies = new Set<string>()
  const quoteCurrencies = new Set<string>()

  const quoteBaseMap = new Map<string, Set<string>>()
  for (const currency of currencies.value) {
    baseCurrencies.add(currency.baseCurrency)
    quoteCurrencies.add(currency.quoteCurrency)

    if (quoteBaseMap.has(currency.quoteCurrency)) {
      quoteBaseMap.get(currency.quoteCurrency)?.add(currency.baseCurrency)
    } else {
      quoteBaseMap.set(currency.quoteCurrency, new Set([currency.baseCurrency]))
    }
  }

  return quoteBaseMap
}

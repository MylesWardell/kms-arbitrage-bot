import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import { getBalanceQuery, getExchangeDepthBySymbolQuery, getExchangePairsQuery } from "../helpers/kmsApiRequests.ts";

export const updateDepth = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await getExchangePairsQuery()

  for (const currency of currencies) {
    try {
      const depth = await getExchangeDepthBySymbolQuery(currency.currencyPairId);
      await kv.atomic()
        .enqueue([['depth', currency.quoteCurrency, currency.baseCurrency, 'bid'], depth.depthItems.bid])
        .enqueue([['depth', currency.quoteCurrency, currency.baseCurrency, 'ask'], depth.depthItems.ask])
        .commit()
      console.debug('Updated depth for', currency.currencyPairId)
    } catch (error) {
      console.error(error)
    }
    await sleep(1)
  }
}

export const updateExchangePairs = async () => {
  const kv = await Deno.openKv("./kv.db");
  const currencies = await getExchangePairsQuery()
  await kv.set(['all-currencies'], currencies)

  const baseCurrencies = new Set<string>()
  const quoteCurrencies = new Set<string>()

  for (const currency of currencies) {
    baseCurrencies.add(currency.baseCurrency)
    quoteCurrencies.add(currency.quoteCurrency)
  }

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


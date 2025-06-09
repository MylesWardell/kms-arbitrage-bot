import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import { getLiveRate } from "../helpers/swyftxApiRequests.ts";
import { getKv } from "../kvStore.ts";
import { CurrencyCode, SymbolId } from "../types.ts";

const validCurrencies: SymbolId[] = [
  "USD_USDT",
  "USD_USDC",
  "BTC_USD",
  "USD_BTC",
  "USD_ETH",
  "USD_BCH",
  "USD_LTC",
  "USD_XRP",
  "USD_XDC",
  "USD_XLM",
  "AUD_USDC",
  "AUD_USDT",
  "AUD_XDC",
  "AUD_ETH",
  "BTC_AUD",
  "AUD_BTC",
  "AUD_LTC",
  "AUD_BCH",
  "AUD_XRP",
  "AUD_XLM",
  "BTC_ETH",
];

const swyftxPricing = async () => {
  const kv = await getKv();

  for (const currency of validCurrencies) {
    const [base, quote] = currency.split("_") as [CurrencyCode, CurrencyCode];
    const [bid, ask] = await Promise.all([
      getLiveRate({ base, quote, side: "bid", resolution: "1m" }),
      getLiveRate({ base, quote, side: "ask", resolution: "1m" }),
    ]);

    kv.enqueue({
      symbolId: currency,
      bidPrice: bid,
      askPrice: ask,
      exchange: "swyftx",
    });
    await sleep(0.1)
  }
};

export const swyftxPricingPolling = async () => {
  while (true) {
    await swyftxPricing();
  }
};

import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import { getKv } from "../kvStore.ts";
import { connectToKmsPricingSocket, Ticker } from "./kmsPricingSocket.ts";
import { swyftxPricingPolling } from "./swyftxPricingPolling.ts";

export const listenToPriceUpdates = async () => {
  const kv = await getKv()

  kv.listenQueue(async (ticker: Ticker) => {
    console.debug('Update pricing for', ticker.symbolId, ticker.exchange)
    await kv.set(["price", ticker.symbolId, ticker.exchange], ticker);
  });

  void connectToKmsPricingSocket()
  void swyftxPricingPolling()
}
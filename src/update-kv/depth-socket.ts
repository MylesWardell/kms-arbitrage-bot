import { io } from "socket.io-client";
import { getExchangePairsQuery } from "../helpers/kmsApiRequests.ts";
import { SymbolId } from "../types.ts";

export interface Ticker {
  symbolId: SymbolId;
  bidPrice: number;
  askPrice: number;
}

const baseUrl = "wss://apip.kinesis.money";
const path = "/notifications/market-analytics/tickers";

export const connectToDepthSocket = async () => {
  const currencies = await getExchangePairsQuery();
  const symbolIds = currencies.map((currency) => currency.currencyPairId);

  const socket = io(baseUrl, {
    path,
    query: {
      symbolIds,
    },
    transports: ["websocket"],
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("Connected to depth socket");
    socket.emit("subscribeToTickers", { symbolIds });
  });

  socket.on(
    "tickerInit",
    async (
      tickers: Record<SymbolId, Ticker>,
    ) => {
      const kv = await Deno.openKv("./kv.db");

      const atomic = kv.atomic();

      for (const ticker of Object.values(tickers)) {
        atomic.set(["price", ticker.symbolId], ticker);
      }

      await atomic.commit();
      console.log("Ticker init committed");
    },
  );

  socket.on(
    "tickerChange",
    async (
      ticker: Ticker,
    ) => {
      const kv = await Deno.openKv("./kv.db");

      const atomic = kv.atomic();
      atomic.set(["price", ticker.symbolId], ticker);
      await atomic.commit();
      console.log(`Ticker change committed for ${ticker.symbolId}`);
    },
  );

  socket.on("reconnect_failed", () => {
    throw new Error(
      "Websocket connection attempts exhausted. Double check client API key, client signature, url, and server health/status",
    );
  });

  socket.on("connect_error", (error) => {
    console.warn(
      `Failed to connect (msg:${error.message}): reconnect...`,
    );
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from depth socket");
  });
};

import { io } from "socket.io-client";
import { getExchangePairsQuery } from "../helpers/kmsApiRequests.ts";
import { SymbolId } from "../types.ts";
import { getKv } from "../kvStore.ts";

export interface Ticker {
  symbolId: SymbolId;
  bidPrice: number;
  askPrice: number;
  exchange: "kms" | "swyftx";
}

const baseUrl = "wss://apip.kinesis.money";
const path = "/notifications/market-analytics/tickers";

export const connectToKmsPricingSocket = async () => {
  const currencies = await getExchangePairsQuery();
  const symbolIds = currencies.map((currency) => currency.currencyPairId);
  const kv = await getKv();

  const socket = io(baseUrl, {
    path,
    query: {
      symbolIds,
    },
    transports: ["websocket"],
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.debug("Connected to pricing socket");
    socket.emit("subscribeToTickers", { symbolIds });
  });

  socket.on(
    "tickerInit",
    (tickers: Record<SymbolId, Omit<Ticker, "exchange">>) => {
      try {
        for (const ticker of Object.values(tickers)) {
          const { askPrice, bidPrice, symbolId } = ticker;
          kv.enqueue({ symbolId, askPrice, bidPrice, exchange: "kms" });
        }

        console.debug("Ticker init committed");
      } catch {
        console.error("database locked");
      }
    },
  );

  socket.on(
    "tickerChange",
    (ticker: Omit<Ticker, "exchange">) => {
      try {
        const { askPrice, bidPrice, symbolId } = ticker;
        kv.enqueue({ symbolId, askPrice, bidPrice, exchange: "kms" });
        console.debug(`Ticker change committed for ${ticker.symbolId}`);
      } catch {
        console.error("database locked");
      }
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

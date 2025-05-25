import { createHmac } from "node:crypto";
import { env } from "./envs.ts";

const BASE_URL = "https://client-api.kinesis.money";

const authHeader = (
  params: { method: string; url: string; data?: string; contentType?: string },
) => {
  const { method, url, data = "", contentType = "" } = params;
  const nonce = Date.now();
  const message = nonce + method + url + data;
  const xsig = createHmac("sha256", env.KMS_API_SECRET_KEY).update(message)
    .digest(
      "hex",
    ).toUpperCase();

  const headers = {
    "X-Nonce": nonce,
    "X-API-key": env.KMS_API_PUBLIC_KEY,
    "X-Signature": xsig,
  } as Record<string, string | number>;

  if (contentType !== "no") {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const kmsFetch = async (
  url: string,
  options?: Omit<RequestInit, "body"> & { body?: Record<string, unknown> },
) => {
  const { method = "GET", body = {} } = options ?? {};
  const headers = authHeader({
    method,
    url,
    data: body ? JSON.stringify(body) : "",
  });
  const response = await fetch(`${BASE_URL}${url}`, {
    headers,
    method,
    body,
    ...options,
  });
  const data = await response.json();
  return data;
};

interface ExchangePairResponse {
  currencyPairId: string;
  baseCurrency: string;
  quoteCurrency: string;
  baseDecimals: number;
  quoteDecimals: number;
}

export const getExchangePairsQuery = async (): Promise<
  ExchangePairResponse[]
> => {
  return await kmsFetch("/v1/exchange/pairs");
};

interface Depth {
  amount: number;
  price: number;
}

interface DepthResponse {
  currencyPairId: string;
  depthItems: {
    bid: Depth[];
    ask: Depth[];
  };
}

export const getExchangeDepthBySymbolQuery = async (
  symbolId: string,
): Promise<DepthResponse> => {
  return await kmsFetch(`/v1/exchange/depth/${symbolId}`);
};

export const getBalanceQuery = async (): Promise<
  { available: number; allocatedOnExchange: number }
> => {
  return await kmsFetch("/v1/exchange/holdings");
};

interface OrderRequest {
  currencyPairId: string;
  direction: "buy" | "sell";
  orderType: "limit" | "market";
  amount: number;
  clientOrderId?: string;
  limitPrice?: number;
}

interface OrderResponse {
  id: string;
  clientOrderId: string;
  symbolId: string;
  direction: "buy" | "sell";
  amount: number;
  limitPrice?: number;
  createdAt: string;
}

export const placeOrderMutation = async (
  params: OrderRequest,
): Promise<OrderResponse> => {
  const {
    currencyPairId,
    direction,
    orderType,
    amount,
    clientOrderId,
    limitPrice,
  } = params;
  return await kmsFetch("/v1/exchange/orders", {
    method: "POST",
    body: {
      currencyPairId,
      direction,
      orderType,
      amount,
      clientOrderId,
      limitPrice,
    },
  });
};

export const withdrawToMintMutation = async (params: {
  amount: number;
  currencyCode: string;
  memo?: string;
}) => {
  const { amount, currencyCode, memo } = params;
  return await kmsFetch("/v1/exchange/withdrawals/address", {
    method: "POST",
    body: {
      memo,
      currencyCode,
      amount: amount.toString(),
      address: env.MINT_WALLET_ADDRESS,
    },
  });
};

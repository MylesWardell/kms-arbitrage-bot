import { createHmac } from "node:crypto";
import { env } from "./envs.ts";
import {
  Balance,
  DepthResponse,
  ExchangePairResponse,
  OrderRequest,
  OrderResponse,
} from "./types.ts";

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

  const headers = new Headers({
    "X-Nonce": nonce.toString(),
    "X-API-key": env.KMS_API_PUBLIC_KEY,
    "X-Signature": xsig,
  });

  if (contentType !== "no") {
    headers.append("Content-Type", "application/json");
  }

  return headers;
};

const kmsFetch = async (
  url: string,
  options?: Omit<RequestInit, "body"> & { body?: Record<string, unknown> },
) => {
  const { method = "GET", body, ...rest } = options ?? {};
  const bodyString = body ? JSON.stringify(body) : "";
  const headers = authHeader({
    method,
    url,
    data: bodyString,
  });

  const response = await fetch(`${BASE_URL}${url}`, {
    headers,
    method,
    body: body ? bodyString : undefined,
    ...rest,
  });

  try {
    const data = await response.json();
    return data;
  } catch {
    const text = await response.text();
    console.error(text);
    throw new Error(text);
  }
};

export const getExchangePairsQuery = async (): Promise<
  ExchangePairResponse[]
> => {
  return await kmsFetch("/v1/exchange/pairs");
};

export const getExchangeDepthBySymbolQuery = async (
  symbolId: string,
): Promise<DepthResponse> => {
  return await kmsFetch(`/v1/exchange/depth/${symbolId}`);
};

export const getBalanceQuery = async (): Promise<
  Balance
> => {
  return await kmsFetch("/v1/exchange/holdings");
};

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
    },
  });
};

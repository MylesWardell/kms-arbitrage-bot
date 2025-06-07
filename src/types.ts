import { type Decimal } from "decimal.js";

export interface ExchangePairResponse {
  currencyPairId: SymbolId;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  baseDecimals: number;
  quoteDecimals: number;
}

export interface OrderRequest {
  currencyPairId: SymbolId;
  direction: "buy" | "sell";
  orderType: "limit" | "market";
  amount: number;
  limitPrice?: number;
}

export interface OrderResponse {
  id: string;
  clientOrderId: string;
  symbolId: SymbolId;
  direction: "buy" | "sell";
  amount: number;
  limitPrice?: number;
  createdAt: string;
}

export interface Depth {
  amount: number;
  price: number;
}

export interface OrderBook {
  symbolId: SymbolId;
  bid: Depth[];
  ask: Depth[];
}

export interface DepthResponse {
  currencyPairId: SymbolId;
  depthItems: OrderBook;
}

export type Balance = Record<CurrencyCode, BalanceValue>;

export type BalanceValue = {
  available: number;
  allocatedOnExchange: number;
};

export interface Edge {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: Decimal;
  weight: Decimal;
  type: 'buy' | 'sell';
}

export interface ArbitrageOpportunity {
  cycleId: string;
  cycle: CurrencyCode[];
  profit: Decimal;
  cycleEdges: Edge[];
}

export interface Graph {
  vertices: Set<string>;
  edges: Edge[];
}

export type SymbolId = `${CurrencyCode}_${CurrencyCode}`;

export type CurrencyCode =
  | "KAU"
  | "KAG"
  | "USDT"
  | "ADA"
  | "USDC"
  | "BTC"
  | "ETH"
  | "BCH"
  | "DASH"
  | "XRP"
  | "LTC"
  | "AVAX"
  | "DOGE"
  | "USD1"
  | "XDC"
  | "LINK"
  | "UNI"
  | "ATOM"
  | "TRX"
  | "DAI"
  | "ALGO"
  | "MKR"
  | "HBAR"
  | "QNT"
  | "AAVE"
  | "YFI"
  | "ZRX"
  | "BAT"
  | "ARB"
  | "GALA"
  | "LDO"
  | "IMX"
  | "XLM"
  | "OM"
  | "KVT"
  | "POL"
  | "1INCH"
  | "ANKR"
  | "FET"
  | "INJ"
  | "SEI"
  | "S"
  | "USD"
  | "CAD"
  | "CHF"
  | "EUR"
  | "GBP"
  | "AUD"
  | "SGD"
  | "AED";

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
  clientOrderId?: string;
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

export interface DepthItems {
  bid: Depth[];
  ask: Depth[];
}

export interface DepthResponse {
  currencyPairId: SymbolId;
  depthItems: DepthItems;
}

export type Balance = Record<CurrencyCode, BalanceValue>

export type BalanceValue = {
  available: number;
  allocatedOnExchange: number;
}

export type SymbolId = `${CurrencyCode}_${CurrencyCode}`

export type CurrencyCode =
  "KAU" | 
  "KAG" | 
  "USDT" | 
  "ADA" | 
  "USDC" | 
  "BTC" | 
  "ETH" | 
  "BCH" | 
  "DASH" | 
  "XRP" | 
  "LTC" | 
  "AVAX" | 
  "DOGE" | 
  "USD1" | 
  "XDC" | 
  "LINK" | 
  "UNI" | 
  "ATOM" | 
  "TRX" | 
  "DAI" | 
  "ALGO" | 
  "MKR" | 
  "HBAR" | 
  "QNT" | 
  "AAVE" | 
  "YFI" | 
  "ZRX" | 
  "BAT" | 
  "ARB" | 
  "GALA" | 
  "LDO" | 
  "IMX" | 
  "XLM" | 
  "OM" |
  "KVT" | 
  "POL" | 
  "1INCH" | 
  "ANKR" | 
  "FET" | 
  "INJ" | 
  "SEI" | 
  "S" |
  "USD" | 
  "CAD" | 
  "CHF" | 
  "EUR" | 
  "GBP" | 
  "AUD" | 
  "SGD" | 
  "AED"

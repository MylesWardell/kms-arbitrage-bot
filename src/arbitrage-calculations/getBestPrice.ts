import { Decimal } from "decimal.js";
import { CurrencyCode, SymbolId } from "../types.ts";
import { getNull } from "../kvStore.ts";
import { calculatePrice } from "./depthCalculator.ts";
import symbols from "../mock-data/symbols.json" with { type: "json" };
import { Ticker } from "../update-kv/depth-socket.ts";

const symbolMap = new Map<SymbolId, CurrencyCode>();
export const isFeeBase = (id: SymbolId) => {
  if (symbolMap.size > 0) {
    return symbolMap.get(id);
  }

  for (const symbol of symbols) {
    symbolMap.set(symbol.id as SymbolId, symbol.fee as CurrencyCode);
  }

  return symbolMap.get(id);
};

export const EXCHANGE_FEE = new Decimal(0.0022);

export const getBestPrice = async (
  params: {
    from: CurrencyCode;
    to: CurrencyCode;
    pay: Decimal;
  },
): Promise<
  {
    type: "buy" | "sell";
    price: Decimal;
    pay: Decimal;
    receive: Decimal;
    amount: Decimal;
    total: Decimal;
    rateAdjusted: Decimal;
  }
> => {
  const { from, to, pay } = params;

  const [real, inverse] = await Promise.all([
    getNull<Ticker>(["price", `${to}_${from}`]),
    getNull<Ticker>(["price", `${from}_${to}`]),
  ]);

  const depth = real ?? inverse;
  const book = inverse ? [to, from] : [from, to];
  const type = book[0] === from ? "sell" : "buy";

  const codeDirection = type === "buy"
    ? { pay: to, receive: from }
    : { pay: from, receive: to };
  const feeCode = isFeeBase(`${from}_${to}`);
  const isFeePay = feeCode === codeDirection.pay;

  if (!depth) {
    throw new Error(`No depth found for ${from} -> ${to}`);
  }

  const payAfterFee = isFeePay ? pay.minus(pay.times(EXCHANGE_FEE)) : pay;

  const price = calculatePrice({
    orderBook: {
      symbolId: `${to}_${from}` as SymbolId,
      bid: [{ price: depth.bidPrice, amount: 10000 }],
      ask: [{ price: depth.askPrice, amount: 10000 }],
    },
    amount: payAfterFee,
    type,
  });
  const receive = type === "sell"
    ? price.totalValue
    : new Decimal(payAfterFee).div(price.averagePrice);

  const receiveAfterFee = isFeePay
    ? receive
    : receive.minus(receive.times(EXCHANGE_FEE));

  return {
    type,
    price: price.averagePrice,
    rateAdjusted: receiveAfterFee.div(pay),

    pay,
    receive: receiveAfterFee,

    amount: from === book[0] ? pay : receiveAfterFee,
    total: from === book[1] ? pay : receiveAfterFee,
  };
};

import { Decimal } from "decimal.js";
import { CurrencyCode, SymbolId } from "../types.ts";
import { getKv, getNull } from "../kvStore.ts";
import { calculatePrice } from "./depthCalculator.ts";
import symbols from "../mock-data/symbols.json" with { type: "json" };
import { Ticker } from "../update-kv/kmsPricingSocket.ts";

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
    exchange: 'kms' | 'swyftx';
  }
> => {
  const { from, to, pay } = params;

  const kv = await getKv()
  const [kmsReal, kmsInverse, swyftxReal, swyftxInverse] = await kv.getMany<[Ticker, Ticker, Ticker, Ticker]>([
    ["price", `${to}_${from}`, "kms"],
    ["price", `${from}_${to}`, "kms"],
    ["price", `${to}_${from}`, "swyftx"],
    ["price", `${from}_${to}`, "swyftx"],
  ])
  
  if (from === 'XDC' || to === 'XDC') {
    console.log('kmsReal', kmsReal.value)
    console.log('kmsInverse', kmsInverse.value)
    console.log('swyftxReal', swyftxReal.value)
    console.log('swyftxInverse', swyftxInverse.value)
  }
  
  const kmsPrice = kmsReal.value ?? kmsInverse.value

  if (!kmsPrice) {
    throw new Error(`No depth found for ${from} -> ${to}`);
  }

  const swyftxPrice = swyftxReal.value ?? swyftxInverse.value;
  const bestPrice = {...kmsPrice, bidExchange: 'kms', askExchange: 'kms'} as {
    bidPrice: number;
    askPrice: number;
    bidExchange: 'kms' | 'swyftx';
    askExchange: 'kms' | 'swyftx';
  }
  let inverse = !!kmsInverse

  if (swyftxPrice && swyftxPrice.askPrice && swyftxPrice.bidPrice) {
    const askBetter = new Decimal(kmsPrice.askPrice).gt(new Decimal(swyftxPrice.askPrice))
    const bidBetter = new Decimal(kmsPrice.bidPrice).lt(new Decimal(swyftxPrice.bidPrice))
    if (askBetter) {
      bestPrice.askPrice = swyftxPrice.askPrice
      bestPrice.askExchange = 'swyftx'
    }
    if (bidBetter) {
      bestPrice.bidPrice = swyftxPrice.bidPrice
      bestPrice.bidExchange = 'swyftx'
    }
  }
    
  const book = inverse ? [to, from] : [from, to];
  const type = book[0] === from ? "sell" : "buy";
  const codeDirection = type === "buy"
    ? { pay: to, receive: from }
    : { pay: from, receive: to };
  const feeCode = isFeeBase(`${from}_${to}`);
  const isFeePay = feeCode === codeDirection.pay;

  if (!bestPrice) {
    throw new Error(`No depth found for ${from} -> ${to}`);
  }

  const payAfterFee = isFeePay ? pay.minus(pay.times(EXCHANGE_FEE)) : pay;

  const price = calculatePrice({
    orderBook: {
      symbolId: `${to}_${from}` as SymbolId,
      bid: [{ price: bestPrice.bidPrice, amount: 10000 }],
      ask: [{ price: bestPrice.askPrice, amount: 10000 }],
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
    exchange: type === 'buy' ? bestPrice.askExchange : bestPrice.bidExchange,

    pay,
    receive: receiveAfterFee,

    amount: from === book[0] ? pay : receiveAfterFee,
    total: from === book[1] ? pay : receiveAfterFee,
  };
};

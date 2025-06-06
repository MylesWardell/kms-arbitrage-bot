import { ArbitrageResult } from "./bellman-ford-algorithm.ts";
import { calculatePrice } from "./depth-calculator.ts";
import { getKvNull } from "./kvStore.ts";
import { Balance, CurrencyCode, OrderBook } from "./types.ts";
import mockBalance from "./mock-balance.json" with { type: "json" };

const EXCHANGE_FEE = 0.0022;

const getBestPrice = async (
  params: {
    from: CurrencyCode;
    to: CurrencyCode;
    pay: number;
  },
): Promise<{type: 'buy' | 'sell', price: number, pay: number, receive: number, amount: number, total: number}> => {
  const { from, to, pay } = params;

  const [real, inverse] = await Promise.all([
    getKvNull<OrderBook>([to, from]),
    getKvNull<OrderBook>([from, to]),
  ]);

  const depth = real ?? inverse;
  console.log(!!inverse)
  const book = inverse ? [from, to] : [to, from];
  const type = book[0] === from ? 'buy' : 'sell'

  if (!depth) {
    throw new Error(`No depth found for ${from} -> ${to}`);
  }

  const price = calculatePrice({ orderBook: depth, amount: pay, type })
  const receive = type === 'sell' ? price.totalValue : pay / price.averagePrice
  const fee = receive * EXCHANGE_FEE;
  const receiveAfterFee = receive - fee;


  return {
    type,
    price: price.averagePrice,
    pay,
    receive: receiveAfterFee,
    amount: from === book[1] ? pay : receiveAfterFee,
    total: from === book[0] ? pay : receiveAfterFee,
  }
};


const actionArbitrage = async (result: ArbitrageResult) => {
  if (!result.hasArbitrage || !result.path) {
    return "No arbitrage opportunity detected.";
  }


  let tempBalance = {
    ...mockBalance,
    [result.path[0]]: { available: 10, allocatedOnExchange: 0 },
  } as Balance;
  let pay = tempBalance[result.path[0]].available;

  for (let i = 0; i < result.path.length - 1; i++) {
    const from = result.path[i];
    const to = result.path[i + 1];

    const {price, type, receive, total, amount} = await getBestPrice({
      from,
      to,
      pay,
    });
    const balance = tempBalance[from].available;

    // const order = await placeOrderMutation({
    //   currencyPairId: `${baseCode}_${quoteCode}`,
    //   direction: type,
    //   orderType: 'market',
    //   amount,
    // })


    const newBalance = balance - pay;
    tempBalance[from] = { available: newBalance, allocatedOnExchange: 0 };
    tempBalance[to] = {
      available: tempBalance[to].available + receive,
      allocatedOnExchange: 0,
    };

    console.log({
      type,
      path: `${from} -> ${to}`,
      price,
      order: {
        amount,
        price,
        total,
        symbolId: `${from}_${to}`,
      },
      other: {
        pay: `${pay} ${from}`,
        receive: `${receive} ${to}`,
      },
      balance: tempBalance[to].available,
    });

    pay = receive;
  }
};

export default actionArbitrage;

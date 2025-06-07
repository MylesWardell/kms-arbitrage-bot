import { ArbitrageOpportunity, Balance } from "../types.ts";
import mockBalance from "../mock-data/mock-balance.json" with { type: "json" };
import { Decimal } from "decimal.js";
import { getBestPrice } from "../arbitrage-calculations/getBestPrice.ts";
import { detectArbitrageOpportunities } from "../arbitrage-calculations/index.ts";
import { getKv } from "../kvStore.ts";

export const testArbitrage = async (arbitrage: ArbitrageOpportunity) => {
  const { cycleEdges, cycleId } = arbitrage;
  const cycleStart = cycleEdges[0];
  const kv = await getKv();
  const orderId = crypto.randomUUID()

  const saveOpportunity = kv.atomic().set(
    ["opportunity", cycleId, orderId],
    JSON.stringify(arbitrage, null, 2),
  );

  const tempBalance = {
    ...mockBalance,
    [cycleStart.fromCurrency]: { available: 10, allocatedOnExchange: 0 },
  } as Balance;

  // Start with the first edge so you never spend more than available
  let pay = new Decimal(tempBalance[cycleStart.fromCurrency].available);

  for (const edge of cycleEdges) {
    const { fromCurrency, toCurrency, type } = edge;

    const { price, total, amount, receive } = await getBestPrice({
      from: fromCurrency,
      to: toCurrency,
      pay,
    });

    const balance = new Decimal(tempBalance[fromCurrency].available);

    const newBalance = balance.minus(pay);
    tempBalance[fromCurrency] = {
      available: newBalance.toNumber(),
      allocatedOnExchange: 0,
    };
    tempBalance[toCurrency] = {
      available: new Decimal(tempBalance[toCurrency].available).plus(receive)
        .toNumber(),
      allocatedOnExchange: 0,
    };

    const trade = {
      timestamp: Date.now(),
      type,
      path: `${fromCurrency} -> ${toCurrency}`,
      price: price.toString(),
      order: {
        amount: amount.toString(),
        price: price.toString(),
        total: total.toString(),
        symbolId: `${fromCurrency}_${toCurrency}`,
      },
      other: {
        pay: `${pay.toString()} ${fromCurrency}`,
        receive: `${receive.toString()} ${toCurrency}`,
      },
      balance: {
        [fromCurrency]: tempBalance[fromCurrency].available,
        [toCurrency]: tempBalance[toCurrency].available,
      },
    };

    saveOpportunity.set(["trade", cycleId, orderId, trade.path], trade);
    console.log("arbitrage found with id", cycleId);
    pay = receive;
  }

  await saveOpportunity.commit();
};

const mockArbitrageTrades = async () => {
  const opportunities = await detectArbitrageOpportunities();

  if (opportunities.length === 0) {
    return console.log("No arbitrage opportunity detected.");
  }

  for (const arbitrage of opportunities) {
    await testArbitrage(arbitrage);
  }
};

export default mockArbitrageTrades;

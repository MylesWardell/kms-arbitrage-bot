import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import mockArbitrageTrades from "./_tests/implementMockArbitrage.ts";
import { connectToPricingSocket } from "./update-kv/depth-socket.ts";
import { updateBalance, updateExchangePairs } from "./update-kv/updateFunctions.ts";

console.debug = () => {}

const main = async () => {
  /** Get exchange listing and config */
  await updateExchangePairs()
  await updateBalance()

  /** Connect to Pricing socket and push changes */
  await connectToPricingSocket()

  while (true) {
    await mockArbitrageTrades()
    await sleep(5)
  }
};

if (import.meta.main) {
  main();
}

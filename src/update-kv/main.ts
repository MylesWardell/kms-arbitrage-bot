import { updateBalance, updateExchangePairs } from "./updateFunctions.ts";
import { connectToDepthSocket } from "./depth-socket.ts";

const main = async () => {
  // await updateExchangePairs()
  // await updateBalance()
  await connectToDepthSocket()
}

if (import.meta.main) {
  main();
}

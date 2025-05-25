import { getBalanceQuery } from "./kms_requests.ts";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const balance = await getBalanceQuery();
  console.log(balance);
}

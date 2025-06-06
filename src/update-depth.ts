import { sleep } from "https://deno.land/x/sleep@v1.3.0/sleep.ts";
import { updateDepth } from "./updater.ts";

const main = async () => {
  while (true) {
    await updateDepth()
    await sleep(1000)
  }
}

if (import.meta.main) {
  main();
}

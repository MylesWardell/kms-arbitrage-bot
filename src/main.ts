import mockArbitrageTrades from "./_tests/implementMockArbitrage.ts";

const main = () => {
  setInterval(async () => {
    await mockArbitrageTrades()
  }, 5000)
};

if (import.meta.main) {
  main();
}

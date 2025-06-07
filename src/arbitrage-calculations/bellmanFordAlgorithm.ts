import { Decimal } from "decimal.js";
import { Graph, Edge, CurrencyCode } from "../types.ts";

/**
 * Detects arbitrage opportunities using the Bellman-Ford algorithm
 * @param graph - Graph containing vertices (currencies) and edges (exchange rates)
 * @param source - Source currency to start the algorithm from
 * @returns Array of distances (logarithmic exchange rates) and array of predecessors for path reconstruction
 */
export function bellmanFord(graph: Graph, source: CurrencyCode): { 
  distances: Map<CurrencyCode, Decimal>,
  predecessors: Map<CurrencyCode, CurrencyCode | null>,
  negativeCycle: CurrencyCode[] | null
} {
  const { vertices, edges } = graph;
  const distances = new Map<CurrencyCode, Decimal>();
  const predecessors = new Map<CurrencyCode, CurrencyCode | null>();
  
  // Initialize distances and predecessors
  for (const vertex of vertices) {
    distances.set(vertex as CurrencyCode, new Decimal(Infinity));
    predecessors.set(vertex as CurrencyCode, null);
  }

  distances.set(source, new Decimal(0));

  // Relax edges |V| - 1 times
  const numVertices = vertices.size;
  for (let i = 0; i < numVertices - 1; i++) {
    for (const { fromCurrency, toCurrency, weight } of edges) {
      const fromDistance = distances.get(fromCurrency);
      const toDistance = distances.get(toCurrency);

      if (!fromDistance || !toDistance) {
        throw new Error("Distance not found");
      }
      
      if (fromDistance.isFinite() && fromDistance.plus(weight).lt(toDistance)) {
        distances.set(toCurrency, fromDistance.plus(weight));
        predecessors.set(toCurrency, fromCurrency);
      }
    }
  }
  
  // Check for negative cycles (arbitrage opportunities)
  let negativeCycle: CurrencyCode[] | null = null;
  
  for (const { fromCurrency, toCurrency, weight } of edges) {
    const fromDistance = distances.get(fromCurrency);
    const toDistance = distances.get(toCurrency);

    if (!fromDistance || !toDistance) {
      throw new Error("Distance not found");
    }
    
    if (fromDistance.isFinite() && fromDistance.plus(weight).lt(toDistance)) {
      // Found a negative cycle, reconstruct it
      negativeCycle = [];
      let current = toCurrency;
      const visited = new Set<CurrencyCode>();
      
      // First, walk back to find a vertex in the cycle
      while (current && !visited.has(current)) {
        visited.add(current);
        current = predecessors.get(current)!;
      }
      
      if (current) {
        // Found a vertex in the cycle, now reconstruct the cycle
        const cycleStart = current;
        const cyclePath: CurrencyCode[] = [cycleStart];
        current = predecessors.get(current)!;
        
        while (current !== cycleStart) {
          cyclePath.push(current);
          current = predecessors.get(current)!;
        }
        
        cyclePath.push(cycleStart); // Complete the cycle
        negativeCycle = cyclePath.reverse();
      }
      
      break;
    }
  }
  
  return { distances, predecessors, negativeCycle };
}

/**
 * Calculates the arbitrage profit ratio from a detected negative cycle
 * @param cycle - Array of currencies forming a cycle
 * @param edges - Exchange rate edges
 * @returns The profit ratio from completing the cycle (1.05 = 5% profit)
 */
export function calculateArbitrageProfit(cycle: string[], edges: Edge[]): {profit: Decimal, cycleEdges: Edge[]} {
  let profit = new Decimal(1);
  const cycleEdges: Edge[] = []
  
  for (let i = 0; i < cycle.length - 1; i++) {
    const from = cycle[i];
    const to = cycle[i + 1];
    
    // Find the exchange rate for this currency pair
    const edge = edges.find(e => e.fromCurrency === from && e.toCurrency === to);

    
    if (!edge) {
      throw new Error(`No exchange rate found from ${from} to ${to}`);
    }

    cycleEdges.push(edge)
    profit = edge.rate.times(profit);
  }
  
  return {profit, cycleEdges}
}

/**
 * Find all arbitrage opportunities in the given currency graph
 * @param graph - Graph containing currencies and exchange rates
 * @returns Array of arbitrage cycles with their profit ratios
 */
export function findNegativeCycles(graph: Graph): Array<{ 
  cycle: CurrencyCode[], 
  profit: Decimal,
  cycleEdges: Edge[]
}> {
  const opportunities: Array<{ cycle: CurrencyCode[], profit: Decimal, cycleId: string, cycleEdges: Edge[] }> = [];
  const processed = new Set<CurrencyCode>();
  
  // Try starting from each currency
  for (const source of graph.vertices) {
    const sourceCurrency = source as CurrencyCode;
    if (processed.has(sourceCurrency)) continue;
    
    const { negativeCycle } = bellmanFord(graph, sourceCurrency);
    
    if (negativeCycle) {
      const cycleId = negativeCycle.join("_");

      if (opportunities.find(o => o.cycleId === cycleId)) {
        continue;
      }
      const {profit, cycleEdges} = calculateArbitrageProfit(negativeCycle, graph.edges);
      opportunities.push({ cycle: negativeCycle, profit, cycleId, cycleEdges });
      
      // Mark all currencies in this cycle as processed to avoid duplicate work
      for (const currency of negativeCycle) {
        processed.add(currency as CurrencyCode);
      }
    }
  }
  
  return opportunities;
}
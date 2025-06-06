import { CurrencyCode, OrderBook } from "./types.ts";
import { getQuoteBaseMap } from "./updater.ts";
import { getKv } from "./kvStore.ts";

// Type definitions for market data and related structures
export type Currency = CurrencyCode;
export type OrderBookEntry = {
  price: number;
  amount: number;
};

export type MarketData = [Currency, Currency, OrderBook];
export interface ExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
};
export interface Graph {
  vertices: Set<Currency>;
  edges: ExchangeRate[];
};
export type DistanceMap = Map<Currency, number>;
export type PredecessorMap = Map<Currency, Currency | null>;
export interface ArbitrageResult {
  hasArbitrage: boolean;
  path: Currency[] | null;
  profitFactor: number;
};

/**
 * Step 2: Convert market data to exchange rates
 * 
 * @param marketDataSet - Array of market data entries
 * @returns Array of exchange rates
 */
async function convertToExchangeRates(): Promise<ExchangeRate[]> {
  const quoteCurrencies = await getQuoteBaseMap()

  const exchangeRates: ExchangeRate[] = []
  for (const quoteCurrency of quoteCurrencies.keys()) {
    const baseCurrencies = quoteCurrencies.get(quoteCurrency)
    if (!baseCurrencies) {
      continue
    }

    for (const baseCurrency of baseCurrencies) {
      const depth = await getKv<OrderBook>([quoteCurrency, baseCurrency])

      if (!depth) {
        continue
      }

      exchangeRates.push({
        fromCurrency: baseCurrency as CurrencyCode,
        toCurrency: quoteCurrency as CurrencyCode,
        rate: depth.ask[0].price
      })

      exchangeRates.push({
        fromCurrency: quoteCurrency as CurrencyCode,
        toCurrency: baseCurrency as CurrencyCode,
        rate: 1 / depth.ask[0].price
      })
    }
  }
  
  
  return exchangeRates;
}

/**
 * Step 3: Create a graph from currencies and exchange rates
 * 
 * @param currencies - Set of all currencies
 * @param exchangeRates - Array of exchange rates
 * @returns Graph representation
 */
async function createGraph(exchangeRates: ExchangeRate[]): Promise<Graph> {
  const baseCurrencies = await getKv<Currency[]>(['base-currencies'])
  const quoteCurrencies = await getKv<Currency[]>(['quote-currencies'])

  if (!baseCurrencies || !quoteCurrencies) {
    throw new Error('No currencies found')
  }

  return {
    vertices: new Set([...baseCurrencies, ...quoteCurrencies]),
    edges: exchangeRates
  };
}

/**
 * Step 4: Convert exchange rates to negative log values for Bellman-Ford
 * 
 * @param graph - Graph with currencies and exchange rates
 * @returns New graph with transformed edge weights
 */
function transformGraphForArbitrage(graph: Graph): Graph {
  const transformedEdges = graph.edges.map(edge => ({
    fromCurrency: edge.fromCurrency,
    toCurrency: edge.toCurrency,
    rate: -Math.log(edge.rate) // Convert to negative log for Bellman-Ford
  }));
  
  return {
    vertices: graph.vertices,
    edges: transformedEdges
  };
}

/**
 * Step 5: Initialize distances from source to all currencies
 * 
 * @param graph - Graph representation with currencies and exchange rates
 * @param source - Source currency to find shortest paths from
 * @returns Map of distances from source to each currency
 */
function initializeDistances(graph: Graph, source: Currency): DistanceMap {
  const distances: DistanceMap = new Map();
  
  // Set distance from source to all vertices as infinity
  for (const currency of graph.vertices) {
    distances.set(currency, Infinity);
  }
  
  // Set distance from source to itself as 0
  distances.set(source, 0);
  
  return distances;
}

/**
 * Step 6: Initialize predecessors for path reconstruction
 * 
 * @param graph - Graph representation with currencies and exchange rates
 * @returns Map mapping each currency to its predecessor in the path
 */
function initializePredecessors(graph: Graph): PredecessorMap {
  const predecessors: PredecessorMap = new Map();
  
  // Set predecessor of each currency to null
  for (const currency of graph.vertices) {
    predecessors.set(currency, null);
  }
  
  return predecessors;
}

/**
 * Step 7: Relax edges |V| - 1 times
 * 
 * @param graph - Graph representation with currencies and exchange rates
 * @param distances - Map of current shortest distances
 * @param predecessors - Map of predecessors for path reconstruction
 * @returns Updated distances and predecessors maps
 */
function relaxEdges(
  graph: Graph,
  distances: DistanceMap,
  predecessors: PredecessorMap
): [DistanceMap, PredecessorMap] {
  const numVertices = graph.vertices.size;
  
  // Relax all edges |V| - 1 times
  for (let i = 0; i < numVertices - 1; i++) {
    // For each edge in the graph
    for (const edge of graph.edges) {
      const { fromCurrency, toCurrency, rate } = edge;
      const fromDistance = distances.get(fromCurrency);
      const toDistance = distances.get(toCurrency);
      
      // If we can find a shorter path
      if (fromDistance !== Infinity && 
          fromDistance! + rate < toDistance!) {
        // Update distance
        distances.set(toCurrency, fromDistance! + rate);
        // Set predecessor
        predecessors.set(toCurrency, fromCurrency);
      }
    }
  }
  
  return [distances, predecessors];
}

/**
 * Step 8: Find negative weight cycle (arbitrage opportunity)
 * 
 * @param graph - Graph representation with currencies and exchange rates
 * @param distances - Map of current shortest distances
 * @param predecessors - Map of predecessors
 * @returns Object with arbitrage cycle and profit factor
 */
function findArbitrageOpportunity(
  graph: Graph,
  distances: DistanceMap,
  predecessors: PredecessorMap
): ArbitrageResult {
  // Check for negative cycles
  for (const edge of graph.edges) {
    const { fromCurrency, toCurrency, rate } = edge;
    const fromDistance = distances.get(fromCurrency);
    const toDistance = distances.get(toCurrency);
    
    // If we can still relax the edge, then there is a negative weight cycle
    if (fromDistance !== Infinity && 
        fromDistance! + rate < toDistance!) {
      
      // Arbitrage detected! Find the cycle
      const visited = new Set<Currency>();
      let current = toCurrency;
      
      // Go back a few steps to ensure we're inside the cycle
      for (let i = 0; i < graph.vertices.size; i++) {
        current = predecessors.get(current)!;
      }
      
      // Now trace the cycle
      const cycle: Currency[] = [];
      const startCurrency = current;
      
      do {
        cycle.push(current);
        visited.add(current);
        current = predecessors.get(current)!;
      } while (current !== startCurrency);
      
      // Add the start currency to complete the cycle
      cycle.push(startCurrency);
      
      // Reverse to get the correct order
      cycle.reverse();
      
      // Calculate profit factor (convert from log space back to linear)
      const profitFactor = Math.exp(-calculateCycleWeight(cycle, graph.edges));
      
      return {
        hasArbitrage: true,
        path: cycle,
        profitFactor: profitFactor
      };
    }
  }
  
  return {
    hasArbitrage: false,
    path: null,
    profitFactor: 1
  };
}

/**
 * Helper function to calculate the weight of a cycle
 * 
 * @param cycle - Array of currencies forming a cycle
 * @param edges - Array of exchange rate edges
 * @returns Total weight of the cycle
 */
function calculateCycleWeight(cycle: Currency[], edges: ExchangeRate[]): number {
  let totalWeight = 0;
  
  for (let i = 0; i < cycle.length - 1; i++) {
    const fromCurrency = cycle[i];
    const toCurrency = cycle[i + 1];
    
    // Find the edge between these currencies
    const edge = edges.find(e => 
      e.fromCurrency === fromCurrency && e.toCurrency === toCurrency
    );
    
    if (edge) {
      totalWeight += edge.rate;
    }
  }
  
  return totalWeight;
}

/**
 * Main function: Detect arbitrage opportunities in market data
 * 
 * @param marketDataSet - Array of market data entries
 * @param startCurrency - Currency to start the search from
 * @returns Arbitrage result with path and profit factor
 */
export async function detectArbitrage(
  startCurrency: Currency
): Promise<ArbitrageResult> {
  // Step 2: Convert market data to exchange rates
  const exchangeRates = await convertToExchangeRates();
  
  // Step 3: Create a graph
  const graph = await createGraph(exchangeRates);
  
  // Step 4: Transform graph for arbitrage detection
  const transformedGraph = transformGraphForArbitrage(graph);
  
  // Step 5: Initialize distances
  const distances = initializeDistances(transformedGraph, startCurrency);
  
  // Step 6: Initialize predecessors
  const predecessors = initializePredecessors(transformedGraph);
  
  // Step 7: Relax edges
  const [updatedDistances, updatedPredecessors] = relaxEdges(
    transformedGraph,
    distances,
    predecessors
  );
  
  // Step 8: Find arbitrage opportunities
  return await findArbitrageOpportunity(
    transformedGraph,
    updatedDistances,
    updatedPredecessors
  );
}




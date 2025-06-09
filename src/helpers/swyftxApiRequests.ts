import { CurrencyCode } from "../types.ts";

Deno.test('getPricingData', async () => {
  const value = await getLiveRate({base: 'BTC', quote: 'ETH', side: 'ask', resolution: '1m'})
  console.log(value)
})

const swyftxFetch = async <T>(path: string) => {
  const url = `https://api.swyftx.com.au/${path}`

  const response = await fetch(url, {
    method: 'GET',
  })
  const data = await response.json()

  return data as T
}

interface LiveRate {
  time: number
  open: string
  high: string
  low: string
  close: string
  volume: number
}

export const getLiveRate = async (params: {base: CurrencyCode, quote: CurrencyCode, side: 'ask' | 'bid', resolution: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'}) => {
  const { base, quote, side, resolution } = params
  const response = await swyftxFetch<LiveRate>(`charts/getLatestBar/${base}/${quote}/${side}?resolution=${resolution}`)
  return response.close
}

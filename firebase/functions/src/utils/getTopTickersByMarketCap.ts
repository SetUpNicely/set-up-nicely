// 📁 /firebase/functions/src/utils/getTopTickersByMarketCap.ts

export async function getTopTickersByMarketCap(): Promise<string[]> {
  // For testing: hardcoded top 5 large-cap stocks
  return ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA'];
}

export interface CandleData {
    symbol: string;
    timestamp: number; // UNIX epoch in ms
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  export default CandleData
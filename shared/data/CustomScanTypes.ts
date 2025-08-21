import { Timeframe } from './Timeframe';

export interface CustomScanDefinition {
  id: string;
  name: string;
  timeframe: Timeframe;
  logic: Record<string, any>;
  direction?: 'bullish' | 'bearish';
}

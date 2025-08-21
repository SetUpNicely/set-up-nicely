// 📁 Location: /src/data/timeframeOptions.ts

export interface TimeframeOption {
  label: string;
  value: string;
  interval: string;
  description: string;
}

const timeframeOptions: TimeframeOption[] = [
  {
    label: '1 Minute',
    value: '1m',
    interval: '1',
    description: 'High-frequency intraday trading; fast-paced scalping strategies.'
  },
  {
    label: '5 Minute',
    value: '5m',
    interval: '5',
    description: 'Popular for short-term trades and spotting early breakouts.'
  },
  {
    label: '15 Minute',
    value: '15m',
    interval: '15',
    description: 'Used by active intraday traders to confirm patterns and volume.'
  },
  {
    label: '30 Minute',
    value: '30m',
    interval: '30',
    description: 'Balances signal reliability with responsiveness; great for day trading.'
  },
  {
    label: '1 Hour',
    value: '1h',
    interval: '60',
    description: 'Short swing trades; reflects half-day trends and overnight prep.'
  },
  {
    label: '4 Hour',
    value: '4h',
    interval: '240',
    description: 'Powerful for overnight setups and early multi-day trend signals.'
  },
  {
    label: 'Daily',
    value: '1d',
    interval: 'D',
    description: 'Most reliable timeframe for swing trades and macro patterns.'
  },
  {
    label: 'Weekly',
    value: '1w',
    interval: 'W',
    description: 'Used for long-term trend confirmation and strategy bias.'
  },
  {
    label: 'Monthly',
    value: '1M',
    interval: 'M',
    description: 'Best for long-term investors and PVS stability research.'
  }
];

export default timeframeOptions;

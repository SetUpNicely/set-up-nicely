// 📁 Location: /src/data/pvsScaleInfo.ts

const pvsScaleInfo = [
  {
    range: '80 – 100',
    label: 'Very Strong',
    description: 'This setup has consistently shown high accuracy and performance in past market conditions. Considered highly reliable.',
    color: 'bg-green-600'
  },
  {
    range: '60 – 79',
    label: 'Strong',
    description: 'This setup performs well in most scenarios and shows good historical predictive power. Solid option to consider.',
    color: 'bg-yellow-600'
  },
  {
    range: '40 – 59',
    label: 'Moderate',
    description: 'This setup is hit-or-miss. Results vary by sector or market conditions. Use with confirmation.',
    color: 'bg-orange-500'
  },
  {
    range: '0 – 39',
    label: 'Weak',
    description: 'This setup has underperformed historically or triggered too many false signals. Use caution or avoid.',
    color: 'bg-red-600'
  }
];

export default pvsScaleInfo;

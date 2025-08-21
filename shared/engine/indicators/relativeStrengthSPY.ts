export function calculateRelativeStrengthSPY(
    stockReturns: number[],
    spyReturns: number[],
    index: number
  ): boolean {
    const stock = stockReturns[index];
    const spy = spyReturns[index];
    return stock > spy;
  }
  

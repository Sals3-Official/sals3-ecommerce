export type Money = {
  amountMinor: number;
  currency: 'PHP';
};

export function peso(amountMinor: number): Money {
  return { amountMinor, currency: 'PHP' };
}

export function formatMoney(money: Money): string {
  const majorUnits = money.amountMinor / 100;
  const formatted = majorUnits.toLocaleString('en-PH', {
    minimumFractionDigits: majorUnits % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

export function percentOff(
  oldAmountMinor: number,
  newAmountMinor: number,
): string {
  const off = Math.round((1 - newAmountMinor / oldAmountMinor) * 100);
  return `-${off}%`;
}

export function multiplyMoney(money: Money, factor: number): Money {
  return peso(Math.round(money.amountMinor * factor));
}

export function sumMoney(moneys: Money[]): Money {
  return peso(moneys.reduce((total, money) => total + money.amountMinor, 0));
}

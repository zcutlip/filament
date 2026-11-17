/** Formatting from spec 01 §1. */

const grouped = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const money = new Intl.NumberFormat("en-US", {
  useGrouping: true,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fixedFormatters = new Map<number, Intl.NumberFormat>();

/** `toFixed` from spec 01 §1.3: fixed-point, no grouping, `decimals` fraction digits. */
function fixed(value: number, decimals: number): string {
  let formatter = fixedFormatters.get(decimals);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat("en-US", {
      useGrouping: false,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedFormatters.set(decimals, formatter);
  }
  return formatter.format(value);
}

/** Spec 01 §1.1, 01-D11: en-US grouping, up to 3 fraction digits, no trailing zeros. */
export function fmtGrouped(value: number): string {
  const text = grouped.format(value);
  return text === "-0" ? "0" : text;
}

/** Spec 01 §1.2: en-US grouping, exactly 2 fraction digits. */
export function fmtMoney(value: number): string {
  const text = money.format(value);
  return text === "-0.00" ? "0.00" : text;
}

const TIERS: ReadonlyArray<readonly [number, string]> = [
  [1e51, "sexdecillion"],
  [1e48, "quindecillion"],
  [1e45, "quattuordecillion"],
  [1e42, "tredecillion"],
  [1e39, "duodecillion"],
  [1e36, "undecillion"],
  [1e33, "decillion"],
  [1e30, "nonillion"],
  [1e27, "octillion"],
  [1e24, "septillion"],
  [1e21, "sextillion"],
  [1e18, "quintillion"],
  [1e15, "quadrillion"],
  [1e12, "trillion"],
  [1e9, "billion"],
  [1e6, "million"],
  [1e3, "thousand"],
];

/** Spec 01 §1.3, 01-D7, 01-D8. */
export function numberCruncher(value: number, decimals = 2): string {
  for (const [scale, word] of TIERS) {
    if (value >= scale) {
      return `${fixed(value / scale, decimals)} ${word}`;
    }
  }
  return String(Math.round(value));
}

/** Spec 01 §1.4. */
export function timeCruncher(ticks: number): string {
  const seconds = ticks / 100;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor((seconds % 3600) % 60);

  const hoursText = hours > 0 ? `${hours}${hours === 1 ? " hour " : " hours "}` : "";
  const minutesText = minutes > 0 ? `${minutes}${minutes === 1 ? " minute " : " minutes "}` : "";
  const secondsText = secs > 0 ? `${secs}${secs === 1 ? " second" : " seconds"}` : "";

  return hoursText + minutesText + secondsText;
}

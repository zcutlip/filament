import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { fmtGrouped, fmtMoney, numberCruncher, timeCruncher } from "../../src/core/format";

function addCases(
  cases: ReadonlyArray<readonly [number, string]>,
  format: (value: number) => string,
): void {
  for (const [value, expected] of cases) {
    test(`formats ${value} as ${JSON.stringify(expected)}`, () => {
      expect(format(value)).toBe(expected);
    });
  }
}

describe("01 §1.1 fmtGrouped", () => {
  addCases(
    [
      [1234.5, "1,234.5"],
      [0.0105, "0.011"],
      [1000000, "1,000,000"],
      [0, "0"],
      [1, "1"],
      [999, "999"],
      [1000, "1,000"],
      [-1000, "-1,000"],
      [1234, "1,234"],
      [1.5, "1.5"],
      [1.1, "1.1"],
      [1.125, "1.125"],
      // Exactly representable ties, rounded half away from zero.
      [0.0625, "0.063"],
      [-0.0625, "-0.063"],
      [0.1875, "0.188"],
      [1.0625, "1.063"],
      // No trailing zeros after rounding to at most 3 fraction digits.
      [0.0004, "0"],
      [1.0004, "1"],
      [999.9999, "1,000"],
      [-1234567.125, "-1,234,567.125"],
      [0.1, "0.1"],
    ],
    fmtGrouped,
  );
});

describe("01 §1.2 fmtMoney", () => {
  addCases(
    [
      [1234.5, "1,234.50"],
      [0, "0.00"],
      [1, "1.00"],
      [1.2, "1.20"],
      [1000000, "1,000,000.00"],
      [-1234.5, "-1,234.50"],
      // Exactly representable ties, rounded half away from zero.
      [0.125, "0.13"],
      [-0.125, "-0.13"],
      [1.375, "1.38"],
      [1.374, "1.37"],
      [1.376, "1.38"],
      [999.999, "1,000.00"],
    ],
    fmtMoney,
  );
});

describe("01 §1.3 numberCruncher", () => {
  addCases(
    [
      [1500, "1.50 thousand"],
      [999.4, "999"],
      [999.5, "1000"],
      [999.99, "1000"],
      [999999, "1000.00 thousand"],
      [-1500, "-1500"],
      [-999.6, "-1000"],
      [0, "0"],
      [999, "999"],
      [1e3, "1.00 thousand"],
      [1e6, "1.00 million"],
      [1e9, "1.00 billion"],
      [1e12, "1.00 trillion"],
      [1e15, "1.00 quadrillion"],
      [1e18, "1.00 quintillion"],
      [1e21, "1.00 sextillion"],
      [1e24, "1.00 septillion"],
      [1e27, "1.00 octillion"],
      [1e30, "1.00 nonillion"],
      [1e33, "1.00 decillion"],
      [1e36, "1.00 undecillion"],
      [1e39, "1.00 duodecillion"],
      [1e42, "1.00 tredecillion"],
      [1e45, "1.00 quattuordecillion"],
      [1e48, "1.00 quindecillion"],
      [1e51, "1.00 sexdecillion"],
      [3e55, "30000.00 sexdecillion"],
    ],
    numberCruncher,
  );

  test("uses the requested number of decimals above the threshold", () => {
    expect(numberCruncher(1500, 0)).toBe("2 thousand");
    expect(numberCruncher(2500, 0)).toBe("3 thousand");
    expect(numberCruncher(1234, 3)).toBe("1.234 thousand");
    expect(numberCruncher(1e3, 3)).toBe("1.000 thousand");
    expect(numberCruncher(2.5e9, 1)).toBe("2.5 billion");
  });

  test("ignores the decimals argument below the threshold", () => {
    expect(numberCruncher(999.4, 3)).toBe("999");
    expect(numberCruncher(5, 3)).toBe("5");
  });
});

describe("01 §1.4 timeCruncher", () => {
  addCases(
    [
      [0, ""],
      [99, ""],
      [100, "1 second"],
      [199, "1 second"],
      [200, "2 seconds"],
      // Trailing spaces after hour(s) and minute(s) are part of the format.
      [6000, "1 minute "],
      [6100, "1 minute 1 second"],
      [12000, "2 minutes "],
      [359999, "59 minutes 59 seconds"],
      [360000, "1 hour "],
      [360050, "1 hour "],
      [366100, "1 hour 1 minute 1 second"],
      [372340, "1 hour 2 minutes 3 seconds"],
      [720000, "2 hours "],
      [1000000, "2 hours 46 minutes 40 seconds"],
      [3600000, "10 hours "],
      [8640000, "24 hours "],
    ],
    timeCruncher,
  );
});

describe("01-D11 formatters stay en-US under a German host locale", () => {
  test("fmtGrouped and fmtMoney ignore LANG/LC_ALL", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const script = [
      `import { fmtGrouped, fmtMoney } from ${JSON.stringify(`${root}/src/core/format.ts`)};`,
      "console.log(fmtGrouped(1234.5));",
      "console.log(fmtMoney(1234.5));",
    ].join("\n");
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    env.LANG = "de_DE.UTF-8";
    env.LC_ALL = "de_DE.UTF-8";

    const result = Bun.spawnSync({
      cmd: [process.execPath, "-e", script],
      cwd: root,
      env,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString().trim()).toBe("1,234.5\n1,234.50");
  });
});

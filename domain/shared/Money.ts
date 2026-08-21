export type Currency = "ARS" | "USD";

export type Money = {
  readonly cents: number;
  readonly currency: Currency;
};

const SUPPORTED_CURRENCIES: ReadonlySet<Currency> = new Set(["ARS", "USD"]);

function validateCurrency(currency: string): asserts currency is Currency {
  if (!SUPPORTED_CURRENCIES.has(currency as Currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

function validateCents(cents: number): void {
  if (typeof cents !== "number" || !Number.isFinite(cents)) {
    throw new Error("Money cents must be a finite number");
  }
  if (!Number.isInteger(cents)) {
    throw new Error("Money cents must be an integer");
  }
  if (cents < 0) {
    throw new Error("Money amount cannot be negative");
  }
}

function create(cents: number, currency: Currency = "ARS"): Money {
  validateCurrency(currency);
  validateCents(cents);
  return Object.freeze({
    cents,
    currency,
  });
}

function fromDecimal(amount: number, currency: Currency = "ARS"): Money {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number");
  }
  const cents = Math.round(amount * 100);
  return create(cents, currency);
}

function toDecimal(money: Money): number {
  return money.cents / 100;
}

function format(money: Money): string {
  const amount = money.cents / 100;
  const locale = money.currency === "ARS" ? "es-AR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
  }).format(amount);
}

function ensureSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot operate with different currencies: ${a.currency} and ${b.currency}`,
    );
  }
}

function add(a: Money, b: Money): Money {
  ensureSameCurrency(a, b);
  return create(a.cents + b.cents, a.currency);
}

function subtract(a: Money, b: Money): Money {
  ensureSameCurrency(a, b);
  return create(a.cents - b.cents, a.currency);
}

function percentage(money: Money, percent: number): Money {
  if (typeof percent !== "number" || !Number.isFinite(percent) || percent < 0) {
    throw new Error("Percentage must be a non-negative finite number");
  }
  const resultCents = Math.round((money.cents * percent) / 100);
  return create(resultCents, money.currency);
}

function multiply(money: Money, factor: number): Money {
  if (typeof factor !== "number" || !Number.isFinite(factor) || factor < 0) {
    throw new Error("Factor must be a non-negative finite number");
  }
  const resultCents = Math.round(money.cents * factor);
  return create(resultCents, money.currency);
}

function equals(a: Money, b: Money): boolean {
  return a.cents === b.cents && a.currency === b.currency;
}

function isZero(money: Money): boolean {
  return money.cents === 0;
}

function isPositive(money: Money): boolean {
  return money.cents > 0;
}

function compare(a: Money, b: Money): number {
  ensureSameCurrency(a, b);
  return a.cents - b.cents;
}

export const Money = {
  create,
  fromDecimal,
  toDecimal,
  format,
  add,
  subtract,
  percentage,
  multiply,
  equals,
  isZero,
  isPositive,
  compare,
};

import { CurrencyOption } from '../types';

export const CURRENCIES: CurrencyOption[] = [
  { code: "BDT", name: "Bangladeshi Taka", rate: 1, symbol: "৳" },
  { code: "USD", name: "US Dollar", rate: 0.0085, symbol: "$" },
  { code: "INR", name: "Indian Rupee", rate: 0.71, symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee", rate: 2.36, symbol: "Rs" },
  { code: "LKR", name: "Sri Lankan Rupee", rate: 2.55, symbol: "Rs" },
  { code: "EUR", name: "Euro", rate: 0.0079, symbol: "€" },
  { code: "GBP", name: "British Pound", rate: 0.0067, symbol: "£" },
  { code: "AUD", name: "Australian Dollar", rate: 0.013, symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", rate: 0.012, symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", rate: 0.011, symbol: "S$" },
  { code: "AED", name: "UAE Dirham", rate: 0.031, symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", rate: 0.032, symbol: "ر.س" },
  { code: "MYR", name: "Malaysian Ringgit", rate: 0.04, symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", rate: 0.49, symbol: "₱" },
  { code: "NGN", name: "Nigerian Naira", rate: 11.5, symbol: "₦" }
];

export function formatCurrency(amount: number, currencyCode: string = "BDT"): string {
  const curr = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const converted = amount * curr.rate;
  const formatted = Number.isInteger(converted) ? converted.toString() : converted.toFixed(2);
  return `${curr.symbol}${formatted}`;
}

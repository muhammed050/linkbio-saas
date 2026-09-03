export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
] as const

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code']

export function getCurrencySymbol(currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode)
  return currency?.symbol || currencyCode
}

export function formatPrice(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    const symbol = getCurrencySymbol(currencyCode)
    return `${symbol}${amount.toFixed(2)}`
  }
}

export function formatPriceCompact(amount: number, currencyCode: string = 'USD'): string {
  const symbol = getCurrencySymbol(currencyCode)
  
  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`
  }
  
  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`
  }
  
  return `${symbol}${amount}`
}

export function isSupportedCurrency(currencyCode: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === currencyCode)
}

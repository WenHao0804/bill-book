export const COMMON_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'THB', 'KRW']

export const OTHER_CURRENCY = 'OTHER'

export function currencySelectorOptions(exclude: string[] = []) {
  return [
    ...COMMON_CURRENCIES.filter((c) => !exclude.includes(c)).map((c) => ({ label: c, value: c })),
    { label: '其他', value: OTHER_CURRENCY },
  ]
}

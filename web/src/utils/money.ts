export function formatMoney(amount: number, currency: string): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}${currency} ${Math.abs(amount).toFixed(2)}`
}

export function formatSignedMoney(amount: number, currency: string): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${sign}${currency} ${Math.abs(amount).toFixed(2)}`
}

const PALETTE = [
  '#1677ff',
  '#00b578',
  '#ff8f1f',
  '#ff3141',
  '#8a2be2',
  '#13c2c2',
  '#eb2f96',
  '#faad14',
]

export function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

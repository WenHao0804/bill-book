const KEY = 'bill_book_api_key'

export const getApiKey = () => localStorage.getItem(KEY) || ''

export const setApiKey = (key: string) => localStorage.setItem(KEY, key)

export const clearApiKey = () => localStorage.removeItem(KEY)

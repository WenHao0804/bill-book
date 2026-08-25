import axios from 'axios'
import { clearApiKey, getApiKey } from '../utils/auth'

export class ApiError extends Error {
  code: number

  constructor(code: number, msg: string) {
    super(msg)
    this.code = code
  }
}

const UNAUTHORIZED_CODE = 20102

export const client = axios.create({
  baseURL: '/api/v1',
})

client.interceptors.request.use((config) => {
  const key = getApiKey()
  if (key) config.headers.set('X-Api-Key', key)
  return config
})

function handleUnauthorized() {
  clearApiKey()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

client.interceptors.response.use(
  (response) => {
    const data = response.data as { code: number; msg: string }
    if (data && typeof data.code === 'number' && data.code !== 0) {
      if (data.code === UNAUTHORIZED_CODE) handleUnauthorized()
      return Promise.reject(new ApiError(data.code, data.msg))
    }
    return response
  },
  (error) => {
    if (error.response) {
      const data = error.response.data as { code?: number; msg?: string } | undefined
      if (data?.code === UNAUTHORIZED_CODE) handleUnauthorized()
      if (data?.msg) return Promise.reject(new ApiError(data.code ?? -1, data.msg))
      return Promise.reject(new ApiError(-1, `请求失败（${error.response.status}）`))
    }
    if (error.request) {
      return Promise.reject(new ApiError(-1, '网络连接失败，请检查网络后重试'))
    }
    return Promise.reject(error)
  },
)

export async function post<TResp>(url: string, body?: unknown): Promise<TResp> {
  const resp = await client.post<TResp>(url, body ?? {})
  return resp.data
}

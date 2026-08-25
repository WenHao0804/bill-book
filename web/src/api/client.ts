import axios from 'axios'

export class ApiError extends Error {
  code: number

  constructor(code: number, msg: string) {
    super(msg)
    this.code = code
  }
}

export const client = axios.create({
  baseURL: '/api/v1',
})

client.interceptors.response.use(
  (response) => {
    const data = response.data as { code: number; msg: string }
    if (data && typeof data.code === 'number' && data.code !== 0) {
      return Promise.reject(new ApiError(data.code, data.msg))
    }
    return response
  },
  (error) => {
    if (error.response) {
      const data = error.response.data as { code?: number; msg?: string } | undefined
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

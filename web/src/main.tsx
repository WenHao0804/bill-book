import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toast } from 'antd-mobile'
import './index.css'
import App from './App.tsx'
import { ApiError } from './api/client'

const showApiError = (err: unknown, fallback: string) => {
  Toast.show({ content: err instanceof ApiError ? err.message : fallback })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (err) => showApiError(err, '加载失败，请重试'),
  }),
  mutationCache: new MutationCache({
    onError: (err) => showApiError(err, '操作失败，请重试'),
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toast, unstableSetRender } from 'antd-mobile'
import './index.css'
import App from './App.tsx'
import { ApiError } from './api/client'

// antd-mobile's imperative APIs (Toast.show, Dialog.confirm, ...) render via a
// react-dom import that lacks createRoot/render under React 19; this wires them
// through react-dom/client instead. See https://mobile.ant.design/guide/v5-for-19
unstableSetRender((node, container) => {
  const rootContainer = container as HTMLElement & { _reactRoot?: Root }
  rootContainer._reactRoot ??= createRoot(rootContainer)
  const root = rootContainer._reactRoot
  root.render(node)
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    root.unmount()
  }
})

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

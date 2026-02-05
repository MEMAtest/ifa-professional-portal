// src/app/providers.tsx
'use client'

import { ReactNode, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { installFetchWithCsrf } from '@/lib/api/fetchWithCsrf'
import { initThemePreference } from '@/lib/theme/themePreference'

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
)

// Create a client outside of the component to ensure it's not recreated on every render
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        // Mutation defaults can be set here
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function Providers({ children }: { children: ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const queryClient = getQueryClient()

  useEffect(() => {
    installFetchWithCsrf()
    const cleanupTheme = initThemePreference()
    return () => cleanupTheme()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' &&
        process.env.NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS === 'true' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

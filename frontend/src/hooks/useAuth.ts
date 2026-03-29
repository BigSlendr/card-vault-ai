import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, type User } from '../lib/api'

export const AUTH_KEY = ['me'] as const

export function useAuth() {
  const query = useQuery<User, Error>({
    queryKey: AUTH_KEY,
    queryFn:  () => auth.me(),
    // Don't retry on 401 — an immediate redirect is better than 3 failed attempts.
    retry: false,
    staleTime: 5 * 60_000,
  })

  return {
    user:            query.data ?? null,
    isLoading:       query.isLoading,
    isAuthenticated: !!query.data,
  }
}

/** Call after a successful login to seed the cache without an extra round-trip. */
export function useSetUser() {
  const qc = useQueryClient()
  return (user: User) => qc.setQueryData(AUTH_KEY, user)
}

/** Call on logout to wipe auth state and all cached queries. */
export function useClearAuth() {
  const qc = useQueryClient()
  return () => qc.clear()
}

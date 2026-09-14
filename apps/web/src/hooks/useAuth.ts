import { useEffect, useState } from 'react'
import { ensureSession, supabase } from '@/lib/supabase'

/**
 * Identidade anônima persistente. Substitui o `localStorage.poker_session_*`
 * do app antigo: a cadeira na sala passa a ser encontrada pelo user_id, então
 * reabrir a aba — ou abrir em outra — devolve você ao mesmo lugar.
 */
export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ensureSession()
      .then((session) => {
        if (cancelled) return
        setUserId(session?.user.id ?? null)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return { userId, ready, error }
}

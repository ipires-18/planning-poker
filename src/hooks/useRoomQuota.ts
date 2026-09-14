import { useEffect, useState } from 'react'
import { MAX_OPEN_ROOMS, myActiveRooms } from '@/lib/api'

/**
 * Quantas sessões abertas a pessoa já tem.
 *
 * Serve para avisar antes de ela preencher a sprint inteira e só descobrir o
 * teto no botão de criar. Quem recusa de fato continua sendo o banco.
 */
export function useRoomQuota() {
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void myActiveRooms().then((count) => {
      if (!cancelled) setOpen(count)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const remaining = open === null ? null : Math.max(0, MAX_OPEN_ROOMS - open)

  return {
    open,
    remaining,
    isFull: remaining === 0,
    /** Só vale avisar quando está apertando. */
    shouldWarn: remaining !== null && remaining <= 1,
    max: MAX_OPEN_ROOMS,
  }
}

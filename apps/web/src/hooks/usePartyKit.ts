import { useEffect, useState } from 'react'
import { loadPartyKit, type PartyKit } from '@/lib/teamParty'

/**
 * As fotos do kit ligado na sala, prontas para a festa de consenso.
 *
 * Recarrega quando o kit muda — o host liga ou desliga no meio da sessão e o
 * realtime traz a sala nova para todo mundo.
 */
export function usePartyKit(kit: string | null): PartyKit | null {
  const [loaded, setLoaded] = useState<{ kit: string; party: PartyKit | null } | null>(null)

  useEffect(() => {
    if (!kit) return
    let alive = true
    // Falha ao carregar não é erro de tela: a sala só comemora do jeito neutro.
    loadPartyKit(kit)
      .catch(() => null)
      .then((party) => {
        if (alive) setLoaded({ kit, party })
      })
    return () => {
      alive = false
    }
  }, [kit])

  // Derivado, e não limpo num efeito: desligar o kit some com a festa na hora,
  // sem um render com as fotos do kit anterior.
  return kit && loaded?.kit === kit ? loaded.party : null
}

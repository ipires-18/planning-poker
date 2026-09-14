import { useState } from 'react'
import { Button, Modal } from '../ui'

interface Props {
  open: boolean
  onClose: () => void
  /** Quantas histórias ainda não foram pontuadas. */
  pending: number
  onEnd: (continueLater: boolean) => Promise<void>
}

/**
 * "Encerrar" são duas coisas: a sessão de hoje acabou, e a planning acabou.
 * A planning fica no começo da sprint — quando ela fecha, a sprint começa.
 * Com fila pendente, a primeira é quase sempre a intenção — então ela vem em
 * destaque, e encerrar de vez fica ao lado, sem susto.
 */
export function EndSessionModal({ open, onClose, pending, onEnd }: Props) {
  const [busy, setBusy] = useState(false)

  const finish = async (continueLater: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await onEnd(continueLater)
    } finally {
      setBusy(false)
    }
  }

  if (pending === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Finalizar a planning?">
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            Todas as histórias foram pontuadas — a planning desta sprint está
            completa. A mesa fecha para todo mundo e a sala deixa de aceitar entrada.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>
              Voltar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => void finish(false)}
              disabled={busy}
            >
              {busy ? 'Finalizando...' : 'Finalizar planning'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Parar por hoje?">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          Ainda {pending === 1 ? 'falta' : 'faltam'}{' '}
          <strong className="text-ink">
            {pending} {pending === 1 ? 'história' : 'histórias'}
          </strong>{' '}
          na fila.
        </p>

        <button
          type="button"
          onClick={() => void finish(true)}
          disabled={busy}
          className="w-full cursor-pointer rounded-2xl border-2 border-brand-400 bg-brand-500/10 p-5 text-left transition-all hover:bg-brand-500/15 disabled:opacity-50"
        >
          <span className="block text-sm font-black text-brand-400">
            Continuar em outro dia
          </span>
          <span className="mt-1 block text-xs leading-snug text-ink-muted">
            A pontuação e o histórico ficam guardados. Qualquer pessoa do time volta
            pelo mesmo link, e o PO ou Tech Lead dá o start de onde vocês pararam. A sala
            espera por sete dias.
          </span>
        </button>

        <button
          type="button"
          onClick={() => void finish(false)}
          disabled={busy}
          className="w-full cursor-pointer rounded-2xl border-2 border-hairline bg-[var(--surface-sunken)] p-5 text-left transition-all hover:border-coral/50 disabled:opacity-50"
        >
          <span className="block text-sm font-black text-ink">
            Finalizar a planning assim mesmo
          </span>
          <span className="mt-1 block text-xs leading-snug text-ink-subtle">
            A planning está fechada assim mesmo. O que sobrou na fila fica sem
            pontuação.
          </span>
        </button>

        <Button variant="ghost" className="w-full" onClick={onClose} disabled={busy}>
          Voltar para a mesa
        </Button>
      </div>
    </Modal>
  )
}

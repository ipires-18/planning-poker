import type { ReactNode } from 'react'
import { cn } from '#lib/utils'

/**
 * Recado em bloco: erro de formulário, aviso, confirmação.
 *
 * Vira `role="alert"` quando o tom é crítico — é o que faz o leitor de tela
 * anunciar sozinho que algo deu errado. Nos demais tons fica em silêncio, para
 * não interromper quem está no meio de uma tarefa.
 *
 * Sem filhos, não renderiza nada: dá para escrever `<Note>{erro}</Note>` sem
 * envolver num `&&`.
 */
export interface NoteProps {
  children?: ReactNode
  tone?: 'critical' | 'attention' | 'positive' | 'brand'
  className?: string
}

export function Note({ children, tone = 'critical', className }: NoteProps) {
  if (!children) return null

  return (
    <div
      data-slot="note"
      data-tone={tone}
      role={tone === 'critical' ? 'alert' : undefined}
      className={cn(
        'ds-accent-wash rounded-[var(--radius-control)] border border-(--ds-accent-line)',
        'px-4 py-3 text-body-sm font-bold text-(--ds-accent-ink)',
        className,
      )}
    >
      {children}
    </div>
  )
}

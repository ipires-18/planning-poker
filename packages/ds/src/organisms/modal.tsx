import type { ReactNode } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from '#ui/dialog'
import { cn } from '#lib/utils'

/**
 * O diálogo do produto, sobre o Dialog do registry.
 *
 * O React Aria cuida da parte difícil — foco preso, Escape, `aria-modal`,
 * rolagem do fundo travada. O que sobra aqui é o que é nosso: largura em dois
 * tamanhos, porque painel com tabela dentro não cabe na largura de conversa,
 * e já apareceu na tela com os nomes das pessoas truncados numa letra só.
 *
 * Nada de envolver isto num `DialogOverlay`: o `Dialog` do registry já traz o
 * seu. Dois overlays viram dois portais no `body`, e o de fora — que entra
 * depois no DOM — pinta por cima do painel. Como ele tem `backdrop-filter`,
 * o conteúdo do modal sai borrado junto com o fundo. A cor e o desfoque do
 * fundo moram no tema, em `[data-slot='dialog-overlay']`.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  /** `lg` para painéis com tabela ou formulário longo. */
  size?: 'md' | 'lg'
  children: ReactNode
}) {
  return (
    <DialogTrigger isOpen={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog
        className={cn(
          'w-full rounded-[var(--radius-card)] border border-hairline bg-raised p-7 shadow-[var(--glow)]',
          size === 'lg'
            ? 'max-h-[92vh] max-w-3xl overflow-y-auto sm:max-w-3xl'
            : 'max-w-lg sm:max-w-lg',
        )}
      >
        <DialogHeader className="mb-6">
          <DialogTitle className="text-title font-black text-ink">{title}</DialogTitle>
          {description && <p className="mt-1 text-caption text-ink-subtle">{description}</p>}
        </DialogHeader>
        {children}
      </Dialog>
    </DialogTrigger>
  )
}

import type { ReactNode } from 'react'
import { Label } from '#ui/label'
import { cn } from '#lib/utils'

/**
 * Rótulo, controle e dica, na ordem e com o espaçamento do style guide.
 *
 * Existe porque a alternativa é cada tela repetir a mesma marcação — e foi
 * assim que o projeto teve, ao mesmo tempo, rótulos em três tamanhos
 * diferentes.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label className="text-overline font-black uppercase tracking-(--tracking-overline) text-ink-muted">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-caption font-semibold text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

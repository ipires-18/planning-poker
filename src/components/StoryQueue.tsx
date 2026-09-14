import { useState } from 'react'
import { Badge, Button, Input, Select, cx } from './ui'
import { KIND_COLOR, KIND_LABEL, type StoryKind } from '@/types'

export interface QueueItem {
  id: string
  title: string
  link: string | null
  kind: StoryKind
  /** Já pontuada: fica onde está, para não reescrever o histórico da sessão. */
  locked?: boolean
  /** É a história em votação agora. */
  current?: boolean
}

export interface StoryEdit {
  title: string
  link: string
  kind: StoryKind
}

interface Props {
  items: QueueItem[]
  onEdit: (id: string, edit: StoryEdit) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  /** Troca o item de lugar com o vizinho; `delta` é -1 (sobe) ou 1 (desce). */
  onMove: (id: string, delta: -1 | 1) => void | Promise<void>
  emptyLabel?: string
}

export function StoryQueue({ items, onEdit, onDelete, onMove, emptyLabel }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-hairline py-10 text-center text-sm text-ink-subtle">
        {emptyLabel ?? 'Nada aqui ainda.'}
      </p>
    )
  }

  /** Só faz sentido mover dentro do trecho que ainda não foi pontuado. */
  const firstMovable = items.findIndex((i) => !i.locked)
  const lastMovable = items.length - 1

  return (
    <ul className="space-y-2">
      {items.map((story, index) => {
        const isEditing = editing === story.id
        const canMoveUp = !story.locked && index > firstMovable
        const canMoveDown = !story.locked && index < lastMovable

        if (isEditing) {
          return (
            <li key={story.id} className="card-surface p-4">
              <StoryEditor
                initial={{ title: story.title, link: story.link ?? '', kind: story.kind }}
                onCancel={() => setEditing(null)}
                onSave={async (edit) => {
                  await onEdit(story.id, edit)
                  setEditing(null)
                }}
              />
            </li>
          )
        }

        return (
          <li
            key={story.id}
            className={cx(
              'card-surface flex items-center gap-3 p-3 transition-all',
              story.current && 'ring-2 ring-brand-400/60',
              story.locked && 'opacity-60',
            )}
          >
            {/* Setas de ordenação. Botões, e não arrastar: funcionam no
                celular e com teclado, sem depender de biblioteca. */}
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => void onMove(story.id, -1)}
                aria-label={`Subir ${story.title}`}
                className={cx(
                  'rounded-md px-1.5 text-xs leading-none transition-colors',
                  canMoveUp
                    ? 'cursor-pointer text-ink-subtle hover:bg-[var(--surface-sunken)] hover:text-brand-400'
                    : 'cursor-not-allowed text-transparent',
                )}
              >
                ▲
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => void onMove(story.id, 1)}
                aria-label={`Descer ${story.title}`}
                className={cx(
                  'rounded-md px-1.5 text-xs leading-none transition-colors',
                  canMoveDown
                    ? 'cursor-pointer text-ink-subtle hover:bg-[var(--surface-sunken)] hover:text-brand-400'
                    : 'cursor-not-allowed text-transparent',
                )}
              >
                ▼
              </button>
            </div>

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] font-mono text-[11px] font-black text-ink-muted">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{story.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge color={KIND_COLOR[story.kind]}>{KIND_LABEL[story.kind]}</Badge>
                {story.current && <Badge color="var(--color-brand-400)">Em votação</Badge>}
                {story.locked && <Badge color="var(--color-ink-subtle)">Pontuada</Badge>}
                {story.link && (
                  <a
                    href={story.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-ink-subtle underline-offset-2 hover:text-brand-400 hover:underline"
                  >
                    {story.link.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            {confirming === story.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    await onDelete(story.id)
                    setConfirming(null)
                  }}
                >
                  Excluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Não
                </Button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(story.id)}
                  aria-label={`Editar ${story.title}`}
                  title="Editar"
                  className="cursor-pointer rounded-lg px-2 py-1.5 text-sm text-ink-subtle transition-colors hover:bg-[var(--surface-sunken)] hover:text-brand-400"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(story.id)}
                  aria-label={`Excluir ${story.title}`}
                  title="Excluir"
                  className="cursor-pointer rounded-lg px-2 py-1.5 text-sm text-ink-subtle transition-colors hover:bg-coral/10 hover:text-coral"
                >
                  ✕
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */

export function StoryEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Salvar',
}: {
  initial: StoryEdit
  onSave: (edit: StoryEdit) => void | Promise<void>
  onCancel: () => void
  saveLabel?: string
}) {
  const [title, setTitle] = useState(initial.title)
  const [link, setLink] = useState(initial.link)
  const [kind, setKind] = useState<StoryKind>(initial.kind)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), link: link.trim(), kind })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          // Enter num input dentro de <form> submeteria o formulário de fora.
          if (e.key === 'Enter') {
            e.preventDefault()
            void save()
          }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Título da história"
        maxLength={200}
        autoFocus
        aria-label="Título"
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link do ticket (opcional)"
          inputMode="url"
          aria-label="Link"
        />
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as StoryKind)}
          aria-label="Tipo"
        >
          <option value="both">{KIND_LABEL.both}</option>
          <option value="frontend">{KIND_LABEL.frontend}</option>
          <option value="backend">{KIND_LABEL.backend}</option>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={save} disabled={!title.trim() || busy}>
          {busy ? 'Salvando...' : saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

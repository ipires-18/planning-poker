import { useRef, useState } from 'react'
import { Badge, Button, Input, Select } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { prettyUrl, safeUrl } from '@/lib/links'
import { KIND_TONE, KIND_LABEL, type StoryKind } from '@/types'

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
  /**
   * Troca o item de lugar com o vizinho; `delta` é -1 (sobe) ou 1 (desce).
   * É o caminho do teclado: ↑↓ com a alça focada.
   */
  onMove: (id: string, delta: -1 | 1) => void | Promise<void>
  /** A fila móvel inteira, na ordem nova. Só chega aqui pelo arrastar. */
  onReorder?: (ids: string[]) => void | Promise<void>
  emptyLabel?: string
}

/**
 * A fila da sprint.
 *
 * Arrastar é nativo do HTML, sem biblioteca: a alça carrega o id, a linha
 * embaixo do cursor vira o alvo, e soltar manda a ordem nova inteira. Custa
 * zero de bundle e se comporta como o resto do sistema operacional.
 *
 * A alça é o único controle de ordem, mas é um botão: quem navega por teclado
 * chega nela com Tab e move a história com ↑↓. O arrastar do HTML não responde
 * a teclado, então sem isso a reordenação seria só de quem usa mouse.
 */
export function StoryQueue({ items, onEdit, onDelete, onMove, onReorder, emptyLabel }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; below: boolean } | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())

  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-dashed border-hairline py-10 text-center text-sm text-ink-subtle">
        {emptyLabel ?? 'Nada aqui ainda.'}
      </p>
    )
  }

  /** Só faz sentido mover dentro do trecho que ainda não foi pontuado. */
  const firstMovable = items.findIndex((i) => !i.locked)
  const lastMovable = items.length - 1
  const canDrag = Boolean(onReorder) && items.filter((i) => !i.locked).length > 1

  /** Solta o item arrastado antes ou depois do alvo, e devolve a fila móvel. */
  const drop = async (targetId: string, below: boolean) => {
    const movable = items.filter((i) => !i.locked).map((i) => i.id)
    const from = movable.indexOf(dragging ?? '')
    if (from < 0) return

    const semEle = movable.filter((id) => id !== dragging)
    const alvo = semEle.indexOf(targetId)
    if (alvo < 0) return

    const para = below ? alvo + 1 : alvo
    semEle.splice(para, 0, dragging as string)
    if (semEle.join() !== movable.join()) await onReorder?.(semEle)
  }

  const limpar = () => {
    setDragging(null)
    setOver(null)
  }

  return (
    <ul className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-raised">
      {items.map((story, index) => {
        const isEditing = editing === story.id
        const canMoveUp = !story.locked && index > firstMovable
        const canMoveDown = !story.locked && index < lastMovable
        const draggable = canDrag && !story.locked
        const alvo = over?.id === story.id && dragging !== story.id

        if (isEditing) {
          return (
            <li key={story.id} className="border-b border-hairline p-4 last:border-b-0">
              <StoryEditor
                initial={{ title: story.title, link: story.link ?? '', kind: story.kind }}
                describedAs={`de "${story.title}"`}
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
            ref={(el) => {
              if (el) rows.current.set(story.id, el)
              else rows.current.delete(story.id)
            }}
            onDragOver={(e) => {
              if (!dragging || story.locked) return
              e.preventDefault()
              const caixa = e.currentTarget.getBoundingClientRect()
              setOver({ id: story.id, below: e.clientY > caixa.top + caixa.height / 2 })
            }}
            onDragLeave={() => setOver((atual) => (atual?.id === story.id ? null : atual))}
            onDrop={async (e) => {
              e.preventDefault()
              const below = over?.id === story.id ? over.below : false
              limpar()
              await drop(story.id, below)
            }}
            className={cx(
              'grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5',
              'border-b border-hairline transition-colors last:border-b-0',
              story.current && 'bg-brand-500/8',
              story.locked && 'opacity-60',
              dragging === story.id && 'opacity-40',
              // A linha de inserção: some junto com o arrastar, porque não é
              // estado do item, é só onde ele vai cair.
              alvo &&
                (over?.below
                  ? 'shadow-[inset_0_-2px_0_0_var(--color-brand-400)]'
                  : 'shadow-[inset_0_2px_0_0_var(--color-brand-400)]'),
            )}
          >
            {/* A alça. É um botão de verdade, e não um enfeite arrastável: quem
                navega por teclado chega nela com Tab e move com ↑↓. Sem isso,
                tirar as setas teria tirado a reordenação de quem não usa mouse. */}
            <button
              type="button"
              draggable={draggable}
              disabled={!draggable}
              onDragStart={(e) => {
                if (!draggable) return
                setDragging(story.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', story.id)
                const linha = rows.current.get(story.id)
                if (linha) e.dataTransfer.setDragImage(linha, 24, linha.clientHeight / 2)
              }}
              onDragEnd={limpar}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && canMoveUp) {
                  e.preventDefault()
                  void onMove(story.id, -1)
                }
                if (e.key === 'ArrowDown' && canMoveDown) {
                  e.preventDefault()
                  void onMove(story.id, 1)
                }
              }}
              aria-label={
                draggable
                  ? `Reordenar ${story.title}. Arraste, ou use as setas para cima e para baixo.`
                  : undefined
              }
              className={cx(
                'shrink-0 select-none rounded-md px-1.5 py-1 text-sm leading-none transition-colors',
                draggable
                  ? 'cursor-grab text-ink-subtle hover:bg-sunken hover:text-brand-400 active:cursor-grabbing'
                  : 'cursor-default text-transparent',
              )}
            >
              ⠿
            </button>

            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sunken font-mono text-[11px] font-black text-ink-muted">
              {index + 1}
            </span>

            {/* Título em cima, selos embaixo — e cada faixa numa linha só. O que
                quebrava antes eram os selos entre si, o que fazia a altura da fila
                variar de item para item. */}
            <div className="min-w-0">
              <p className="truncate font-bold text-ink" title={story.title}>
                {story.title}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden">
                <Badge role={KIND_TONE[story.kind]}>{KIND_LABEL[story.kind]}</Badge>
                {story.current && <Badge tone="brand">Em votação</Badge>}
                {story.locked && <Badge tone="neutral">Pontuada</Badge>}
              </div>
            </div>

            {confirming === story.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="soft"
                  tone="critical"
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
                {/* O endereço do ticket não precisa aparecer por extenso: ele
                    roubava a linha dos selos e ninguém lê uma URL de Jira. Vira
                    ação, ao lado de editar e excluir. */}
                {safeUrl(story.link) && (
                  <a
                    href={safeUrl(story.link) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ticket de ${story.title}`}
                    title={`Abrir ticket — ${prettyUrl(story.link)}`}
                    className="rounded-lg px-2 py-1.5 text-sm leading-none text-ink-subtle transition-colors hover:bg-sunken hover:text-brand-400"
                  >
                    ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(story.id)}
                  aria-label={`Editar ${story.title}`}
                  title="Editar"
                  className="rounded-lg px-2 py-1.5 text-sm text-ink-subtle transition-colors hover:bg-sunken hover:text-brand-400"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(story.id)}
                  aria-label={`Excluir ${story.title}`}
                  title="Excluir"
                  className="rounded-lg px-2 py-1.5 text-sm text-ink-subtle transition-colors hover:bg-coral/10 hover:text-coral"
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
  hideCancel = false,
  describedAs = 'da história',
}: {
  initial: StoryEdit
  onSave: (edit: StoryEdit) => void | Promise<void>
  onCancel: () => void
  saveLabel?: string
  /** Na tela de criação não há o que cancelar: o formulário é permanente. */
  hideCancel?: boolean
  /**
   * Completa os rótulos dos campos. Com o formulário de adicionar e o de editar
   * abertos na mesma página, "Título" sozinho apontaria para dois inputs — e
   * nem o leitor de tela nem quem automatiza saberia qual é qual.
   */
  describedAs?: string
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
        aria-label={`Título ${describedAs}`}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link do ticket (opcional)"
          inputMode="url"
          aria-label={`Link ${describedAs}`}
        />
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as StoryKind)}
          aria-label={`Tipo ${describedAs}`}
        >
          <option value="both">{KIND_LABEL.both}</option>
          <option value="frontend">{KIND_LABEL.frontend}</option>
          <option value="backend">{KIND_LABEL.backend}</option>
        </Select>
      </div>
      <div className="flex gap-2">
        {/* Sozinho e largura cheia, ele é a ação do bloco e acompanha a altura
            dos campos acima; ao lado do "Cancelar", os dois ficam compactos. */}
        <Button
          size={hideCancel ? 'md' : 'sm'}
          variant="solid"
          onClick={save}
          isDisabled={!title.trim() || busy}
          className={hideCancel ? 'w-full' : undefined}
        >
          {busy ? 'Salvando...' : saveLabel}
        </Button>
        {!hideCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}

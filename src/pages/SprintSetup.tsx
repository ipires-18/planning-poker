import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ErrorNote, Field, Input, Select } from '@/components/ui'
import { DeckPicker } from '@/components/DeckPicker'
import { StoryQueue, type QueueItem, type StoryEdit } from '@/components/StoryQueue'
import { createRoom } from '@/lib/api'
import { DEFAULT_DECK, deckScale, type Card, type DeckId } from '@/lib/decks'
import { KIND_LABEL, type StoryKind } from '@/types'

interface Draft extends QueueItem {
  link: string | null
}

export default function SprintSetup() {
  const navigate = useNavigate()
  const [sprintName, setSprintName] = useState('')
  const [hostName, setHostName] = useState('')
  const [stories, setStories] = useState<Draft[]>([])

  const [deckId, setDeckId] = useState<DeckId>(DEFAULT_DECK)
  const [scale, setScale] = useState<Card[]>(() => deckScale(DEFAULT_DECK))

  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [kind, setKind] = useState<StoryKind>('both')

  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const addStory = () => {
    if (!title.trim()) {
      setError('Dê um título para a história')
      return
    }
    setStories((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        link: link.trim() || null,
        kind,
      },
    ])
    setTitle('')
    setLink('')
    setError('')
  }

  const editStory = (id: string, edit: StoryEdit) => {
    setStories((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title: edit.title, link: edit.link || null, kind: edit.kind } : s,
      ),
    )
  }

  const deleteStory = (id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id))
  }

  const moveStory = (id: string, delta: -1 | 1) => {
    setStories((prev) => {
      const from = prev.findIndex((s) => s.id === id)
      const to = from + delta
      if (from === -1 || to < 0 || to >= prev.length) return prev
      const next = [...prev]
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sprintName.trim()) return setError('Dê um nome para a sprint')
    if (!hostName.trim()) return setError('Diga seu nome')
    if (stories.length === 0) return setError('Adicione pelo menos uma história')

    setCreating(true)
    setError('')
    try {
      const roomId = await createRoom(
        sprintName.trim(),
        hostName.trim(),
        stories.map((s) => ({ title: s.title, link: s.link ?? undefined, kind: s.kind })),
        deckId,
        scale,
      )
      navigate(`/sala/${roomId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para criar a sala')
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10">
        <button
          onClick={() => navigate('/')}
          className="mb-6 cursor-pointer text-sm font-bold text-ink-muted transition-colors hover:text-ink"
        >
          ← Voltar
        </button>
        <h1 className="text-4xl font-black tracking-tight">
          Montar a <span className="text-gradient">sprint</span>
        </h1>
        <p className="mt-2 text-ink-muted">
          Liste o que vai ser pontuado. Dá para editar, reordenar e acrescentar histórias
          também durante a sessão.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <div className="card-surface grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Nome da sprint">
            <Input
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint 42"
              maxLength={80}
              autoFocus
            />
          </Field>
          <Field label="Seu nome" hint="Você entra como Product Owner">
            <Input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Como o time te chama"
              maxLength={40}
            />
          </Field>
        </div>

        {/* Baralho */}
        <div className="card-surface space-y-4 p-6">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              Estilo de pontuação
            </h2>
            <p className="mt-1 text-xs text-ink-subtle">
              Define as cartas que o time vai ter na mão. Não dá para trocar depois que a
              sessão começa.
            </p>
          </div>
          <DeckPicker
            deckId={deckId}
            scale={scale}
            onChange={(id, next) => {
              setDeckId(id)
              setScale(next)
            }}
          />
        </div>

        {/* Adicionar história */}
        <div className="card-surface space-y-4 p-6">
          <h2 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
            Adicionar história
          </h2>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addStory()
              }
            }}
            placeholder="Ex: Tela de login com SSO"
            maxLength={200}
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link do ticket (opcional)"
              inputMode="url"
            />
            <Select value={kind} onChange={(e) => setKind(e.target.value as StoryKind)}>
              <option value="both">{KIND_LABEL.both}</option>
              <option value="frontend">{KIND_LABEL.frontend}</option>
              <option value="backend">{KIND_LABEL.backend}</option>
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={addStory} className="w-full">
            + Adicionar à fila
          </Button>
        </div>

        {/* Fila */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              Na fila
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-400">
                {stories.length}
              </span>
            </h2>
            {stories.length > 1 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                Use ▲▼ para reordenar
              </span>
            )}
          </div>

          <StoryQueue
            items={stories}
            onEdit={editStory}
            onDelete={deleteStory}
            onMove={moveStory}
            emptyLabel="Nada aqui ainda. Adicione a primeira história acima."
          />
        </div>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" variant="joy" size="lg" disabled={creating} className="w-full">
          {creating ? 'Preparando a mesa...' : 'Criar sessão e começar'}
        </Button>
      </form>
    </main>
  )
}

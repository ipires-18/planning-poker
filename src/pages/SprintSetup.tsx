import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, ErrorNote, Field, Input, Select, cx } from '@/components/ui'
import { createRoom, type DraftStory } from '@/lib/api'
import { KIND_LABEL, type StoryKind } from '@/types'

const KIND_COLOR: Record<StoryKind, string> = {
  frontend: 'var(--color-sky)',
  backend: 'var(--color-mint)',
  both: 'var(--color-grape)',
}

interface Draft extends DraftStory {
  key: string
}

export default function SprintSetup() {
  const navigate = useNavigate()
  const [sprintName, setSprintName] = useState('')
  const [hostName, setHostName] = useState('')
  const [stories, setStories] = useState<Draft[]>([])

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
      { key: crypto.randomUUID(), title: title.trim(), link: link.trim() || undefined, kind },
    ])
    setTitle('')
    setLink('')
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sprintName.trim()) return setError('Dê um nome para a sprint')
    if (!hostName.trim()) return setError('Diga seu nome')
    if (stories.length === 0) return setError('Adicione pelo menos uma história')

    setCreating(true)
    setError('')
    try {
      const roomId = await createRoom(sprintName.trim(), hostName.trim(), stories)
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
          Liste o que vai ser pontuado. Dá para acrescentar mais histórias durante a sessão.
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
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
            Na fila
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-400">
              {stories.length}
            </span>
          </h2>

          {stories.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-hairline py-10 text-center text-sm text-ink-subtle">
              Nada aqui ainda. Adicione a primeira história acima.
            </p>
          ) : (
            <ul className="space-y-2">
              {stories.map((story, index) => (
                <li
                  key={story.key}
                  className={cx(
                    'card-surface animate-pop-in flex items-center gap-4 p-4',
                    'transition-transform hover:-translate-y-0.5',
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)] font-mono text-xs font-black text-ink-muted">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{story.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge color={KIND_COLOR[story.kind]}>{KIND_LABEL[story.kind]}</Badge>
                      {story.link && (
                        <span className="truncate text-xs text-ink-subtle">{story.link}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStories((prev) => prev.filter((s) => s.key !== story.key))}
                    aria-label={`Remover ${story.title}`}
                    className="shrink-0 cursor-pointer rounded-xl px-3 py-2 text-ink-subtle transition-colors hover:bg-coral/10 hover:text-coral"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" variant="joy" size="lg" disabled={creating} className="w-full">
          {creating ? 'Preparando a mesa...' : 'Criar sessão e começar'}
        </Button>
      </form>
    </main>
  )
}

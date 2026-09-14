import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ErrorNote, Field, Input } from '@/components/ui'
import { cx } from '@/lib/cx'
import { DeckPicker } from '@/components/DeckPicker'
import { SprintWindowPicker } from '@/components/SprintWindowPicker'
import { StoryEditor, StoryQueue } from '@/components/StoryQueue'
import { useSprintDraft } from '@/hooks/useSprintDraft'
import { useRoomQuota } from '@/hooks/useRoomQuota'
import { createRoom } from '@/lib/api'

const BLANK_STORY = { title: '', link: '', kind: 'both' } as const

export default function SprintSetup() {
  const navigate = useNavigate()
  const draft = useSprintDraft()
  const quota = useRoomQuota()

  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    const problem = draft.missing()
    if (problem) return setError(problem)

    setCreating(true)
    setError('')
    try {
      const roomId = await createRoom(
        draft.name.trim(),
        draft.hostName.trim(),
        draft.stories.map((s) => ({
          title: s.title,
          link: s.link ?? undefined,
          kind: s.kind,
        })),
        draft.deckId,
        draft.scale,
        draft.sprint,
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
          type="button"
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
              value={draft.name}
              onChange={(e) => draft.setName(e.target.value)}
              placeholder="Sprint 42"
              maxLength={80}
              autoFocus
            />
          </Field>
          <Field label="Seu nome" hint="Você entra como Product Owner">
            <Input
              value={draft.hostName}
              onChange={(e) => draft.setHostName(e.target.value)}
              placeholder="Como o time te chama"
              maxLength={40}
            />
          </Field>
        </div>

        <Section
          title="Estilo de pontuação"
          hint="Define as cartas que o time vai ter na mão. Não dá para trocar depois que a sessão começa."
        >
          <DeckPicker deckId={draft.deckId} scale={draft.scale} onChange={draft.chooseDeck} />
        </Section>

        <Section
          title="Janela da sprint"
          hint="Os dias úteis daqui viram a base da capacidade do time. Dá para ajustar depois, durante a sessão."
        >
          <SprintWindowPicker
            start={draft.sprint.start}
            days={draft.sprint.days}
            holidays={draft.sprint.holidays}
            onChange={draft.setSprint}
          />
        </Section>

        <Section title="Adicionar história">
          <StoryEditor
            // Remonta a cada história adicionada, para limpar os campos.
            key={draft.stories.length}
            initial={BLANK_STORY}
            describedAs="da nova história"
            saveLabel="+ Adicionar à fila"
            onSave={draft.addStory}
            onCancel={() => undefined}
            hideCancel
          />
        </Section>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              Na fila
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-400">
                {draft.stories.length}
              </span>
            </h2>
            {draft.stories.length > 1 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                Use ▲▼ para reordenar
              </span>
            )}
          </div>

          <StoryQueue
            items={draft.stories}
            onEdit={draft.editStory}
            onDelete={draft.removeStory}
            onMove={draft.moveStory}
            emptyLabel="Nada aqui ainda. Adicione a primeira história acima."
          />
        </div>

        {quota.shouldWarn && !error && (
          <p
            className={cx(
              'rounded-2xl px-4 py-3 text-sm font-semibold',
              quota.isFull ? 'bg-coral/10 text-coral' : 'bg-zest/10 text-zest',
            )}
          >
            {quota.isFull
              ? `Você já tem ${quota.max} sessões abertas, que é o limite. Encerre uma delas para criar outra.`
              : 'Esta é a sua última sessão disponível. Encerrar as antigas libera vaga.'}
          </p>
        )}

        <ErrorNote>{error}</ErrorNote>

        <Button
          type="submit"
          variant="joy"
          size="lg"
          disabled={creating || quota.isFull}
          className="w-full"
        >
          {creating ? 'Preparando a mesa...' : 'Criar sessão e começar'}
        </Button>
      </form>
    </main>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="card-surface space-y-4 p-6">
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

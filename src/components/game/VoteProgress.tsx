interface Props {
  voted: number
  total: number
  everyoneVoted: boolean
}

/** "3 de 5 votaram", com o pulso que mostra que a mesa está viva. */
export function VoteProgress({ voted, total, everyoneVoted }: Props) {
  const verb = voted === 1 ? 'votou' : 'votaram'

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-raised)] px-5 py-3 shadow-sm">
      <span className="relative flex h-3 w-3" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
      </span>
      <p className="text-sm font-bold text-ink-muted">
        {voted} de {total} {verb}
        {everyoneVoted && ' · pode revelar!'}
      </p>
    </div>
  )
}

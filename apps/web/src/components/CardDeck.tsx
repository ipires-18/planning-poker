import { cx } from '@/lib/cx'
import { PENDING, type Card } from '@/lib/decks'

interface Props {
  scale: Card[]
  selected: string | null
  onSelect: (label: string) => void
  disabled: boolean
}

/**
 * A rampa de cor do baralho, em papéis do tema.
 *
 * O valor "pesa" mais conforme sobe: começa no verde do Back-End e termina no
 * rosa do QA, passando pela marca. São os mesmos cinco acentos do resto do
 * produto, e não uma paleta paralela que ninguém mais usa.
 */
const RAMP = ['backend', 'frontend', 'tech_lead', 'qa'] as const

type CardTone = (typeof RAMP)[number] | 'critical' | 'attention' | 'neutral'

/** Que papel (ou estado) pinta esta carta. */
function toneFor(card: Card, index: number, scoringCount: number): CardTone {
  if (card.label === PENDING.label) return 'critical'
  if (card.value === null) return card.label === '☕' ? 'attention' : 'neutral'
  const step = scoringCount > 1 ? index / (scoringCount - 1) : 0
  return RAMP[Math.min(RAMP.length - 1, Math.floor(step * RAMP.length))]
}

const ROLE_TONES = new Set<string>(RAMP)

export function CardDeck({ scale, selected, onSelect, disabled }: Props) {
  const scoringCount = scale.filter((c) => c.value !== null).length

  return (
    <div className="sticky bottom-0 z-20 border-t border-hairline bg-[var(--surface-raised)]/85 px-4 py-6 backdrop-blur-xl">
      <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.2em] text-ink-subtle">
        {disabled ? 'Cartas na mesa' : 'Escolha sua carta'}
      </p>

      {/* No celular o baralho rola na horizontal: quebrado em várias linhas ele
          comia metade da tela e escondia a mesa. */}
      <div
        role="radiogroup"
        aria-label="Escala de pontos"
        className={cx(
          'mx-auto flex max-w-4xl items-end gap-2 sm:gap-3',
          'flex-nowrap overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0',
        )}
      >
        {scale.map((card, index) => {
          const active = selected === card.label
          const tone = toneFor(card, index, scoringCount)
          const isRole = ROLE_TONES.has(tone)
          const wide = card.label.length > 2

          return (
            <button
              key={card.label}
              role="radio"
              aria-checked={active}
              aria-label={card.label}
              disabled={disabled}
              onClick={() => onSelect(card.label)}
              data-role={isRole ? tone : undefined}
              data-tone={isRole ? undefined : tone}
              className={cx(
                'flex shrink-0 items-center justify-center rounded-2xl border-2 font-black',
                'border-hairline bg-raised text-(--ds-accent)',
                'transition-all duration-300 [transition-timing-function:var(--ease-spring)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                wide ? 'h-16 px-3 text-[10px] uppercase leading-tight' : 'h-16 text-xl',
                disabled
                  ? 'cursor-not-allowed opacity-35'
                  : 'hover:-translate-y-2 hover:shadow-xl',
                !wide && 'w-13',
                active && [
                  '-translate-y-3 scale-110 border-transparent text-white',
                  'bg-[linear-gradient(145deg,var(--ds-accent),color-mix(in_oklab,var(--ds-accent)_45%,var(--color-brand-700)))]',
                  'shadow-[0_18px_36px_-14px_var(--ds-accent)]',
                ],
              )}
            >
              {card.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

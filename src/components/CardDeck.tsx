import { cx } from './ui'
import { POINT_SCALE, type CardValue } from '@/types'

interface Props {
  selected: string | null
  onSelect: (value: string) => void
  disabled: boolean
}

/** Cores em degradê ao longo da escala — o valor "pesa" mais conforme sobe. */
function hueFor(value: CardValue, index: number): string {
  if (value === 'Ag. Definição') return 'var(--color-coral)'
  if (value === '☕') return 'var(--color-zest)'
  if (value === '?') return 'var(--color-ink-subtle)'
  const ramp = [
    'var(--color-mint)',
    'var(--color-sky)',
    'var(--color-brand-400)',
    'var(--color-grape)',
    'var(--color-punch)',
  ]
  return ramp[Math.min(ramp.length - 1, Math.floor((index / 11) * ramp.length))]
}

export function CardDeck({ selected, onSelect, disabled }: Props) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-hairline bg-[var(--surface-raised)]/85 px-4 py-6 backdrop-blur-xl">
      <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.2em] text-ink-subtle">
        {disabled ? 'Cartas na mesa' : 'Escolha sua carta'}
      </p>
      {/* No celular o baralho rola na horizontal: quebrado em três linhas ele
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
        {POINT_SCALE.map((value, index) => {
          const raw = String(value)
          const active = selected === raw
          const color = hueFor(value, index)
          const wide = raw.length > 2

          return (
            <button
              key={raw}
              role="radio"
              aria-checked={active}
              aria-label={raw}
              disabled={disabled}
              onClick={() => onSelect(raw)}
              className={cx(
                'flex shrink-0 items-center justify-center rounded-2xl border-2 font-black',
                'transition-all duration-300 [transition-timing-function:var(--ease-spring)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
                wide ? 'h-16 px-3 text-[10px] uppercase leading-tight' : 'h-16 w-13 text-xl',
                disabled
                  ? 'cursor-not-allowed opacity-35'
                  : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl',
                active && '-translate-y-3 scale-110 border-transparent text-white',
              )}
              style={{
                width: wide ? undefined : '3.25rem',
                borderColor: active ? 'transparent' : 'var(--surface-border)',
                background: active
                  ? `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 45%, var(--color-brand-700)))`
                  : 'var(--surface-raised)',
                color: active ? '#fff' : color,
                boxShadow: active ? `0 18px 36px -14px ${color}` : undefined,
              }}
            >
              {raw}
            </button>
          )
        })}
      </div>
    </div>
  )
}

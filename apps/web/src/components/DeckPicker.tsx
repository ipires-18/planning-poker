import { useState } from 'react'
import { Input } from './ui'
import { cx } from '@/lib/cx'
import {
  DECKS,
  DECK_ORDER,
  buildScale,
  deckScale,
  parseCustomDeck,
  type Card,
  type DeckId,
} from '@/lib/decks'

interface Props {
  deckId: DeckId
  scale: Card[]
  onChange: (deckId: DeckId, scale: Card[]) => void
}

export function DeckPicker({ deckId, scale, onChange }: Props) {
  const [custom, setCustom] = useState('0,5 1 2 3 5 8 13')
  const [customError, setCustomError] = useState<string | null>(null)

  const pickPreset = (id: Exclude<DeckId, 'custom'>) => {
    setCustomError(null)
    onChange(id, deckScale(id))
  }

  const pickCustom = (raw: string) => {
    setCustom(raw)
    const { cards, error } = parseCustomDeck(raw)
    setCustomError(error)
    if (!error) onChange('custom', buildScale(cards))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {DECK_ORDER.map((id) => {
          const deck = DECKS[id]
          const active = deckId === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => pickPreset(id)}
              aria-pressed={active}
              className={cx(
                'cursor-pointer rounded-2xl border-2 p-4 text-left transition-all duration-300',
                '[transition-timing-function:var(--ease-spring)]',
                active
                  ? 'border-brand-400 bg-brand-500/10'
                  : 'border-hairline bg-[var(--surface-sunken)] hover:border-brand-400/50',
              )}
            >
              <span
                className={cx(
                  'block text-sm font-black',
                  active ? 'text-brand-400' : 'text-ink',
                )}
              >
                {deck.name}
              </span>
              <span className="mt-1 block text-xs leading-snug text-ink-subtle">
                {deck.description}
              </span>
              <span className="mt-2 flex flex-wrap gap-1">
                {deck.cards.slice(0, 8).map((c) => (
                  <span
                    key={c.label}
                    className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[10px] font-black text-ink-muted"
                  >
                    {c.label}
                  </span>
                ))}
                {deck.cards.length > 8 && (
                  <span className="px-1 py-0.5 text-[10px] font-black text-ink-subtle">…</span>
                )}
              </span>
            </button>
          )
        })}

        {/* Personalizado */}
        <button
          type="button"
          onClick={() => pickCustom(custom)}
          aria-pressed={deckId === 'custom'}
          className={cx(
            'cursor-pointer rounded-2xl border-2 p-4 text-left transition-all duration-300',
            deckId === 'custom'
              ? 'border-brand-400 bg-brand-500/10'
              : 'border-hairline bg-[var(--surface-sunken)] hover:border-brand-400/50',
          )}
        >
          <span
            className={cx(
              'block text-sm font-black',
              deckId === 'custom' ? 'text-brand-400' : 'text-ink',
            )}
          >
            Personalizada
          </span>
          <span className="mt-1 block text-xs leading-snug text-ink-subtle">
            Você escolhe os valores das cartas.
          </span>
        </button>
      </div>

      {deckId === 'custom' && (
        <div className="animate-pop-in space-y-2 rounded-2xl bg-[var(--surface-sunken)] p-4">
          <Input
            value={custom}
            onChange={(e) => pickCustom(e.target.value)}
            placeholder="0,5 1 2 3 5 8 13"
            aria-label="Valores das cartas"
            className="font-mono"
          />
          <p className="text-xs text-ink-subtle">
            Separe as cartas por espaço. A vírgula é o decimal: <code>0,5</code> é meio ponto.
          </p>
          {customError && <p className="text-xs font-bold text-coral">{customError}</p>}
        </div>
      )}

      {/* Prévia do baralho completo */}
      <div>
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-ink-subtle">
          Cartas na mesa
        </span>
        <div className="flex flex-wrap gap-1.5">
          {scale.map((card) => (
            <span
              key={card.label}
              title={card.value === null ? 'Não pontua' : `Vale ${card.value}`}
              className={cx(
                'rounded-lg px-2 py-1 font-mono text-xs font-black',
                card.value === null
                  ? 'bg-[var(--surface-sunken)] text-ink-subtle'
                  : 'bg-brand-500/15 text-brand-400',
              )}
            >
              {card.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

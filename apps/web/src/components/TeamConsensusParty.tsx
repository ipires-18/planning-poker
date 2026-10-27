import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'
import { randomCheer } from '@/lib/cheers'
import { randomPhoto, type PartyKit } from '@/lib/teamParty'

/**
 * Festa de consenso com a cara do time: o número acende num letreiro de
 * lâmpadas, uma foto da galera entra como polaroid, chovem flores de colar
 * havaiano e as caricaturas passam correndo lá embaixo.
 *
 * É a irmã da ConsensusBurst — mesmo gatilho, mesma duração aproximada, mesmo
 * contrato. Quem decide qual das duas aparece é o kit ligado na sala.
 */

const DURATION_MS = 4600

/**
 * Fonte de lâmpadas, 5 colunas por 7 linhas. Só os caracteres que uma carta
 * com consenso pode ter: consenso exige valor numérico, então sobram dígitos e
 * os tamanhos de camiseta. O que não estiver aqui (o "½") cai num bloco de
 * texto comum, sem quebrar a festa.
 */
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
}

/** As cores dos colares das fotos. */
const LEI_COLORS = ['#ff4fa3', '#ffd23f', '#3ddc84', '#ff7a1a', '#b18cff', '#ff5a5a']

interface Props {
  /** O rótulo da carta em que o time cravou. */
  value: string
  /** Quantas pessoas votaram — vira a quantidade de flores. */
  voters: number
  /** As fotos do kit ligado na sala. */
  party: PartyKit
  onDone?: () => void
}

export function TeamConsensusParty({ value, voters, party, onDone }: Props) {
  const [visible, setVisible] = useState(true)
  const [photo] = useState(() => randomPhoto(party.photos))
  const [cheer] = useState(randomCheer)

  // Inicializador preguiçoso pelo mesmo motivo da ConsensusBurst: as flores
  // não podem trocar de lugar no meio da queda se o React re-renderizar.
  const [flowers] = useState(() =>
    Array.from({ length: Math.min(36, 12 + voters * 4) }, (_, i) => ({
      id: i,
      color: LEI_COLORS[i % LEI_COLORS.length],
      left: Math.random() * 100,
      size: 18 + Math.random() * 18,
      delay: 0.6 + Math.random() * 1.4,
      duration: 2.2 + Math.random() * 1.2,
      sway: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 720,
    })),
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, DURATION_MS)
    return () => window.clearTimeout(id)
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className="tfc-stage pointer-events-none fixed inset-0 z-50 overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Consenso: todo o time votou {value}</span>

      {/* Fim de tarde: o céu escurece e o sol laranja da camiseta nasce atrás */}
      <div className="tfc-sky absolute inset-0" aria-hidden />
      <div className="tfc-sun absolute left-1/2 top-1/2 h-[30rem] w-[30rem] rounded-full" aria-hidden />

      {/* Flores de colar caindo */}
      <div className="absolute inset-0" aria-hidden>
        {flowers.map((f) => (
          <span
            key={f.id}
            className="tfc-flower absolute -top-12"
            style={
              {
                left: `${f.left}%`,
                width: f.size,
                height: f.size,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`,
                '--sway': `${f.sway}px`,
                '--turn': `${f.spin}deg`,
              } as React.CSSProperties
            }
          >
            <LeiFlower color={f.color} />
          </span>
        ))}
      </div>

      {/* Letreiro + polaroid */}
      <div
        className="relative flex h-full flex-col items-center justify-center gap-8 px-4 md:flex-row md:gap-14"
        aria-hidden
      >
        <BulbSign value={value} />

        <figure className="tfc-polaroid relative w-52 shrink-0 bg-white p-3 pb-4 shadow-2xl md:w-72">
          <span className="tfc-tape absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3" />
          <img src={photo} alt="" className="aspect-[4/5] w-full object-cover" draggable={false} />
          <figcaption className="mt-3 text-center font-display text-base font-black leading-tight text-[#1b2a8a] md:text-lg">
            {cheer}
          </figcaption>
        </figure>
      </div>

      {/* Caricaturas atravessando a tela */}
      {party.stickers.map((src, i) => (
        <div
          key={src}
          className="tfc-runner absolute left-0"
          style={{ animationDelay: `${1.2 + i * 0.35}s`, bottom: `${1.5 + (i % 2) * 4}rem` }}
          aria-hidden
        >
          <img
            src={src}
            alt=""
            className="tfc-hop h-20 w-20 rounded-full border-4 border-white object-cover shadow-xl md:h-24 md:w-24"
            style={{ animationDelay: `${i * 0.12}s` }}
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * O número em lâmpadas. Cada caractere é uma placa creme com a grade inteira de
 * soquetes; só as do desenho acendem, em ordem de coluna, como letreiro de festa.
 */
function BulbSign({ value }: { value: string }) {
  const chars = [...value.toUpperCase()]

  return (
    // Três placas ("XGG") não cabem no celular com a lâmpada do tamanho padrão.
    <div className={cx('flex gap-2 md:gap-3', chars.length > 2 && 'tfc-sign-long')}>
      {chars.map((ch, c) => {
        const glyph = GLYPHS[ch]

        if (!glyph) {
          return (
            <div key={c} className="tfc-tile flex items-center justify-center px-5">
              <span className="tfc-glow font-display text-7xl font-black md:text-8xl">{ch}</span>
            </div>
          )
        }

        return (
          <div key={c} className="tfc-tile grid grid-cols-5 gap-[var(--gap)] p-[calc(var(--bulb)*0.8)]">
            {glyph.flatMap((row, r) =>
              [...row].map((bit, col) => (
                <span
                  key={`${r}-${col}`}
                  className={bit === '1' ? 'tfc-bulb tfc-bulb-on' : 'tfc-bulb'}
                  style={
                    bit === '1'
                      ? { animationDelay: `${0.25 + (c * 5 + col) * 0.05 + r * 0.012}s` }
                      : undefined
                  }
                />
              )),
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Florzinha de cinco pétalas, como as dos colares havaianos. */
function LeiFlower({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full drop-shadow">
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse
          key={i}
          cx="20"
          cy="10"
          rx="7"
          ry="10"
          fill={color}
          transform={`rotate(${i * 72} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="5" fill="#fff6c2" />
    </svg>
  )
}

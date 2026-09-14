import { cn } from '#lib/utils'

/**
 * A marca: o leque de cartas.
 *
 * É o mesmo desenho do leque da entrada e do favicon — três cartas nas cores
 * dos papéis, abertas em arco. Vive aqui, e não como arquivo solto em cada app,
 * porque marca repetida em dois lugares vira duas marcas na primeira vez que
 * alguém mexe numa.
 *
 * Desenhado em SVG e não em imagem para herdar o tamanho de quem usa e não
 * borrar em tela retina.
 */
const CARTAS = [
  { de: '#06b6d4', para: '#5274c7', ang: -21, dx: -60, dy: 9 },
  { de: '#a855f7', para: '#803cd6', ang: 0, dx: 0, dy: 0 },
  { de: '#ec4899', para: '#a041aa', ang: 21, dx: 60, dy: 9 },
]

export function Logo({ className, title = 'Planning Poker' }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      role="img"
      aria-label={title}
      className={cn('size-9 shrink-0', className)}
    >
      <defs>
        {CARTAS.map((c, i) => (
          <linearGradient key={i} id={`ds-logo-${i}`} x1="0" y1="0" x2="0.75" y2="1">
            <stop offset="0" stopColor={c.de} />
            <stop offset="1" stopColor={c.para} />
          </linearGradient>
        ))}
      </defs>
      {CARTAS.map((c, i) => (
        <g key={i} transform={`translate(${128 + c.dx} ${130 + c.dy}) rotate(${c.ang})`}>
          <rect
            x={-56}
            y={-81}
            width={112}
            height={162}
            rx={24}
            fill={`url(#ds-logo-${i})`}
            stroke="#ffffff"
            strokeWidth={7}
            strokeOpacity={0.92}
          />
        </g>
      ))}
    </svg>
  )
}

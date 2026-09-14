import { Avatar, Input } from '../ui'
import { ROLE_ACCENT, ROLE_SHORT, type Player } from '@/types'

interface Props {
  player: Player
  points: number
  /** Em "Ag. Definição" não se reparte ponto: escolhe-se um responsável. */
  pendingMode: boolean
  onChange: (points: number) => void
}

export function AllocationRow({ player, points, pendingMode, onChange }: Props) {
  const accent = ROLE_ACCENT[player.role]

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface-sunken)] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={player.name} color={accent} size={34} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{player.name}</p>
          <span
            className="text-[10px] font-black uppercase tracking-wider"
            style={{ color: accent }}
          >
            {ROLE_SHORT[player.role]}
          </span>
        </div>
      </div>

      {pendingMode ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-ink-subtle">
            Responsável
          </span>
          <input
            type="checkbox"
            checked={points > 0}
            onChange={(e) => onChange(e.target.checked ? 1 : 0)}
            aria-label={`${player.name} é responsável`}
            className="h-4 w-4 cursor-pointer accent-brand-500"
          />
        </label>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={points}
            aria-label={`Pontos de ${player.name}`}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-20 py-2 text-right font-black"
          />
          <span className="text-[10px] font-black uppercase text-ink-subtle">pts</span>
        </div>
      )}
    </div>
  )
}

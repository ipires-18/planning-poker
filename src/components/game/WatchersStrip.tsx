import { Avatar } from '../ui'
import { ROLE_ACCENT, ROLE_SHORT, type Player } from '@/types'

interface Props {
  watchers: Player[]
  online: Set<string>
  youId: string | null
}

/** Quem está na cerimônia sem carta na mão. */
export function WatchersStrip({ watchers, online, youId }: Props) {
  if (watchers.length === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-ink-subtle">
      <span className="uppercase tracking-[0.16em]">Na cerimônia</span>

      {watchers.map((player) => {
        const accent = ROLE_ACCENT[player.role]
        return (
          <span key={player.id} className="flex items-center gap-1.5">
            <Avatar
              name={player.name}
              color={accent}
              size={22}
              dimmed={!online.has(player.user_id)}
            />
            {player.name}
            {player.user_id === youId && ' (você)'}
            <span
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: accent }}
            >
              {ROLE_SHORT[player.role]}
            </span>
          </span>
        )
      })}
    </div>
  )
}

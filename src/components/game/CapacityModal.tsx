import { Modal } from '../ui'
import { CapacityPanel } from '../CapacityPanel'
import type { SprintWindow } from '@/hooks/useGameActions'
import type { TeamCapacity } from '@/lib/derive'
import type { CapacityEntry, Player, Room } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  room: Room
  players: Player[]
  capacity: TeamCapacity
  onSaveWindow: (sprint: SprintWindow) => Promise<void>
  onSaveCapacity: (entries: CapacityEntry[]) => Promise<void>
  onToggleQaVoting: (enabled: boolean) => Promise<void>
}

export function CapacityModal({
  open,
  onClose,
  room,
  players,
  capacity,
  onSaveWindow,
  onSaveCapacity,
  onToggleQaVoting,
}: Props) {
  const sprint: SprintWindow = {
    start: room.sprint_start,
    days: room.sprint_days,
    holidays: room.holidays ?? [],
  }

  return (
    <Modal open={open} onClose={onClose} title="Time e capacidade" size="lg">
      <CapacityPanel
        capacity={capacity}
        sprint={sprint}
        qaVotes={room.qa_votes}
        qaPresent={players.some((p) => p.role === 'qa')}
        onToggleQaVoting={(enabled) => void onToggleQaVoting(enabled)}
        onSaveWindow={onSaveWindow}
        onSaveCapacity={async (entries) => {
          await onSaveCapacity(entries)
          onClose()
        }}
      />
    </Modal>
  )
}

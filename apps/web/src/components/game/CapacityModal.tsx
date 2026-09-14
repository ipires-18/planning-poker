import { Modal } from '@pp/ds/organisms'
import { CapacityPanel } from '../CapacityPanel'
import type { SprintWindow } from '@/hooks/useGameActions'
import type { TeamCapacity } from '@/lib/derive'
import { OPTIONAL_VOTERS } from '@/types'
import type { CapacityEntry, OptionalVoterRole, Player, Room } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  room: Room
  players: Player[]
  capacity: TeamCapacity
  onSaveWindow: (sprint: SprintWindow) => Promise<void>
  onSaveCapacity: (entries: CapacityEntry[]) => Promise<void>
  onToggleOptionalVoter: (role: OptionalVoterRole, enabled: boolean) => Promise<void>
  onSetDiscussionLimit: (seconds: number) => Promise<void>
}

export function CapacityModal({
  open,
  onClose,
  room,
  players,
  capacity,
  onSaveWindow,
  onSaveCapacity,
  onToggleOptionalVoter,
  onSetDiscussionLimit,
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
        optionalVoters={room.optional_voters}
        votersPresent={OPTIONAL_VOTERS.filter((papel) => players.some((p) => p.role === papel))}
        onToggleOptionalVoter={(role, enabled) => void onToggleOptionalVoter(role, enabled)}
        discussionLimit={room.discussion_limit_seconds}
        onSetDiscussionLimit={(seconds) => void onSetDiscussionLimit(seconds)}
        onSaveWindow={onSaveWindow}
        onSaveCapacity={async (entries) => {
          await onSaveCapacity(entries)
          onClose()
        }}
      />
    </Modal>
  )
}

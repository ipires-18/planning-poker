import { useState } from 'react'
import { Button, Modal } from '../ui'
import { StoryEditor, StoryQueue, type QueueItem, type StoryEdit } from '../StoryQueue'
import { moveById } from '@/lib/arrays'
import type { Room, Story } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  stories: Story[]
  room: Room
  onAdd: (edit: StoryEdit) => Promise<void>
  onEdit: (storyId: string, edit: StoryEdit) => Promise<void>
  onRemove: (storyId: string) => Promise<void>
  /** Recebe a nova ordem da fila pendente, da história atual em diante. */
  onReorder: (storyIds: string[]) => Promise<void>
}

const BLANK: StoryEdit = { title: '', link: '', kind: 'both' }

export function StoriesModal({
  open,
  onClose,
  stories,
  room,
  onAdd,
  onEdit,
  onRemove,
  onReorder,
}: Props) {
  const [adding, setAdding] = useState(false)

  const items: QueueItem[] = stories.map((story, index) => ({
    id: story.id,
    title: story.title,
    link: story.link,
    kind: story.kind,
    locked: index < room.current_story_index,
    current: index === room.current_story_index,
  }))

  /**
   * Só a fila pendente se move: as já pontuadas ficam onde estão, senão o
   * resumo da sessão passaria a contar outra coisa.
   */
  const move = async (storyId: string, delta: -1 | 1) => {
    const pending = stories.slice(room.current_story_index)
    const reordered = moveById(pending, storyId, delta)
    if (reordered === pending) return
    await onReorder(reordered.map((s) => s.id))
  }

  const close = () => {
    setAdding(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title="Histórias da sprint">
      <div className="space-y-5">
        <p className="text-xs text-ink-subtle">
          As já pontuadas ficam travadas no lugar — mexer nelas mudaria o resumo da
          sessão. A fila pendente você reordena com ▲▼.
        </p>

        <div className="max-h-[45vh] overflow-y-auto pr-1">
          <StoryQueue items={items} onEdit={onEdit} onDelete={onRemove} onMove={move} />
        </div>

        {adding ? (
          <div className="card-surface p-4">
            <StoryEditor
              initial={BLANK}
              saveLabel="Adicionar"
              onSave={async (edit) => {
                await onAdd(edit)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : (
          <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
            + Nova história
          </Button>
        )}
      </div>
    </Modal>
  )
}

/**
 * Troca um item de lugar com o vizinho.
 *
 * Mesma operação aparecia na fila da criação e na fila do jogo, escrita duas
 * vezes. Devolve o próprio array quando o movimento não cabe, para que quem
 * chama possa comparar por identidade e não re-renderizar à toa.
 */
export function moveByIndex<T>(items: T[], from: number, delta: -1 | 1): T[] {
  const to = from + delta
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items

  const next = [...items]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/** Mesma coisa, achando o item pelo id. */
export function moveById<T extends { id: string }>(
  items: T[],
  id: string,
  delta: -1 | 1,
): T[] {
  return moveByIndex(
    items,
    items.findIndex((item) => item.id === id),
    delta,
  )
}

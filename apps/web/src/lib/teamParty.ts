import { supabase } from './supabase'

/**
 * A festa do time — a versão da comemoração de consenso com as fotos da galera.
 *
 * As fotos moram no bucket privado `party`, numa pasta por kit:
 *
 *   party/<kit>/photos/*.jpg     — entram como polaroid
 *   party/<kit>/stickers/*.jpg   — as caricaturas que passam correndo
 *
 * Quem conduz a sala liga o kit com o código dele (migração 0019). A partir
 * daí o banco deixa as pessoas daquela sala lerem a pasta; o cliente só lista
 * e pede URLs assinadas. Sem kit ligado, a sala usa a explosão neutra.
 */

export interface PartyKit {
  photos: string[]
  stickers: string[]
}

const BUCKET = 'party'

// Seis horas cobrem uma planning longa com folga; a URL não vale além disso.
const URL_TTL_SECONDS = 6 * 60 * 60

async function signedFolder(kit: string, folder: 'photos' | 'stickers'): Promise<string[]> {
  const storage = supabase.storage.from(BUCKET)
  const { data: files, error } = await storage.list(`${kit}/${folder}`, { limit: 100 })
  if (error || !files?.length) return []

  // O list devolve também o marcador de pasta vazia; só arquivo de verdade tem id.
  const paths = files.filter((f) => f.id).map((f) => `${kit}/${folder}/${f.name}`)
  if (paths.length === 0) return []

  const { data: signed } = await storage.createSignedUrls(paths, URL_TTL_SECONDS)
  return (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []))
}

/**
 * Carrega o kit e já baixa as imagens: a polaroid entra menos de um segundo
 * depois da revelação, e uma moldura vazia estragaria a piada.
 *
 * Kit sem nenhuma foto legível vira `null` — para quem está na sala, é como se
 * a festa estivesse desligada.
 */
export async function loadPartyKit(kit: string): Promise<PartyKit | null> {
  const [photos, stickers] = await Promise.all([
    signedFolder(kit, 'photos'),
    signedFolder(kit, 'stickers'),
  ])
  if (photos.length === 0) return null

  for (const src of [...photos, ...stickers]) {
    const img = new Image()
    img.src = src
  }
  return { photos, stickers }
}

let lastPhoto = ''

/** Uma foto ao acaso, sem repetir a da rodada anterior quando há escolha. */
export function randomPhoto(photos: string[]): string {
  if (photos.length === 1) return photos[0]
  const options = photos.filter((p) => p !== lastPhoto)
  lastPhoto = options[Math.floor(Math.random() * options.length)]
  return lastPhoto
}
